import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// Student enters by name (no password)
router.post('/enter', (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const trimmedName = name.trim();

    // Check if student exists
    let student = db.prepare('SELECT * FROM students WHERE name = ?').get(trimmedName);

    if (!student) {
      // Create new student
      const result = db.prepare('INSERT INTO students (name) VALUES (?)').run(trimmedName);
      student = {
        id: result.lastInsertRowid,
        name: trimmedName
      };
    }

    res.json({
      student: {
        id: student.id,
        name: student.name
      }
    });
  } catch (error) {
    console.error('Student enter error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get student by id (for session restoration)
router.get('/:id', (req, res) => {
  try {
    const student = db.prepare('SELECT id, name FROM students WHERE id = ?').get(req.params.id);

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({ student });
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
