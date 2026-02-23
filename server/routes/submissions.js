import express from 'express';
import db from '../db/database.js';
import { authenticateTeacher } from '../middleware/auth.js';

const router = express.Router();

// Create or get submission for student
router.post('/', (req, res) => {
  try {
    const { exam_id, student_id } = req.body;

    if (!exam_id || !student_id) {
      return res.status(400).json({ error: 'exam_id and student_id required' });
    }

    // Check if submission already exists
    let submission = db.prepare(`
      SELECT * FROM submissions WHERE exam_id = ? AND student_id = ?
    `).get(exam_id, student_id);

    if (!submission) {
      const result = db.prepare(`
        INSERT INTO submissions (exam_id, student_id, status)
        VALUES (?, ?, 'in_progress')
      `).run(exam_id, student_id);

      submission = db.prepare('SELECT * FROM submissions WHERE id = ?').get(result.lastInsertRowid);
    }

    res.json({ submission });
  } catch (error) {
    console.error('Create submission error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Save answer
router.post('/:submissionId/answers', (req, res) => {
  try {
    const { submissionId } = req.params;
    const { question_id, student_answer } = req.body;

    if (!question_id || student_answer === undefined) {
      return res.status(400).json({ error: 'question_id and student_answer required' });
    }

    // Check if answer exists
    const existing = db.prepare(`
      SELECT * FROM answers WHERE submission_id = ? AND question_id = ?
    `).get(submissionId, question_id);

    if (existing) {
      // Update existing answer
      db.prepare(`
        UPDATE answers SET student_answer = ? WHERE id = ?
      `).run(student_answer, existing.id);

      const answer = db.prepare('SELECT * FROM answers WHERE id = ?').get(existing.id);
      return res.json({ answer });
    }

    // Create new answer
    const result = db.prepare(`
      INSERT INTO answers (submission_id, question_id, student_answer)
      VALUES (?, ?, ?)
    `).run(submissionId, question_id, student_answer);

    const answer = db.prepare('SELECT * FROM answers WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ answer });
  } catch (error) {
    console.error('Save answer error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit answers (finalize submission)
router.post('/:submissionId/submit', (req, res) => {
  try {
    const { submissionId } = req.params;

    const submission = db.prepare('SELECT * FROM submissions WHERE id = ?').get(submissionId);
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    db.prepare(`
      UPDATE submissions
      SET status = 'submitted', submitted_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(submissionId);

    const updated = db.prepare('SELECT * FROM submissions WHERE id = ?').get(submissionId);
    res.json({ submission: updated });
  } catch (error) {
    console.error('Submit error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get student's submission with answers
router.get('/student/:studentId/exam/:examId', (req, res) => {
  try {
    const { studentId, examId } = req.params;

    const submission = db.prepare(`
      SELECT * FROM submissions WHERE student_id = ? AND exam_id = ?
    `).get(studentId, examId);

    if (!submission) {
      return res.json({ submission: null });
    }

    const answers = db.prepare(`
      SELECT a.*, q.content as question_content, q.type as question_type,
             g.is_correct, g.score, g.comment, g.graded_at
      FROM answers a
      JOIN questions q ON a.question_id = q.id
      LEFT JOIN grades g ON g.answer_id = a.id
      WHERE a.submission_id = ?
      ORDER BY q.part_id, q.order_num
    `).all(submission.id);

    res.json({
      submission,
      answers
    });
  } catch (error) {
    console.error('Get student submission error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all submissions for an exam (teacher only)
router.get('/exam/:examId', authenticateTeacher, (req, res) => {
  try {
    const { examId } = req.params;

    const submissions = db.prepare(`
      SELECT s.*, st.name as student_name
      FROM submissions s
      JOIN students st ON s.student_id = st.id
      WHERE s.exam_id = ? AND s.status != 'in_progress'
      ORDER BY s.submitted_at DESC
    `).all(examId);

    res.json({ submissions });
  } catch (error) {
    console.error('Get exam submissions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get submission detail with all answers (teacher only)
router.get('/:submissionId/detail', authenticateTeacher, (req, res) => {
  try {
    const { submissionId } = req.params;

    const submission = db.prepare(`
      SELECT s.*, st.name as student_name, e.title as exam_title
      FROM submissions s
      JOIN students st ON s.student_id = st.id
      JOIN exams e ON s.exam_id = e.id
      WHERE s.id = ?
    `).get(submissionId);

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Modified: Start from questions table to include unanswered questions
    const answers = db.prepare(`
      SELECT 
        q.id as question_id,
        q.content, 
        q.type, 
        q.correct_answer, 
        q.options, 
        q.points,
        q.order_num as question_order,
        p.title as part_title, 
        p.order_num as part_order,
        a.id,
        a.student_answer,
        g.is_correct, 
        g.score, 
        g.comment, 
        g.graded_at
      FROM questions q
      JOIN parts p ON q.part_id = p.id
      LEFT JOIN answers a ON a.question_id = q.id AND a.submission_id = ?
      LEFT JOIN grades g ON g.answer_id = a.id
      WHERE p.exam_id = ?
      ORDER BY p.order_num, q.order_num
    `).all(submissionId, submission.exam_id);

    const answersWithParsedOptions = answers.map(a => ({
      ...a,
      options: a.options ? JSON.parse(a.options) : null
    }));

    res.json({
      submission,
      answers: answersWithParsedOptions
    });
  } catch (error) {
    console.error('Get submission detail error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all submissions for a student (student history)
router.get('/student/:studentId/history', (req, res) => {
  try {
    const { studentId } = req.params;

    const submissions = db.prepare(`
      SELECT s.*, e.title as exam_title, e.description as exam_description
      FROM submissions s
      JOIN exams e ON s.exam_id = e.id
      WHERE s.student_id = ? AND s.status != 'in_progress'
      ORDER BY s.submitted_at DESC
    `).all(studentId);

    res.json({ submissions });
  } catch (error) {
    console.error('Get student history error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get detailed result for a specific submission (for student view)
router.get('/:submissionId/result', (req, res) => {
  try {
    const { submissionId } = req.params;

    const submission = db.prepare(`
      SELECT s.*, e.title as exam_title, st.name as student_name
      FROM submissions s
      JOIN exams e ON s.exam_id = e.id
      JOIN students st ON s.student_id = st.id
      WHERE s.id = ?
    `).get(submissionId);

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Modified: Start from questions table to include unanswered questions
    const answers = db.prepare(`
      SELECT 
        q.id as question_id,
        q.content, 
        q.type, 
        q.correct_answer, 
        q.options, 
        q.points,
        q.order_num as question_order,
        p.title as part_title, 
        p.order_num as part_order,
        a.id,
        a.student_answer,
        g.is_correct, 
        g.score, 
        g.comment, 
        g.graded_at
      FROM questions q
      JOIN parts p ON q.part_id = p.id
      LEFT JOIN answers a ON a.question_id = q.id AND a.submission_id = ?
      LEFT JOIN grades g ON g.answer_id = a.id
      WHERE p.exam_id = ?
      ORDER BY p.order_num, q.order_num
    `).all(submissionId, submission.exam_id);

    const answersWithParsedOptions = answers.map(a => ({
      ...a,
      options: a.options ? JSON.parse(a.options) : null
    }));

    res.json({
      submission,
      answers: answersWithParsedOptions
    });
  } catch (error) {
    console.error('Get submission result error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
