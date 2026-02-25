const express = require('express');
const db = require('../db/index');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.use(requireRole(['teacher']));

router.get('/students', (req, res) => {
    try {
        const students = db.prepare(`
      SELECT DISTINCT u.id, u.name, u.email,
        (SELECT COUNT(*) FROM tests WHERE student_id = u.id) as tests_taken,
        (SELECT AVG(score) FROM tests WHERE student_id = u.id) as avg_score
      FROM users u
      WHERE u.role = 'student'
    `).all();
        res.json(students);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/students/:id/analytics', (req, res) => {
    try {
        const studentId = req.params.id;
        const tests = db.prepare('SELECT * FROM tests WHERE student_id = ? ORDER BY completed_at DESC').all(studentId);
        const recommendations = db.prepare('SELECT * FROM recommendations WHERE student_id = ? ORDER BY created_at DESC LIMIT 5').all(studentId);
        res.json({ tests, recommendations });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
