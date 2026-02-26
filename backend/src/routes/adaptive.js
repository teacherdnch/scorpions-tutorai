const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/index');
const { requireAuth } = require('../middleware/auth');
const { generateAdaptiveQuestion } = require('../services/ai');
const { computeRiskIndex, saveReport, recordEvent, getReport } = require('../services/cheatingDetector');

const router = express.Router();
router.use(requireAuth);

const TOTAL_QUESTIONS = 10;
const K_FACTOR = 2;         // ELO learning rate (higher = faster convergence)
const INITIAL_SKILL = 5.0;  // 1–10 scale

// ─── ELO-IRT helpers ────────────────────────────────────────────────────────

function expectedProbability(skill, difficulty) {
    return 1 / (1 + Math.exp(-(skill - difficulty)));
}

function updateSkill(skill, difficulty, isCorrect) {
    const expected = expectedProbability(skill, difficulty);
    const actual = isCorrect ? 1 : 0;
    const newSkill = skill + K_FACTOR * (actual - expected);
    return Math.max(1.0, Math.min(10.0, newSkill));
}

function nextDifficulty(skill) {
    // Target current skill, with tiny ±0.3 random jitter to avoid monotony
    const jitter = (Math.random() - 0.5) * 0.6;
    const raw = skill + jitter;
    return Math.max(1.0, Math.min(10.0, raw));
}

function skillToLevel(skill) {
    if (skill < 2) return { label: 'Beginner', emoji: '🌱', color: '#6b7280' };
    if (skill < 4) return { label: 'Elementary', emoji: '📚', color: '#3b82f6' };
    if (skill < 6) return { label: 'Intermediate', emoji: '⚡', color: '#8b5cf6' };
    if (skill < 8) return { label: 'Advanced', emoji: '🔥', color: '#f59e0b' };
    return { label: 'Expert', emoji: '🏆', color: '#10b981' };
}

// ─── Routes ─────────────────────────────────────────────────────────────────

// POST /api/adaptive/start  — create session, return first question
router.post('/start', async (req, res) => {
    try {
        const { subject } = req.body;
        if (!subject) return res.status(400).json({ error: 'Subject required' });

        const sessionId = uuidv4();
        const difficulty = nextDifficulty(INITIAL_SKILL);

        db.prepare(`
            INSERT INTO adaptive_sessions (id, student_id, subject, current_skill, total_questions)
            VALUES (?, ?, ?, ?, ?)
        `).run(sessionId, req.user.id, subject, INITIAL_SKILL, TOTAL_QUESTIONS);

        const question = await generateAdaptiveQuestion(subject, difficulty);

        res.json({
            sessionId,
            questionNumber: 1,
            totalQuestions: TOTAL_QUESTIONS,
            currentSkill: INITIAL_SKILL,
            difficulty,
            question,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to start adaptive session' });
    }
});

// POST /api/adaptive/:sessionId/answer  — grade answer, update skill, return next question (or final result)
router.post('/:sessionId/answer', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { questionText, options, correctAnswer, studentAnswer, explanation, topic, difficulty } = req.body;

        const session = db.prepare(
            'SELECT * FROM adaptive_sessions WHERE id = ? AND student_id = ? AND status = ?'
        ).get(sessionId, req.user.id, 'active');

        if (!session) return res.status(404).json({ error: 'Session not found or already completed' });

        const isCorrect = studentAnswer === correctAnswer;
        const skillBefore = session.current_skill;
        const skillAfter = updateSkill(skillBefore, difficulty, isCorrect);
        const qNum = session.questions_answered + 1;

        // Save this answer
        db.prepare(`
            INSERT INTO adaptive_answers
              (id, session_id, question_number, question_text, options_json,
               correct_answer, student_answer, is_correct, question_difficulty,
               skill_before, skill_after, topic, explanation)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
        `).run(
            uuidv4(), sessionId, qNum, questionText, JSON.stringify(options),
            correctAnswer, studentAnswer, isCorrect ? 1 : 0, difficulty,
            skillBefore, skillAfter, topic || '', explanation || ''
        );

        // Update session
        const isLast = qNum >= TOTAL_QUESTIONS;
        db.prepare(`
            UPDATE adaptive_sessions
            SET current_skill = ?, questions_answered = ?, status = ?, completed_at = ?
            WHERE id = ?
        `).run(skillAfter, qNum, isLast ? 'completed' : 'active', isLast ? new Date().toISOString() : null, sessionId);

        // Return final result if done
        if (isLast) {
            const answers = db.prepare(
                'SELECT * FROM adaptive_answers WHERE session_id = ? ORDER BY question_number ASC'
            ).all(sessionId);

            const correct = answers.filter(a => a.is_correct).length;
            const level = skillToLevel(skillAfter);

            // ── Run anti-cheat analysis ──────────────────────────────────
            let riskReport = null;
            try {
                riskReport = computeRiskIndex(sessionId);
                if (riskReport) saveReport(riskReport);
            } catch (e) { console.error('Anti-cheat analysis failed:', e.message); }

            return res.json({
                done: true,
                finalSkill: skillAfter,
                level,
                score: correct,
                totalQuestions: TOTAL_QUESTIONS,
                answers: answers.map(a => ({ ...a, options: JSON.parse(a.options_json) })),
                skillProgression: answers.map(a => ({
                    q: a.question_number,
                    skill: a.skill_after,
                    difficulty: a.question_difficulty,
                    correct: a.is_correct === 1,
                })),
                antiCheat: riskReport ? {
                    riskIndex: riskReport.risk_index,
                    riskLevel: riskReport.risk_level,
                    signals: JSON.parse(riskReport.details_json || '{}').signals || [],
                } : null,
            });
        }

        // Generate next question at new difficulty
        const nextDiff = nextDifficulty(skillAfter);
        const nextQuestion = await generateAdaptiveQuestion(session.subject, nextDiff);

        res.json({
            done: false,
            isCorrect,
            skillBefore,
            skillAfter,
            level: skillToLevel(skillAfter),
            questionNumber: qNum + 1,
            totalQuestions: TOTAL_QUESTIONS,
            difficulty: nextDiff,
            question: nextQuestion,
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to process answer' });
    }
});

// GET /api/adaptive/history  — student's adaptive session history
router.get('/history', (req, res) => {
    try {
        const sessions = db.prepare(`
            SELECT * FROM adaptive_sessions
            WHERE student_id = ? ORDER BY started_at DESC LIMIT 20
        `).all(req.user.id);
        res.json(sessions.map(s => ({ ...s, level: skillToLevel(s.current_skill) })));
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/adaptive/:sessionId/events  — receive telemetry from frontend
router.post('/:sessionId/events', (req, res) => {
    try {
        const { sessionId } = req.params;
        const { events } = req.body;  // array of { type, questionNumber, value }
        if (!Array.isArray(events)) return res.status(400).json({ error: 'events must be array' });

        const session = db.prepare(
            'SELECT * FROM adaptive_sessions WHERE id = ? AND student_id = ?'
        ).get(sessionId, req.user.id);
        if (!session) return res.status(404).json({ error: 'Session not found' });

        for (const ev of events) {
            recordEvent(sessionId, ev.type, ev.questionNumber || null, ev.value || {});
        }
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/adaptive/:sessionId/report  — anti-cheat report (teacher/admin)
router.get('/:sessionId/report', (req, res) => {
    try {
        const report = getReport(req.params.sessionId);
        if (!report) return res.status(404).json({ error: 'No report found' });
        res.json({ ...report, details: JSON.parse(report.details_json || '{}') });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
