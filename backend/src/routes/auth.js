const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/index');

const router = express.Router();

router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role, teacherCode } = req.body;

        if (!['student', 'teacher', 'admin'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        if (role === 'teacher') {
            if (!teacherCode) return res.status(400).json({ error: 'Teacher code required' });
            const codeRecord = db.prepare('SELECT * FROM teacher_codes WHERE code = ? AND is_used = 0').get(teacherCode);
            if (!codeRecord) return res.status(400).json({ error: 'Invalid or expired teacher code' });
            db.prepare('UPDATE teacher_codes SET is_used = 1 WHERE code = ?').run(teacherCode);
        }

        const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existingUser) return res.status(400).json({ error: 'Email already registered' });

        const passwordHash = await bcrypt.hash(password, 10);
        const userId = uuidv4();

        db.prepare('INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)')
            .run(userId, name, email, passwordHash, role);

        const token = jwt.sign({ id: userId, role }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });
        res.status(201).json({ token, user: { id: userId, name, email, role } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

module.exports = router;
