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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect Part headers (e.g., "Part A", "Part A.", "Part A:", "Part A. 易混淆單字")
    const partMatch = line.match(/^Part\s*([A-Z])[\.\:\s]*(.*)?$/i);
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
      continue;
    }

    // Detect description lines (after Part header, before questions)
    if (currentPart && currentPart.questions.length === 0 && !line.match(/^\d+[\.\)]/)) {
      if (line.toLowerCase().includes('choose') || 
          line.toLowerCase().includes('rewrite') ||
          line.toLowerCase().includes('sentence') ||
          line.toLowerCase().includes('correct')) {
        currentPart.description = line;
        continue;
      }
    }

    // Detect numbered questions (e.g., "1.", "1)", "1. The company...", "1.  The company...")
    // More flexible regex to handle various whitespace scenarios
    const questionMatch = line.match(/^(\d+)[\.\)]\s+(.+)$/);
    if (questionMatch && currentPart) {
      // Save previous question
      if (currentQuestion) {
        currentPart.questions.push(currentQuestion);
      }

      questionNumber = parseInt(questionMatch[1]);
      const questionContent = questionMatch[2].trim();

      // Determine question type based on content and part title
      let type = 'multiple_choice';
      if (currentPart.title.toLowerCase().includes('rewrite') ||
          currentPart.description.toLowerCase().includes('rewrite')) {
        type = 'rewrite';
      } else if (currentPart.title.toLowerCase().includes('combining') ||
                 currentPart.title.toLowerCase().includes('合併') ||
                 currentPart.description.toLowerCase().includes('relative clause')) {
        type = 'fill_in_blank';
      }

      currentQuestion = {
        content: questionContent,
        type: type,
        options: type === 'multiple_choice' ? [] : null,
        correct_answer: '',
        points: 1
      };
      continue;
    }

    // Detect options (e.g., "A)", "A.", "(A)", "A) effective")
    const optionMatch = line.match(/^[\(]?([A-D])[\)\.\:]\s*(.+)$/i);
    if (optionMatch && currentQuestion && currentQuestion.type === 'multiple_choice') {
      currentQuestion.options.push(optionMatch[2].trim());
      continue;
    }

    // Detect arrow for rewrite questions (e.g., "→ ___")
    if (line.startsWith('→') && currentQuestion) {
      // This is a placeholder for student answer, skip or use as hint
      continue;
    }

    // If we have a current question and the line doesn't match patterns,
    // it might be a continuation of the question content
    if (currentQuestion && !line.match(/^[\(]?[A-D][\)\.\:]/i) && !line.match(/^Part\s/i)) {
      // Check if it's additional question content (like for rewrite questions)
      if (currentQuestion.content && line.length > 0) {
        // Could be part of the question or an example
        if (line.startsWith('Example') || line.startsWith('Answer')) {
          continue; // Skip example lines
        }
      }
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
