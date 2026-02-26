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
  let answerSectionStart = -1; // Track where answer section begins
  let globalQuestionIndex = 0; // Track overall question order for answer matching

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

    // Detect answer section header (various formats) - Check early to stop parsing questions
    // Supports: "Answer Key:", "標準答案:", "答案:", "Answer:", "英文時態測驗：標準答案 (Answer Key)"
    const answerHeaderMatch = line.match(/(Answer\s*Key|標準答案|答案|Answers?)/i);
    if (answerHeaderMatch && (line.includes('Answer') || line.includes('答案'))) {
      // Save current question before stopping
      if (currentQuestion && currentPart) {
        currentPart.questions.push(currentQuestion);
        currentQuestion = null;
      }
      answerSectionStart = i + 1; // Mark where answers begin
      break; // Stop parsing questions, the rest is answer section
    }

    // Detect description lines (after Part header, before questions)
    if (currentPart.questions.length === 0 && !line.match(/^\d+[\.\)]/) && !line.includes('____')) {
      if (line.toLowerCase().includes('choose') || 
          line.toLowerCase().includes('complete') ||
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

    // === NEW: Handle questions WITHOUT number prefix ===
    // Format: "Question text ____(A) opt1(B) opt2(C) opt3(D) opt4" (multiple choice inline)
    const inlineOptionsNoNumMatch = line.match(/^(.+?_{3,}.+?)\(A\)\s*(.+?)\(B\)\s*(.+?)\(C\)\s*(.+?)\(D\)\s*(.+)$/i);
    if (inlineOptionsNoNumMatch && !line.match(/^\d+[\.\)]/)) {
      // Save previous question if any
      if (currentQuestion) {
        currentPart.questions.push(currentQuestion);
      }
      
      const questionContent = inlineOptionsNoNumMatch[1].trim();
      const options = [
        inlineOptionsNoNumMatch[2].trim(),
        inlineOptionsNoNumMatch[3].trim(),
        inlineOptionsNoNumMatch[4].trim(),
        inlineOptionsNoNumMatch[5].trim()
      ];

      globalQuestionIndex++;
      questionNumber++;
      currentPart.questions.push({
        content: questionContent,
        type: 'multiple_choice',
        options: options,
        correct_answer: '',
        points: 1,
        _globalIndex: globalQuestionIndex
      });
      currentQuestion = null;
      expectingOptions = false;
      continue;
    }

    // === NEW: Handle fill-in-blank questions without number prefix ===
    // Format: "Question text ____ (verb)" - contains blank and parentheses with verb
    if (line.includes('____') && !line.match(/^\d+[\.\)]/) && !line.match(/\(A\)/i)) {
      // Save previous question if any
      if (currentQuestion) {
        currentPart.questions.push(currentQuestion);
      }
      
      globalQuestionIndex++;
      questionNumber++;
      const type = determineQuestionType(currentPart, line);
      
      currentPart.questions.push({
        content: line,
        type: type,
        options: null,
        correct_answer: '',
        points: 1,
        _globalIndex: globalQuestionIndex
      });
      currentQuestion = null;
      expectingOptions = false;
      continue;
    }

    // Detect numbered questions (e.g., "1.", "1)", "1. The company...", "1.  The company...")
    const questionMatch = line.match(/^(\d+)[\.\)]\s*(.+)$/);
    if (questionMatch) {
      // Save previous question
      if (currentQuestion) {
        currentPart.questions.push(currentQuestion);
      }

      questionNumber = parseInt(questionMatch[1]);
      let questionContent = questionMatch[2].trim();

      // Check if options are on the same line (e.g., "question text(A) opt1(B) opt2(C) opt3(D) opt4")
      const inlineOptionsMatch = questionContent.match(/^(.+?)\(A\)\s*(.+?)\(B\)\s*(.+?)\(C\)\s*(.+?)\(D\)\s*(.+)$/i);
      
      if (inlineOptionsMatch) {
        // Options are inline with the question
        questionContent = inlineOptionsMatch[1].trim();
        const options = [
          inlineOptionsMatch[2].trim(),
          inlineOptionsMatch[3].trim(),
          inlineOptionsMatch[4].trim(),
          inlineOptionsMatch[5].trim()
        ];

        globalQuestionIndex++;
        currentQuestion = {
          content: questionContent,
          type: 'multiple_choice',
          options: options,
          correct_answer: '',
          points: 1,
          _globalIndex: globalQuestionIndex
        };
        currentPart.questions.push(currentQuestion);
        currentQuestion = null;
        expectingOptions = false;
        continue;
      }

      // Determine question type
      let type = determineQuestionType(currentPart, questionContent);

      globalQuestionIndex++;
      currentQuestion = {
        content: questionContent,
        type: type,
        options: type === 'multiple_choice' ? [] : null,
        correct_answer: '',
        points: 1,
        _globalIndex: globalQuestionIndex
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
          globalQuestionIndex++;
          const type = determineQuestionType(currentPart, prevLine);
          
          currentQuestion = {
            content: prevLine,
            type: type,
            options: type === 'multiple_choice' ? [] : null,
            correct_answer: '',
            points: 1,
            _globalIndex: globalQuestionIndex
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

  // Parse answer section if found
  if (answerSectionStart > 0) {
    const answerResult = parseAnswerSection(lines, answerSectionStart);
    
    // Try to apply answers using global index (for non-Part-separated answers)
    if (answerResult.globalAnswers && answerResult.globalAnswers.length > 0) {
      let answerIndex = 0;
      for (const part of parts) {
        for (const question of part.questions) {
          if (answerIndex < answerResult.globalAnswers.length) {
            question.correct_answer = answerResult.globalAnswers[answerIndex];
            answerIndex++;
          }
        }
      }
    } else if (answerResult.partAnswers) {
      // Apply answers using Part-based matching
      for (const part of parts) {
        const partKeyMatch = part.title.match(/Part\s*([A-Z])/i);
        if (partKeyMatch) {
          const partKey = partKeyMatch[1].toUpperCase();
          const partAnswers = answerResult.partAnswers[partKey];
          
          if (partAnswers) {
            part.questions.forEach((question, index) => {
              const questionNum = index + 1;
              if (partAnswers[questionNum]) {
                question.correct_answer = partAnswers[questionNum];
              }
            });
          }
        }
      }
    }
  }

  // Clean up _globalIndex before returning
  for (const part of parts) {
    for (const question of part.questions) {
      delete question._globalIndex;
    }
  }

  return { parts };
}

// Helper function to parse the answer section at the end of document
// Supports two formats:
// 1. Part-based: "Part A: 1. B  2. A  3. C" or separate lines per Part
// 2. Global list: Each line is one answer in order (e.g., "B (說明)" or "has been studying")
function parseAnswerSection(lines, answerSectionStart) {
  const partAnswers = {}; // { 'A': { 1: 'B', 2: 'A' }, 'B': { 1: 'The book was written.' } }
  const globalAnswers = []; // Array of answers in order
  let currentPartKey = null;
  let hasPartStructure = false;
  
  for (let i = answerSectionStart; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip empty lines
    if (!line) continue;
    
    // Check for Part header in answer section (e.g., "Part A:", "Part A.", "Part B:")
    const partMatch = line.match(/^Part\s*([A-Z])[:\.\s]/i);
    if (partMatch) {
      hasPartStructure = true;
      currentPartKey = partMatch[1].toUpperCase();
      if (!partAnswers[currentPartKey]) {
        partAnswers[currentPartKey] = {};
      }
      
      // Check if answers are on the same line (e.g., "Part A: 1. B  2. A  3. C")
      const restOfLine = line.substring(partMatch[0].length).trim();
      if (restOfLine) {
        parseAnswersFromLine(restOfLine, partAnswers[currentPartKey]);
      }
      continue;
    }
    
    // If we have Part structure, parse into Part-based answers
    if (hasPartStructure && currentPartKey) {
      parseAnswersFromLine(line, partAnswers[currentPartKey]);
    } else {
      // No Part structure - parse as global answer list (one answer per line)
      const answer = extractSingleAnswer(line);
      if (answer) {
        globalAnswers.push(answer);
      }
    }
  }
  
  return { partAnswers, globalAnswers };
}

// Extract a single answer from a line
// Formats: "B", "B (說明)", "has been studying (或 has studied)", "will call"
function extractSingleAnswer(line) {
  if (!line || line.trim() === '') return null;
  
  let answer = line.trim();
  
  // If line starts with a single letter A-D followed by space or parenthesis, it's a multiple choice answer
  const mcMatch = answer.match(/^([A-D])\s*(\(|$)/i);
  if (mcMatch) {
    return mcMatch[1].toUpperCase();
  }
  
  // For fill-in-blank/rewrite answers, take everything before parenthetical note (if any)
  // But keep complete answer if it contains useful info
  const parenMatch = answer.match(/^(.+?)\s*\(.*[\)\uff09]?\s*$/);
  if (parenMatch && parenMatch[1].trim()) {
    const mainAnswer = parenMatch[1].trim();
    // If the part before parenthesis is just a single letter, return it
    if (/^[A-D]$/i.test(mainAnswer)) {
      return mainAnswer.toUpperCase();
    }
    // Otherwise return the main answer
    return mainAnswer;
  }
  
  // Return the whole line as the answer
  return answer;
}

// Parse individual answers from a line
// Supports: "1. B", "1) B", "1: B", "1. The book was written by him."
// Also supports multiple answers on one line: "1. B  2. A  3. C"
function parseAnswersFromLine(line, partAnswers) {
  // Pattern to match "number. answer" or "number) answer" or "number: answer"
  const answerPattern = /(\d+)[\.):\s]+([^\d]+?)(?=\s+\d+[\.):]|$)/g;
  let match;
  
  while ((match = answerPattern.exec(line)) !== null) {
    const questionNum = parseInt(match[1]);
    let answer = match[2].trim();
    
    // Remove trailing punctuation if it's just a letter answer
    if (answer.length <= 2) {
      answer = answer.replace(/[,;.\s]+$/, '').toUpperCase();
    }
    
    if (answer) {
      partAnswers[questionNum] = answer;
    }
  }
}

// Helper function to determine question type
function determineQuestionType(part, questionContent) {
  if (!part) return 'multiple_choice';
  
  const title = part.title.toLowerCase();
  const desc = part.description.toLowerCase();
  
  if (title.includes('rewrite') || desc.includes('rewrite') ||
      title.includes('passive') || title.includes('active')) {
    return 'rewrite';
  } else if (title.includes('fill') || title.includes('填空') ||
             title.includes('combining') || title.includes('合併') ||
             desc.includes('relative clause') || desc.includes('inserting') ||
             desc.includes('complete') || desc.includes('correct form')) {
    return 'fill_in_blank';
  } else if (title.includes('multiple') || title.includes('choice') || 
             title.includes('選擇') || title.includes('單選')) {
    return 'multiple_choice';
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
