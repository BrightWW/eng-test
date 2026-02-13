import express from 'express';
import multer from 'multer';
import mammoth from 'mammoth';
import db from '../db/database.js';
import { authenticateTeacher } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      cb(null, true);
    } else {
      cb(new Error('Only .docx files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Parse Word document and create exam
router.post('/word', authenticateTeacher, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Exam title is required' });
    }

    // Extract text from Word document
    const result = await mammoth.extractRawText({ buffer: req.file.buffer });
    const text = result.value;

    // Parse the document
    const parsedData = parseWordDocument(text);

    if (parsedData.parts.length === 0) {
      return res.status(400).json({ 
        error: 'Could not parse any questions from the document',
        rawText: text.substring(0, 500) // Return preview for debugging
      });
    }

    // Create exam in database
    const examResult = db.prepare(`
      INSERT INTO exams (title, description, created_by)
      VALUES (?, ?, ?)
    `).run(title, `Imported from: ${req.file.originalname}`, req.teacherId);

    const examId = examResult.lastInsertRowid;

    // Create parts and questions
    parsedData.parts.forEach((part, partIndex) => {
      const partResult = db.prepare(`
        INSERT INTO parts (exam_id, title, description, order_num)
        VALUES (?, ?, ?, ?)
      `).run(examId, part.title, part.description || '', partIndex + 1);

      const partId = partResult.lastInsertRowid;

      part.questions.forEach((question, qIndex) => {
        const optionsJson = question.options ? JSON.stringify(question.options) : null;
        
        db.prepare(`
          INSERT INTO questions (part_id, type, content, options, correct_answer, order_num, points)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          partId,
          question.type,
          question.content,
          optionsJson,
          question.correct_answer || '',
          qIndex + 1,
          question.points || 1
        );
      });
    });

    res.json({
      success: true,
      examId,
      message: `Successfully created exam with ${parsedData.parts.length} parts`,
      summary: parsedData.parts.map(p => ({
        title: p.title,
        questionCount: p.questions.length
      }))
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to process document' });
  }
});

// Parse Word document text into structured data
function parseWordDocument(text) {
  const parts = [];
  // Clean lines but preserve internal whitespace structure initially
  const lines = text.split('\n').map(l => {
    // Replace tabs with single space for easier parsing
    return l.replace(/\t+/g, ' ').trim();
  }).filter(l => l);

  let currentPart = null;
  let currentQuestion = null;
  let questionNumber = 0;
  let expectingOptions = false; // Track if we're expecting options after a question

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect Part headers (e.g., "Part A", "Part A.", "Part A:", "Part A. 易混淆單字")
    const partMatch = line.match(/^Part\s*([A-Z])[:\.\s]*(.*)?$/i);
    if (partMatch) {
      if (currentPart && currentQuestion) {
        currentPart.questions.push(currentQuestion);
      }
      if (currentPart) {
        parts.push(currentPart);
      }
      
      currentPart = {
        title: line,
        description: '',
        questions: []
      };
      currentQuestion = null;
      questionNumber = 0;
      expectingOptions = false;
      continue;
    }

    // Skip if no current part
    if (!currentPart) continue;

    // Detect description lines (after Part header, before questions)
    if (currentPart.questions.length === 0 && !line.match(/^\d+[\.\)]/)) {
      if (line.toLowerCase().includes('choose') || 
          line.toLowerCase().includes('rewrite') ||
          line.toLowerCase().includes('sentence') ||
          line.toLowerCase().includes('insert') ||
          line.toLowerCase().includes('correct') ||
          line.toLowerCase().includes('example')) {
        if (!currentPart.description) {
          currentPart.description = line;
        } else {
          currentPart.description += ' ' + line;
        }
        continue;
      }
    }

    // Detect numbered questions (e.g., "1.", "1)", "1. The company...", "1.  The company...")
    const questionMatch = line.match(/^(\d+)[\.\)]\s+(.+)$/);
    if (questionMatch) {
      // Save previous question
      if (currentQuestion) {
        currentPart.questions.push(currentQuestion);
      }

      questionNumber = parseInt(questionMatch[1]);
      const questionContent = questionMatch[2].trim();

      // Determine question type
      let type = determineQuestionType(currentPart, questionContent);

      currentQuestion = {
        content: questionContent,
        type: type,
        options: type === 'multiple_choice' ? [] : null,
        correct_answer: '',
        points: 1
      };
      expectingOptions = (type === 'multiple_choice');
      continue;
    }

    // Detect options (e.g., "A)", "A.", "(A)", "A) effective")
    const optionMatch = line.match(/^[\(]?([A-D])[\)\.\:]\s*(.+)$/i);
    if (optionMatch) {
      const optionText = optionMatch[2].trim();
      
      // If we see an option but no current question, the previous line might be the question
      if (!currentQuestion && lines[i - 1] && lines[i - 1].trim().length > 0) {
        const prevLine = lines[i - 1].trim();
        
        // Check if previous line looks like a question (contains blank _____ or ends with punctuation)
        if (prevLine.includes('_') || prevLine.match(/[.?]$/)) {
          questionNumber++;
          const type = determineQuestionType(currentPart, prevLine);
          
          currentQuestion = {
            content: prevLine,
            type: type,
            options: type === 'multiple_choice' ? [] : null,
            correct_answer: '',
            points: 1
          };
          expectingOptions = true;
        }
      }
      
      if (currentQuestion && currentQuestion.type === 'multiple_choice') {
        currentQuestion.options.push(optionText);
        expectingOptions = true;
      }
      continue;
    }

    // If we were expecting more options but got something else, finalize the question
    if (expectingOptions && currentQuestion && !line.match(/^[\(]?[A-D][\)\.\:]/i)) {
      if (currentQuestion.options && currentQuestion.options.length >= 2) {
        currentPart.questions.push(currentQuestion);
        currentQuestion = null;
        expectingOptions = false;
      }
    }

    // Detect arrow for rewrite questions (e.g., "→ ___")
    if (line.startsWith('→')) {
      if (currentQuestion) {
        currentPart.questions.push(currentQuestion);
        currentQuestion = null;
      }
      continue;
    }

    // Skip example lines
    if (line.toLowerCase().startsWith('example') || 
        line.toLowerCase().startsWith('answer:') ||
        line.toLowerCase().startsWith('active:') ||
        line.toLowerCase().startsWith('passive:')) {
      continue;
    }

    // Check for combining/rewrite questions FIRST: "sentence text (relative clause) → ____"
    // This is more specific than the generic underscore check below
    if (/\([^)]+\)[\s\S]*_{5,}/.test(line) && !currentQuestion && line.length > 20) {
      // This is likely a combining/rewrite question
      // Extract just the question part (remove everything after and including special chars + underscores)
      const questionText = line.replace(/[→\u2192\-\s]*_{5,}.*$/, '').trim();
      if (questionText.length > 10 && questionText.includes('(')) {
        questionNumber++;
        const type = determineQuestionType(currentPart, questionText);
        
        const newQuestion = {
          content: questionText,
          type: type,
          options: null,
          correct_answer: '',
          points: 1
        };
        
        currentPart.questions.push(newQuestion);
        // Don't set currentQuestion since this is a complete question
      }
      continue;
    }

    // Check if line contains a blank ________ (might be a question without number)
    // This is a fallback for questions that don't match the more specific patterns above
    if (line.includes('_____') && !currentQuestion && line.length > 20) {
      // This looks like a question
      questionNumber++;
      const type = determineQuestionType(currentPart, line);
      
      currentQuestion = {
        content: line,
        type: type,
        options: type === 'multiple_choice' ? [] : null,
        correct_answer: '',
        points: 1
      };
      expectingOptions = (type === 'multiple_choice');
      continue;
    }

    // Skip lines that are just underscores (answer placeholders)
    if (/^_{5,}/.test(line)) {
      continue;
    }
  }

  // Don't forget the last question and part
  if (currentQuestion && currentPart) {
    currentPart.questions.push(currentQuestion);
  }
  if (currentPart) {
    parts.push(currentPart);
  }

  return { parts };
}

// Helper function to determine question type
function determineQuestionType(part, questionContent) {
  if (!part) return 'multiple_choice';
  
  const title = part.title.toLowerCase();
  const desc = part.description.toLowerCase();
  
  if (title.includes('rewrite') || desc.includes('rewrite') ||
      title.includes('passive') || title.includes('active')) {
    return 'rewrite';
  } else if (title.includes('combining') || title.includes('合併') ||
             desc.includes('relative clause') || desc.includes('inserting')) {
    return 'fill_in_blank';
  }
  
  return 'multiple_choice';
}

// Preview parsed document without creating exam
router.post('/word/preview', authenticateTeacher, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const result = await mammoth.extractRawText({ buffer: req.file.buffer });
    const text = result.value;
    const parsedData = parseWordDocument(text);

    res.json({
      rawText: text,
      parsed: parsedData
    });

  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ error: error.message || 'Failed to process document' });
  }
});

export default router;
