const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/index');
const { requireAuth } = require('../middleware/auth');
const { generateTestContent, analyzeMistakesAndRecommend } = require('../services/ai');

const router = express.Router();

router.use(requireAuth);

// List all subjects
router.get('/subjects', (req, res) => {
    try {
        const subjects = db.prepare('SELECT * FROM subjects').all();
        res.json(subjects);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Generate a test via AI
router.post('/generate', async (req, res) => {
    try {
        const { subjectName, difficulty } = req.body;
        const questions = await generateTestContent(subjectName, difficulty);
        res.json({ questions });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to generate test' });
    }
});

// Submit answers, grade, analyse, save recommendations
router.post('/submit', async (req, res) => {
    try {
        const { subjectName, difficulty, questionsAndAnswers, score, totalQuestions } = req.body;

        let subject = db.prepare('SELECT id FROM subjects WHERE name = ?').get(subjectName);
        if (!subject) {
            const subjectId = uuidv4();
            db.prepare('INSERT INTO subjects (id, name) VALUES (?, ?)').run(subjectId, subjectName);
            subject = { id: subjectId };
        }

        const testId = uuidv4();
        db.prepare(`
      INSERT INTO tests (id, student_id, subject_id, difficulty, score, total_questions, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(testId, req.user.id, subject.id, difficulty, score, totalQuestions, new Date().toISOString());

        const wrongAnswersForAI = [];
        const insertQuestion = db.prepare(`
      INSERT INTO questions (id, test_id, question_text, options_json, correct_answer, student_answer, explanation, topic, is_correct)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

        for (const qa of questionsAndAnswers) {
            const isCorrect = (qa.studentAnswer === qa.correctAnswer) ? 1 : 0;
            insertQuestion.run(
                uuidv4(), testId, qa.questionText, JSON.stringify(qa.options),
                qa.correctAnswer, qa.studentAnswer, qa.explanation, qa.topic, isCorrect
            );
            if (!isCorrect) {
                wrongAnswersForAI.push({
                    question: qa.questionText,
                    studentAnswer: qa.studentAnswer,
                    correctAnswer: qa.correctAnswer,
                    topic: qa.topic
                });
            }
        }

        let recommendations = [];
        if (wrongAnswersForAI.length > 0) {
            recommendations = await analyzeMistakesAndRecommend(wrongAnswersForAI);
            const insertRec = db.prepare('INSERT INTO recommendations (id, student_id, topic, material) VALUES (?, ?, ?, ?)');
            for (const rec of recommendations) {
                insertRec.run(uuidv4(), req.user.id, rec.topic, rec.material);
            }
        }

        res.status(201).json({ success: true, testId, recommendations });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to submit test' });
    }
});

// Student test history
router.get('/history', (req, res) => {
    try {
        const tests = db.prepare(`
      SELECT t.*, s.name as subject_name
      FROM tests t
      JOIN subjects s ON t.subject_id = s.id
      WHERE t.student_id = ?
      ORDER BY t.completed_at DESC
    `).all(req.user.id);
        res.json(tests);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Aggregated student stats for dashboard
router.get('/progress', (req, res) => {
    try {
        const stats = db.prepare(`
      SELECT COUNT(*) as total_tests, AVG(score * 100.0 / total_questions) as avg_score
      FROM tests WHERE student_id = ?
    `).get(req.user.id);

        const weakTopics = db.prepare(`
      SELECT q.topic, COUNT(*) as wrong_count
      FROM questions q
      JOIN tests t ON q.test_id = t.id
      WHERE t.student_id = ? AND q.is_correct = 0
      GROUP BY q.topic
      ORDER BY wrong_count DESC
      LIMIT 5
    `).all(req.user.id);

        const trend = db.prepare(`
      SELECT t.completed_at, t.score, t.total_questions, s.name as subject_name,
             ROUND(t.score * 100.0 / t.total_questions) as percentage
      FROM tests t
      JOIN subjects s ON t.subject_id = s.id
      WHERE t.student_id = ?
      ORDER BY t.completed_at ASC
      LIMIT 10
    `).all(req.user.id);

        const recommendations = db.prepare(`
      SELECT * FROM recommendations WHERE student_id = ? ORDER BY created_at DESC LIMIT 5
    `).all(req.user.id);

        res.json({
            totalTests: stats.total_tests,
            avgScore: stats.avg_score ? Math.round(stats.avg_score) : 0,
            weakTopics,
            trend,
            recommendations
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Single test detail with questions
router.get('/:id', (req, res) => {
    try {
        const test = db.prepare(`
      SELECT t.*, s.name as subject_name
      FROM tests t
      JOIN subjects s ON t.subject_id = s.id
      WHERE t.id = ? AND t.student_id = ?
    `).get(req.params.id, req.user.id);

        if (!test) return res.status(404).json({ error: 'Test not found' });

        const questions = db.prepare('SELECT * FROM questions WHERE test_id = ?').all(req.params.id);
        const recommendations = db.prepare(
            'SELECT * FROM recommendations WHERE student_id = ? ORDER BY created_at DESC LIMIT 5'
        ).all(req.user.id);

        res.json({
            ...test,
            questions: questions.map(q => ({ ...q, options: JSON.parse(q.options_json) })),
            recommendations
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
