const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/index');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.use(requireRole(['admin']));

router.post('/codes', (req, res) => {
    try {
        const code = uuidv4().substring(0, 8).toUpperCase();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        db.prepare('INSERT INTO teacher_codes (id, code, created_by, expires_at) VALUES (?, ?, ?, ?)')
            .run(uuidv4(), code, req.user.id, expiresAt.toISOString());

        res.status(201).json({ code, expiresAt });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/codes', (req, res) => {
    try {
        const codes = db.prepare('SELECT * FROM teacher_codes').all();
        res.json(codes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/users', (req, res) => {
    try {
        const users = db.prepare('SELECT id, name, email, role, created_at FROM users').all();
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/stats', (req, res) => {
    try {
        const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
        const testCount = db.prepare('SELECT COUNT(*) as count FROM tests').get().count;
        res.json({ users: userCount, tests: testCount });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
