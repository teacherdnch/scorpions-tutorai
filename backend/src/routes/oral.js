const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/index');
const { requireAuth } = require('../middleware/auth');
const { generateOralQuestion, evaluateOralAnswer } = require('../services/ai');

const router = express.Router();
router.use(requireAuth);

// ─── Setup tables (called once from schema.js) ────────────────────────────────
function setupOralTables() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS oral_sessions (
            id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL,
            subject TEXT NOT NULL,
            difficulty TEXT NOT NULL DEFAULT 'medium',
            total_questions INTEGER NOT NULL DEFAULT 5,
            questions_answered INTEGER DEFAULT 0,
            total_score REAL DEFAULT 0,
            avg_score REAL DEFAULT 0,
            status TEXT DEFAULT 'active',
            language TEXT DEFAULT 'en',
            started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed_at DATETIME,
            FOREIGN KEY(student_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS oral_answers (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            question_number INTEGER NOT NULL,
            question_text TEXT NOT NULL,
            topic TEXT,
            transcript TEXT NOT NULL,
            word_count INTEGER DEFAULT 0,
            score_relevance REAL DEFAULT 0,
            score_grammar REAL DEFAULT 0,
            score_depth REAL DEFAULT 0,
            score_communication REAL DEFAULT 0,
            total_score REAL DEFAULT 0,
            grade TEXT DEFAULT 'F',
            feedback_json TEXT,
            answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(session_id) REFERENCES oral_sessions(id)
        );
    `);
}
setupOralTables();

// POST /api/oral/start  — create session, get first question
router.post('/start', async (req, res) => {
    try {
        const { subject, difficulty = 'medium', totalQuestions = 5, language = 'en' } = req.body;
        if (!subject) return res.status(400).json({ error: 'Subject required' });

        const sessionId = uuidv4();
        db.prepare(`
            INSERT INTO oral_sessions (id, student_id, subject, difficulty, total_questions, language)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(sessionId, req.user.id, subject, difficulty, totalQuestions, language);

        const question = await generateOralQuestion(subject, difficulty, 1, []);

        res.json({ sessionId, questionNumber: 1, totalQuestions, question });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to start oral session' });
    }
});

// POST /api/oral/:sessionId/answer  — evaluate transcript, save, return next question
router.post('/:sessionId/answer', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { transcript, questionText, topic, idealPoints } = req.body;

        const session = db.prepare(
            'SELECT * FROM oral_sessions WHERE id = ? AND student_id = ? AND status = ?'
        ).get(sessionId, req.user.id, 'active');
        if (!session) return res.status(404).json({ error: 'Session not found' });

        // Evaluate answer with AI
        const evaluation = await evaluateOralAnswer({
            question: questionText,
            transcript,
            idealPoints: idealPoints || [],
            subject: session.subject,
        });

        const dims = evaluation.dimensions || {};
        const qNum = session.questions_answered + 1;

        db.prepare(`
            INSERT INTO oral_answers
              (id, session_id, question_number, question_text, topic, transcript, word_count,
               score_relevance, score_grammar, score_depth, score_communication, total_score, grade, feedback_json)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `).run(
            uuidv4(), sessionId, qNum, questionText, topic || '',
            transcript, evaluation.wordCount || 0,
            dims.relevance?.score || 0, dims.grammar?.score || 0,
            dims.depth?.score || 0, dims.communication?.score || 0,
            evaluation.totalScore, evaluation.grade,
            JSON.stringify(evaluation)
        );

        const isLast = qNum >= session.total_questions;

        // Update session progress
        const allAnswers = db.prepare(
            'SELECT total_score FROM oral_answers WHERE session_id = ?'
        ).all(sessionId);
        const avgScore = allAnswers.reduce((s, a) => s + a.total_score, 0) / allAnswers.length;

        db.prepare(`
            UPDATE oral_sessions
            SET questions_answered = ?, total_score = ?, avg_score = ?,
                status = ?, completed_at = ?
            WHERE id = ?
        `).run(qNum, allAnswers.reduce((s, a) => s + a.total_score, 0),
            avgScore, isLast ? 'completed' : 'active',
            isLast ? new Date().toISOString() : null, sessionId);

        if (isLast) {
            const answers = db.prepare(
                'SELECT * FROM oral_answers WHERE session_id = ? ORDER BY question_number'
            ).all(sessionId);
            return res.json({ done: true, evaluation, avgScore: Math.round(avgScore), answers });
        }

        // Get already-covered topics to avoid repetition
        const coveredTopics = db.prepare(
            'SELECT topic FROM oral_answers WHERE session_id = ?'
        ).all(sessionId).map(r => r.topic).filter(Boolean);

        const nextQuestion = await generateOralQuestion(
            session.subject, session.difficulty, qNum + 1, coveredTopics
        );

        res.json({ done: false, evaluation, nextQuestion, questionNumber: qNum + 1 });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to evaluate answer' });
    }
});

// GET /api/oral/history
router.get('/history', (req, res) => {
    try {
        const sessions = db.prepare(
            'SELECT * FROM oral_sessions WHERE student_id = ? ORDER BY started_at DESC LIMIT 20'
        ).all(req.user.id);
        res.json(sessions);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/oral/:sessionId  — full session with answers
router.get('/:sessionId', (req, res) => {
    try {
        const session = db.prepare('SELECT * FROM oral_sessions WHERE id = ?').get(req.params.sessionId);
        if (!session) return res.status(404).json({ error: 'Not found' });
        const answers = db.prepare(
            'SELECT * FROM oral_answers WHERE session_id = ? ORDER BY question_number'
        ).all(req.params.sessionId).map(a => ({ ...a, feedback: JSON.parse(a.feedback_json || '{}') }));
        res.json({ ...session, answers });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
