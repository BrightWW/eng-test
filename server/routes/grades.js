import express from 'express';
import db from '../db/database.js';
import { authenticateTeacher } from '../middleware/auth.js';

const router = express.Router();

// All grade routes require teacher authentication
router.use(authenticateTeacher);

// Grade an answer
router.post('/', (req, res) => {
  try {
    const { answer_id, is_correct, score, comment } = req.body;

    if (!answer_id || is_correct === undefined) {
      return res.status(400).json({ error: 'answer_id and is_correct required' });
    }

    // Check if grade already exists
    const existing = db.prepare('SELECT * FROM grades WHERE answer_id = ?').get(answer_id);

    if (existing) {
      // Update existing grade
      db.prepare(`
        UPDATE grades
        SET is_correct = ?, score = ?, comment = ?, graded_by = ?, graded_at = CURRENT_TIMESTAMP
        WHERE answer_id = ?
      `).run(is_correct ? 1 : 0, score || 0, comment || '', req.teacherId, answer_id);

      const grade = db.prepare('SELECT * FROM grades WHERE answer_id = ?').get(answer_id);
      return res.json({ grade });
    }

    // Create new grade
    const result = db.prepare(`
      INSERT INTO grades (answer_id, is_correct, score, comment, graded_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(answer_id, is_correct ? 1 : 0, score || 0, comment || '', req.teacherId);

    const grade = db.prepare('SELECT * FROM grades WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ grade });
  } catch (error) {
    console.error('Grade answer error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update grade
router.put('/:answerId', (req, res) => {
  try {
    const { answerId } = req.params;
    const { is_correct, score, comment } = req.body;

    const grade = db.prepare('SELECT * FROM grades WHERE answer_id = ?').get(answerId);

    if (!grade) {
      return res.status(404).json({ error: 'Grade not found' });
    }

    db.prepare(`
      UPDATE grades
      SET is_correct = ?, score = ?, comment = ?, graded_at = CURRENT_TIMESTAMP
      WHERE answer_id = ?
    `).run(
      is_correct !== undefined ? (is_correct ? 1 : 0) : grade.is_correct,
      score !== undefined ? score : grade.score,
      comment !== undefined ? comment : grade.comment,
      answerId
    );

    const updated = db.prepare('SELECT * FROM grades WHERE answer_id = ?').get(answerId);
    res.json({ grade: updated });
  } catch (error) {
    console.error('Update grade error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Finalize grading for a submission (update submission status and calculate total score)
router.post('/submission/:submissionId/finalize', (req, res) => {
  try {
    const { submissionId } = req.params;

    // Calculate total score from all graded answers
    const result = db.prepare(`
      SELECT COALESCE(SUM(g.score), 0) as total_score
      FROM answers a
      JOIN grades g ON g.answer_id = a.id
      WHERE a.submission_id = ?
    `).get(submissionId);

    const totalScore = result.total_score || 0;

    // Update submission status and total score
    db.prepare(`
      UPDATE submissions
      SET status = 'graded', total_score = ?
      WHERE id = ?
    `).run(totalScore, submissionId);

    const submission = db.prepare('SELECT * FROM submissions WHERE id = ?').get(submissionId);
    res.json({ submission });
  } catch (error) {
    console.error('Finalize grading error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete grade
router.delete('/:answerId', (req, res) => {
  try {
    const { answerId } = req.params;

    const grade = db.prepare('SELECT * FROM grades WHERE answer_id = ?').get(answerId);
    if (!grade) {
      return res.status(404).json({ error: 'Grade not found' });
    }

    db.prepare('DELETE FROM grades WHERE answer_id = ?').run(answerId);

    res.json({ message: 'Grade deleted' });
  } catch (error) {
    console.error('Delete grade error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
