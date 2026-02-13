import express from 'express';
import db from '../db/database.js';
import { authenticateTeacher } from '../middleware/auth.js';

const router = express.Router();

// Get active exam (public, for students)
router.get('/active', (req, res) => {
  try {
    const exam = db.prepare(`
      SELECT id, title, description, created_at
      FROM exams
      WHERE is_active = 1
      LIMIT 1
    `).get();

    if (!exam) {
      return res.json({ exam: null });
    }

    res.json({ exam });
  } catch (error) {
    console.error('Get active exam error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get exam with all questions (public, for students)
router.get('/:id/full', (req, res) => {
  try {
    const examId = req.params.id;

    const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(examId);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const parts = db.prepare(`
      SELECT * FROM parts WHERE exam_id = ? ORDER BY order_num
    `).all(examId);

    const fullParts = parts.map(part => {
      const questions = db.prepare(`
        SELECT id, type, content, options, order_num, points
        FROM questions
        WHERE part_id = ?
        ORDER BY order_num
      `).all(part.id);

      return {
        ...part,
        questions: questions.map(q => ({
          ...q,
          options: q.options ? JSON.parse(q.options) : null
        }))
      };
    });

    res.json({
      exam,
      parts: fullParts
    });
  } catch (error) {
    console.error('Get full exam error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all exams (teacher only)
router.get('/', authenticateTeacher, (req, res) => {
  try {
    const exams = db.prepare(`
      SELECT e.*, t.username as creator_name
      FROM exams e
      JOIN teachers t ON e.created_by = t.id
      ORDER BY e.created_at DESC
    `).all();

    res.json({ exams });
  } catch (error) {
    console.error('Get exams error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create exam (teacher only)
router.post('/', authenticateTeacher, (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const result = db.prepare(`
      INSERT INTO exams (title, description, created_by)
      VALUES (?, ?, ?)
    `).run(title, description || '', req.teacherId);

    const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({ exam });
  } catch (error) {
    console.error('Create exam error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update exam (teacher only)
router.put('/:id', authenticateTeacher, (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, is_active } = req.body;

    const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(id);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    db.prepare(`
      UPDATE exams
      SET title = ?, description = ?, is_active = ?
      WHERE id = ?
    `).run(
      title !== undefined ? title : exam.title,
      description !== undefined ? description : exam.description,
      is_active !== undefined ? (is_active ? 1 : 0) : exam.is_active,
      id
    );

    const updated = db.prepare('SELECT * FROM exams WHERE id = ?').get(id);
    res.json({ exam: updated });
  } catch (error) {
    console.error('Update exam error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Set active exam (deactivate others)
router.post('/:id/activate', authenticateTeacher, (req, res) => {
  try {
    const { id } = req.params;

    // Deactivate all exams first
    db.prepare('UPDATE exams SET is_active = 0').run();

    // Activate the selected exam
    db.prepare('UPDATE exams SET is_active = 1 WHERE id = ?').run(id);

    const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(id);
    res.json({ exam });
  } catch (error) {
    console.error('Activate exam error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete exam (teacher only)
router.delete('/:id', authenticateTeacher, (req, res) => {
  try {
    const { id } = req.params;

    const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(id);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    db.prepare('DELETE FROM exams WHERE id = ?').run(id);

    res.json({ message: 'Exam deleted' });
  } catch (error) {
    console.error('Delete exam error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
