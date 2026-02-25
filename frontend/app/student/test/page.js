'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import { api } from '../../../lib/api';
import { getUser } from '../../../lib/auth';

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const SUGGESTED_SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'History', 'English', 'Computer Science', 'Geography'];

export default function TakeTestPage() {
    const router = useRouter();
    const [step, setStep] = useState('config');   // config | loading | test | submitting
    const [subject, setSubject] = useState('');
    const [difficulty, setDifficulty] = useState('medium');
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [error, setError] = useState('');

    useEffect(() => {
        const u = getUser();
        if (!u) return router.replace('/login');
        if (u.role !== 'student') return router.replace(`/${u.role}/dashboard`);
    }, [router]);

    async function generateTest(e) {
        e.preventDefault();
        if (!subject.trim()) return setError('Please enter a subject');
        setError('');
        setStep('loading');
        try {
            const { questions: qs } = await api.generateTest({ subjectName: subject.trim(), difficulty });
            setQuestions(qs);
            setAnswers({});
            setStep('test');
        } catch (err) {
            setError(err.message);
            setStep('config');
        }
    }

    async function submitTest() {
        const unanswered = questions.filter((_, i) => !answers[i]);
        if (unanswered.length > 0) return setError(`Please answer all ${unanswered.length} remaining question(s).`);
        setStep('submitting');

        const questionsAndAnswers = questions.map((q, i) => ({
            questionText: q.question_text,
            options: q.options,
            correctAnswer: q.correct_answer,
            studentAnswer: answers[i],
            explanation: q.explanation,
            topic: q.topic,
        }));

        const score = questionsAndAnswers.filter(q => q.studentAnswer === q.correctAnswer).length;

        try {
            const { testId } = await api.submitTest({
                subjectName: subject,
                difficulty,
                questionsAndAnswers,
                score,
                totalQuestions: questions.length,
            });
            router.push(`/student/results/${testId}`);
        } catch (err) {
            setError(err.message);
            setStep('test');
        }
    }

    const answeredCount = Object.keys(answers).length;
    const progress = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
            <Navbar />
            <main style={{ maxWidth: '820px', margin: '0 auto', padding: '32px 24px' }}>

                {/* Config step */}
                {step === 'config' && (
                    <div className="fade-in">
                        <h1 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '8px' }}>
                            🚀 Generate AI Test
                        </h1>
                        <p style={{ color: 'var(--muted)', marginBottom: '32px' }}>Configure your test and let AI create unique questions for you</p>

                        <div className="glass" style={{ padding: '36px' }}>
                            <form onSubmit={generateTest} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <div>
                                    <label className="label">Subject</label>
                                    <input
                                        id="test-subject"
                                        className="input"
                                        type="text"
                                        placeholder="e.g. Mathematics, Physics…"
                                        value={subject}
                                        onChange={e => setSubject(e.target.value)}
                                        required
                                    />
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                                        {SUGGESTED_SUBJECTS.map(s => (
                                            <button key={s} type="button"
                                                id={`subject-${s.toLowerCase().replace(/ /g, '-')}`}
                                                onClick={() => setSubject(s)}
                                                style={{
                                                    padding: '5px 14px',
                                                    borderRadius: '999px',
                                                    border: `1px solid ${subject === s ? 'var(--purple)' : 'var(--border)'}`,
                                                    background: subject === s ? 'rgba(124,58,237,0.15)' : 'var(--surface2)',
                                                    color: subject === s ? '#a78bfa' : 'var(--muted)',
                                                    cursor: 'pointer',
                                                    fontSize: '0.8rem',
                                                    fontFamily: 'Inter, sans-serif',
                                                    transition: 'all 0.15s',
                                                }}>
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="label">Difficulty</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                        {DIFFICULTIES.map(d => {
                                            const icons = { easy: '🟢', medium: '🟡', hard: '🔴' };
                                            const colors = { easy: '#10b981', medium: '#f59e0b', hard: '#ef4444' };
                                            return (
                                                <button key={d} type="button" id={`difficulty-${d}`}
                                                    onClick={() => setDifficulty(d)}
                                                    style={{
                                                        padding: '16px',
                                                        borderRadius: '12px',
                                                        border: `1px solid ${difficulty === d ? colors[d] : 'var(--border)'}`,
                                                        background: difficulty === d ? `rgba(${d === 'easy' ? '16,185,129' : d === 'medium' ? '245,158,11' : '239,68,68'},0.1)` : 'var(--surface2)',
                                                        color: difficulty === d ? colors[d] : 'var(--muted)',
                                                        cursor: 'pointer',
                                                        fontWeight: '600',
                                                        fontSize: '0.9rem',
                                                        fontFamily: 'Inter, sans-serif',
                                                        transition: 'all 0.2s',
                                                        textAlign: 'center',
                                                    }}>
                                                    <div style={{ fontSize: '1.5rem', marginBottom: '6px' }}>{icons[d]}</div>
                                                    {d.charAt(0).toUpperCase() + d.slice(1)}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {error && (
                                    <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '12px 16px', color: '#f87171' }}>
                                        {error}
                                    </div>
                                )}

                                <button id="generate-test-btn" className="btn-primary" type="submit" style={{ fontSize: '1rem', padding: '16px' }}>
                                    ✨ Generate Test with AI
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Loading */}
                {step === 'loading' && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 180px)', gap: '20px' }}>
                        <div className="spinner" style={{ width: '56px', height: '56px', borderWidth: '4px' }} />
                        <h2 style={{ fontSize: '1.3rem', fontWeight: '700' }}>AI is crafting your test…</h2>
                        <p style={{ color: 'var(--muted)' }}>Generating {difficulty} questions on {subject}</p>
                    </div>
                )}

                {/* Test */}
                {step === 'test' && (
                    <div className="fade-in">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div>
                                <h1 style={{ fontSize: '1.5rem', fontWeight: '800' }}>{subject} Test</h1>
                                <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                                    {questions.length} questions · {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} difficulty
                                </p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '6px' }}>
                                    {answeredCount}/{questions.length} answered
                                </div>
                                <div style={{ width: '140px', height: '6px', background: 'var(--surface2)', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #7c3aed, #2563eb)', borderRadius: '3px', transition: 'width 0.3s' }} />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
                            {questions.map((q, qi) => (
                                <div key={qi} className="glass" style={{ padding: '24px' }}>
                                    <p style={{ fontWeight: '600', marginBottom: '18px', lineHeight: 1.6, fontSize: '1rem' }}>
                                        <span style={{ color: 'var(--purple)', marginRight: '8px' }}>{qi + 1}.</span>
                                        {q.question_text}
                                    </p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {q.options.map((opt, oi) => {
                                            const isSelected = answers[qi] === opt;
                                            return (
                                                <button key={oi}
                                                    id={`q${qi}-opt${oi}`}
                                                    onClick={() => { setAnswers({ ...answers, [qi]: opt }); setError(''); }}
                                                    style={{
                                                        textAlign: 'left',
                                                        padding: '14px 18px',
                                                        borderRadius: '10px',
                                                        border: `1px solid ${isSelected ? 'var(--purple)' : 'var(--border)'}`,
                                                        background: isSelected ? 'rgba(124,58,237,0.15)' : 'var(--surface2)',
                                                        color: isSelected ? '#a78bfa' : 'var(--text)',
                                                        cursor: 'pointer',
                                                        fontSize: '0.9rem',
                                                        fontFamily: 'Inter, sans-serif',
                                                        transition: 'all 0.15s',
                                                        fontWeight: isSelected ? '600' : '400',
                                                    }}>
                                                    <span style={{ marginRight: '10px', color: 'var(--muted)' }}>{String.fromCharCode(65 + oi)}.</span>
                                                    {opt}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {error && (
                            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '12px 16px', color: '#f87171', marginBottom: '16px' }}>
                                {error}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button className="btn-secondary" onClick={() => setStep('config')}>← Back</button>
                            <button id="submit-test-btn" className="btn-primary" style={{ padding: '14px 36px', fontSize: '1rem' }} onClick={submitTest}>
                                Submit Test →
                            </button>
                        </div>
                    </div>
                )}

                {/* Submitting */}
                {step === 'submitting' && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 180px)', gap: '20px' }}>
                        <div className="spinner" style={{ width: '56px', height: '56px', borderWidth: '4px' }} />
                        <h2 style={{ fontSize: '1.3rem', fontWeight: '700' }}>AI is grading your answers…</h2>
                        <p style={{ color: 'var(--muted)' }}>Analysing mistakes and generating recommendations</p>
                    </div>
                )}
            </main>
        </div>
    );
}
