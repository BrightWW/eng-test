import express from 'express';
import db from '../db/database.js';
import { authenticateTeacher } from '../middleware/auth.js';

const router = express.Router();

// Create part (teacher only)
router.post('/', authenticateTeacher, (req, res) => {
  try {
    const { exam_id, title, description, order_num } = req.body;

    if (!exam_id || !title || order_num === undefined) {
      return res.status(400).json({ error: 'exam_id, title, and order_num are required' });
    }

    const result = db.prepare(`
      INSERT INTO parts (exam_id, title, description, order_num)
      VALUES (?, ?, ?, ?)
    `).run(exam_id, title, description || '', order_num);

    const part = db.prepare('SELECT * FROM parts WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({ part });
  } catch (error) {
    console.error('Create part error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update part (teacher only)
router.put('/:id', authenticateTeacher, (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, order_num } = req.body;

    const part = db.prepare('SELECT * FROM parts WHERE id = ?').get(id);
    if (!part) {
      return res.status(404).json({ error: 'Part not found' });
    }

    db.prepare(`
      UPDATE parts
      SET title = ?, description = ?, order_num = ?
      WHERE id = ?
    `).run(
      title !== undefined ? title : part.title,
      description !== undefined ? description : part.description,
      order_num !== undefined ? order_num : part.order_num,
      id
    );

    const updated = db.prepare('SELECT * FROM parts WHERE id = ?').get(id);
    res.json({ part: updated });
  } catch (error) {
    console.error('Update part error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete part (teacher only)
router.delete('/:id', authenticateTeacher, (req, res) => {
  try {
    const { id } = req.params;

    const part = db.prepare('SELECT * FROM parts WHERE id = ?').get(id);
    if (!part) {
      return res.status(404).json({ error: 'Part not found' });
    }

    db.prepare('DELETE FROM parts WHERE id = ?').run(id);

    res.json({ message: 'Part deleted' });
  } catch (error) {
    console.error('Delete part error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create question (teacher only)
router.post('/:partId/questions', authenticateTeacher, (req, res) => {
  try {
    const { partId } = req.params;
    const { type, content, options, correct_answer, order_num, points } = req.body;

    if (!type || !content || order_num === undefined) {
      return res.status(400).json({ error: 'type, content, and order_num are required' });
    }

    const optionsJson = options ? JSON.stringify(options) : null;

    const result = db.prepare(`
      INSERT INTO questions (part_id, type, content, options, correct_answer, order_num, points)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(partId, type, content, optionsJson, correct_answer || '', order_num, points || 1);

    const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      question: {
        ...question,
        options: question.options ? JSON.parse(question.options) : null
      }
    });
  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update question (teacher only)
router.put('/questions/:id', authenticateTeacher, (req, res) => {
  try {
    const { id } = req.params;
    const { type, content, options, correct_answer, order_num, points } = req.body;

    const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const optionsJson = options ? JSON.stringify(options) : question.options;

    db.prepare(`
      UPDATE questions
      SET type = ?, content = ?, options = ?, correct_answer = ?, order_num = ?, points = ?
      WHERE id = ?
    `).run(
      type !== undefined ? type : question.type,
      content !== undefined ? content : question.content,
      optionsJson,
      correct_answer !== undefined ? correct_answer : question.correct_answer,
      order_num !== undefined ? order_num : question.order_num,
      points !== undefined ? points : question.points,
      id
    );

    const updated = db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
    res.json({
      question: {
        ...updated,
        options: updated.options ? JSON.parse(updated.options) : null
      }
    });
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete question (teacher only)
router.delete('/questions/:id', authenticateTeacher, (req, res) => {
  try {
    const { id } = req.params;

    const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    db.prepare('DELETE FROM questions WHERE id = ?').run(id);

    res.json({ message: 'Question deleted' });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
