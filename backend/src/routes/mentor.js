const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/index');
const { requireAuth } = require('../middleware/auth');
const { generateMentorSession } = require('../services/ai');

const router = express.Router();
router.use(requireAuth);

// POST /api/mentor/analyze
// Body: { wrongAnswers, subject, skillLevel }
// wrongAnswers: [{ question, studentAnswer, correctAnswer, topic, explanation }]
router.post('/analyze', async (req, res) => {
    try {
        const { wrongAnswers = [], subject, skillLevel = 5 } = req.body;

        if (!subject) return res.status(400).json({ error: 'Subject is required' });

        // Get student name for personalization
        const student = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);
        const studentName = student?.name || 'Student';

        const analysis = await generateMentorSession({
            wrongAnswers,
            subject,
            skillLevel,
            studentName,
        });

        const sessionId = uuidv4();
        db.prepare(`
            INSERT INTO mentor_sessions (id, student_id, subject, skill_level, analysis_json)
            VALUES (?, ?, ?, ?, ?)
        `).run(sessionId, req.user.id, subject, skillLevel, JSON.stringify(analysis));

        res.status(201).json({ id: sessionId, subject, skillLevel, studentName, analysis });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to generate mentor session' });
    }
});

// GET /api/mentor/:id — retrieve a saved mentor session
router.get('/:id', (req, res) => {
    try {
        const session = db.prepare(
            'SELECT * FROM mentor_sessions WHERE id = ? AND student_id = ?'
        ).get(req.params.id, req.user.id);

        if (!session) return res.status(404).json({ error: 'Session not found' });

        res.json({ ...session, analysis: JSON.parse(session.analysis_json) });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/mentor — list student's mentor sessions
router.get('/', (req, res) => {
    try {
        const sessions = db.prepare(
            'SELECT id, subject, skill_level, created_at FROM mentor_sessions WHERE student_id = ? ORDER BY created_at DESC LIMIT 20'
        ).all(req.user.id);
        res.json(sessions);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
