'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import { api } from '../../../lib/api';
import { getUser } from '../../../lib/auth';
import { useLang } from '../../../lib/LangContext';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer
} from 'recharts';

const TOTAL = 10;

const LEVEL_CONFIG = {
    'Beginner': { color: '#6b7280', bg: 'rgba(107,114,128,0.12)', border: '#6b728040' },
    'Elementary': { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: '#3b82f640' },
    'Intermediate': { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', border: '#8b5cf640' },
    'Advanced': { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: '#f59e0b40' },
    'Expert': { color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: '#10b98140' },
};

function DifficultyBar({ value }) {
    const pct = ((value - 1) / 9) * 100;
    const color = value < 3 ? '#6b7280' : value < 5 ? '#3b82f6' : value < 7 ? '#8b5cf6' : value < 9 ? '#f59e0b' : '#10b981';
    return (
        <div style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '4px' }}>
                <span>Difficulty</span><span>{value.toFixed(1)}/10</span>
            </div>
            <div style={{ height: '6px', background: 'var(--surface2)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.5s ease' }} />
            </div>
        </div>
    );
}

function SkillBadge({ skill, level }) {
    const cfg = LEVEL_CONFIG[level?.label] || LEVEL_CONFIG['Intermediate'];
    return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '999px', background: cfg.bg, border: `1px solid ${cfg.border}` }}>
            <span>{level?.emoji}</span>
            <span style={{ color: cfg.color, fontWeight: '700', fontSize: '0.85rem' }}>{level?.label}</span>
            <span style={{ color: cfg.color, fontSize: '0.8rem', opacity: 0.8 }}>({skill?.toFixed(1)}/10)</span>
        </div>
    );
}

export default function AdaptiveTest() {
    const router = useRouter();
    const { t } = useLang();
    const [step, setStep] = useState('config');   // config | loading | question | feedback | result
    const [subject, setSubject] = useState('');
    const [session, setSession] = useState(null);
    const [current, setCurrent] = useState(null);  // { question, difficulty, questionNumber, ... }
    const [selected, setSelected] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [mentorLoading, setMentorLoading] = useState(false);

    // ── Anti-cheat tracking refs ──────────────────────────────────────
    const eventBuffer = useRef([]);         // queued events to send
    const questionStartTime = useRef(null); // when current question was shown
    const sessionIdRef = useRef(null);      // mirror of session.id for listeners

    function pushEvent(type, value = {}) {
        eventBuffer.current.push({
            type,
            questionNumber: current?.questionNumber ?? null,
            value,
        });
    }

    async function flushEvents(sid) {
        const id = sid || sessionIdRef.current;
        if (!id || eventBuffer.current.length === 0) return;
        const toSend = [...eventBuffer.current];
        eventBuffer.current = [];
        try { await api.sendTelemetry(id, toSend); } catch (_) { }
    }

    // Register paste / tab-switch listeners once on mount
    useEffect(() => {
        function onPaste() { pushEvent('paste', { char_count: 0 }); }
        function onBlur() { pushEvent('tab_switch'); }
        function onVis() { if (document.hidden) pushEvent('tab_switch'); }

        document.addEventListener('paste', onPaste);
        window.addEventListener('blur', onBlur);
        document.addEventListener('visibilitychange', onVis);
        return () => {
            document.removeEventListener('paste', onPaste);
            window.removeEventListener('blur', onBlur);
            document.removeEventListener('visibilitychange', onVis);
        };
    }, []);

    // Start question timer whenever a new question loads
    useEffect(() => {
        if (step === 'question' && current) {
            questionStartTime.current = Date.now();
        }
    }, [current, step]);

    useEffect(() => {
        const u = getUser();
        if (!u) return router.replace('/login');
        if (u.role !== 'student') return router.replace(`/${u.role}/dashboard`);
    }, [router]);

    async function startExam(e) {
        e.preventDefault();
        if (!subject.trim()) return setError('Please enter a subject');
        setError('');
        setStep('loading');
        try {
            const data = await api.startAdaptive({ subject: subject.trim() });
            sessionIdRef.current = data.sessionId;  // make available to listeners
            setSession({ id: data.sessionId, currentSkill: data.currentSkill, level: null });
            setCurrent({ question: data.question, difficulty: data.difficulty, questionNumber: data.questionNumber });
            setSelected(null);
            setStep('question');
        } catch (err) {
            setError(err.message);
            setStep('config');
        }
    }

    async function submitAnswer() {
        if (!selected) return;
        setStep('loading');
        const q = current.question;

        // ── Record answer time ─────────────────────────────────────────────
        if (questionStartTime.current) {
            pushEvent('answer_time', {
                time_ms: Date.now() - questionStartTime.current,
                difficulty: current.difficulty,
            });
        }

        // Flush events to backend (non-blocking)
        flushEvents(session?.id);

        const isCorrect = selected === q.correct_answer;
        setFeedback({ isCorrect, correctAnswer: q.correct_answer, explanation: q.explanation, selected });
        setStep('feedback');

        try {
            const data = await api.answerAdaptive(session.id, {
                questionText: q.question_text,
                options: q.options,
                correctAnswer: q.correct_answer,
                studentAnswer: selected,
                explanation: q.explanation,
                topic: q.topic,
                difficulty: current.difficulty,
            });

            setSession(s => ({ ...s, currentSkill: data.skillAfter ?? data.finalSkill, level: data.level }));

            if (data.done) {
                setResult(data);
            } else {
                setCurrent({ question: data.question, difficulty: data.difficulty, questionNumber: data.questionNumber });
            }
        } catch (err) {
            setError(err.message);
        }
    }

    function nextQuestion() {
        if (result) { setStep('result'); return; }
        setSelected(null);
        setFeedback(null);
        setStep('question');
    }

    const progress = current ? ((current.questionNumber - 1) / TOTAL) * 100 : 0;

    // ─── RENDER ───────────────────────────────────────────────────────────────

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
            <Navbar />
            <main style={{ maxWidth: '780px', margin: '0 auto', padding: '32px 24px' }}>

                {/* CONFIG */}
                {step === 'config' && (
                    <div className="fade-in">
                        <h1 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '8px' }}>
                            🎯 {t('adp.title')}
                        </h1>
                        <p style={{ color: 'var(--muted)', marginBottom: '32px', lineHeight: 1.6 }}>
                            {t('adp.desc')}
                        </p>

                        {/* Algorithm explainer */}
                        <div style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '12px', padding: '18px 20px', marginBottom: '28px' }}>
                            <p style={{ fontWeight: '700', marginBottom: '10px', color: '#a78bfa' }}>{t('adp.howTitle')}</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                {[
                                    { icon: '✅', text: t('adp.feat1') },
                                    { icon: '❌', text: t('adp.feat2') },
                                    { icon: '📊', text: t('adp.feat3') },
                                    { icon: '🏆', text: t('adp.feat4') },
                                ].map(({ icon, text }) => (
                                    <div key={text} style={{ display: 'flex', gap: '8px', fontSize: '0.85rem', color: 'var(--muted)' }}>
                                        <span>{icon}</span><span>{text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="glass" style={{ padding: '36px' }}>
                            <form onSubmit={startExam} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div>
                                    <label className="label">{t('adp.subject')}</label>
                                    <input id="adaptive-subject" className="input" type="text"
                                        placeholder={t('adp.subjectPH')}
                                        value={subject} onChange={e => setSubject(e.target.value)} required />
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                                        {['Mathematics', 'Physics', 'Chemistry', 'Biology', 'History', 'English'].map(s => (
                                            <button key={s} type="button" onClick={() => setSubject(s)}
                                                style={{ padding: '4px 12px', borderRadius: '999px', border: `1px solid ${subject === s ? 'var(--purple)' : 'var(--border)'}`, background: subject === s ? 'rgba(124,58,237,0.15)' : 'var(--surface2)', color: subject === s ? '#a78bfa' : 'var(--muted)', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Inter,sans-serif', transition: 'all 0.15s' }}>
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '10px 14px', color: '#f87171', fontSize: '0.875rem' }}>{error}</div>}
                                <button id="start-adaptive-btn" className="btn-primary" type="submit" style={{ fontSize: '1rem', padding: '16px' }}>
                                    {t('adp.start')}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* LOADING */}
                {step === 'loading' && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 180px)', gap: '20px' }}>
                        <div className="spinner" style={{ width: '52px', height: '52px', borderWidth: '4px' }} />
                        <p style={{ color: 'var(--muted)' }}>{t('adp.loading')}</p>
                    </div>
                )}

                {/* QUESTION */}
                {step === 'question' && current && (
                    <div className="fade-in">
                        {/* Progress header */}
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <div>
                                    <span style={{ fontSize: '1.1rem', fontWeight: '800' }}>{t('test.question')} {current.questionNumber}</span>
                                    <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}> / {TOTAL}</span>
                                </div>
                                {session?.level && <SkillBadge skill={session.currentSkill} level={session.level} />}
                            </div>
                            {/* Overall progress */}
                            <div style={{ height: '6px', background: 'var(--surface2)', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
                                <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg,#7c3aed,#2563eb)', borderRadius: '3px', transition: 'width 0.4s' }} />
                            </div>
                            <DifficultyBar value={current.difficulty} />
                        </div>

                        <div className="glass" style={{ padding: '28px', marginBottom: '20px' }}>
                            {current.question.topic && (
                                <div className="badge badge-purple" style={{ marginBottom: '14px' }}>{current.question.topic}</div>
                            )}
                            <p style={{ fontSize: '1.05rem', fontWeight: '600', lineHeight: 1.65, marginBottom: '22px' }}>
                                {current.question.question_text}
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {(current.question.options || []).map((opt, i) => (
                                    <button key={i} onClick={() => setSelected(opt)}
                                        style={{
                                            textAlign: 'left', padding: '14px 18px', borderRadius: '10px',
                                            border: `1px solid ${selected === opt ? 'var(--purple)' : 'var(--border)'}`,
                                            background: selected === opt ? 'rgba(124,58,237,0.15)' : 'var(--surface2)',
                                            color: selected === opt ? '#a78bfa' : 'var(--text)',
                                            cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'Inter,sans-serif',
                                            fontWeight: selected === opt ? '600' : '400',
                                            transition: 'all 0.15s',
                                        }}>
                                        <span style={{ color: 'var(--muted)', marginRight: '10px' }}>{String.fromCharCode(65 + i)}.</span>
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="btn-primary" onClick={submitAnswer} disabled={!selected} style={{ padding: '14px 36px', fontSize: '1rem' }}>
                                {t('adp.confirm')}
                            </button>
                        </div>
                    </div>
                )}

                {/* FEEDBACK */}
                {step === 'feedback' && feedback && (
                    <div className="fade-in">
                        {/* Progress header (same as question) */}
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <div>
                                    <span style={{ fontSize: '1.1rem', fontWeight: '800' }}>{t('test.question')} {current.questionNumber - 1}</span>
                                    <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}> / {TOTAL}</span>
                                </div>
                                {session?.level && <SkillBadge skill={session.currentSkill} level={session.level} />}
                            </div>
                            <div style={{ height: '6px', background: 'var(--surface2)', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
                                <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg,#7c3aed,#2563eb)', borderRadius: '3px' }} />
                            </div>
                        </div>

                        {/* Result banner */}
                        <div style={{
                            borderRadius: '14px',
                            padding: '20px 24px',
                            marginBottom: '20px',
                            border: `1px solid ${feedback.isCorrect ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                            background: feedback.isCorrect ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                        }}>
                            <p style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '4px' }}>
                                {feedback.isCorrect ? t('adp.correct') : t('adp.incorrect')}
                            </p>
                            {!feedback.isCorrect && (
                                <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '8px' }}>
                                    {t('adp.correctAnswer')} <strong style={{ color: '#34d399' }}>{feedback.correctAnswer}</strong>
                                </p>
                            )}
                            <p style={{ color: 'var(--text)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                                💡 {feedback.explanation}
                            </p>
                        </div>

                        {/* Skill update */}
                        {session?.level && (
                            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                                <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '8px' }}>
                                    {feedback.isCorrect ? t('adp.skillUp') : t('adp.skillDown')}
                                </p>
                                <SkillBadge skill={session.currentSkill} level={session.level} />
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="btn-primary" onClick={nextQuestion} style={{ padding: '14px 36px', fontSize: '1rem' }}>
                                {result ? t('adp.seeResult') : t('adp.next')}
                            </button>
                        </div>
                    </div>
                )}

                {/* RESULT */}
                {step === 'result' && result && (() => {
                    const cfg = LEVEL_CONFIG[result.level?.label] || LEVEL_CONFIG['Intermediate'];
                    const skillData = result.skillProgression || [];
                    return (
                        <div className="fade-in">
                            {/* Level hero */}
                            <div className="glass" style={{ padding: '40px', textAlign: 'center', marginBottom: '28px', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: cfg.color }} />
                                <div style={{ fontSize: '4rem', marginBottom: '12px' }}>{result.level?.emoji}</div>
                                <h1 style={{ fontSize: '2rem', fontWeight: '800', color: cfg.color, marginBottom: '6px' }}>{result.level?.label}</h1>
                                <p style={{ color: 'var(--muted)', marginBottom: '16px' }}>
                                    {t('adp.finalSkill')} <strong style={{ color: cfg.color }}>{result.finalSkill?.toFixed(2)} / 10</strong>
                                </p>
                                <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
                                    {result.score}/{result.totalQuestions} {t('adp.correctAnswers')}
                                </p>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '24px', flexWrap: 'wrap' }}>
                                    <button className="btn-primary" onClick={() => { setStep('config'); setSession(null); setCurrent(null); setResult(null); setFeedback(null); }}>
                                        {t('adp.retake')}
                                    </button>
                                    <button className="btn-secondary" onClick={() => router.push('/student/dashboard')}>{t('adp.dashboard')}</button>
                                    <button
                                        onClick={async () => {
                                            setMentorLoading(true);
                                            try {
                                                const wrongAnswers = (result.answers || []).filter(a => !a.is_correct).map(a => ({
                                                    question: a.question_text, studentAnswer: a.student_answer,
                                                    correctAnswer: a.correct_answer, topic: a.topic, explanation: a.explanation,
                                                }));
                                                const m = await api.analyzeMentor({ wrongAnswers, subject, skillLevel: result.finalSkill });
                                                router.push(`/student/mentor/${m.id}`);
                                            } catch { setMentorLoading(false); }
                                        }}
                                        disabled={mentorLoading}
                                        style={{ padding: '12px 24px', borderRadius: '10px', border: '1px solid #a78bfa50', background: 'rgba(139,92,246,0.15)', color: '#a78bfa', cursor: 'pointer', fontFamily: 'Inter,sans-serif', fontWeight: '700', fontSize: '0.875rem', transition: 'all 0.2s' }}>
                                        {mentorLoading ? t('adp.analyzing') : t('adp.aiMentor')}
                                    </button>
                                </div>
                            </div>

                            {/* Skill progression chart */}
                            <div className="glass" style={{ padding: '24px', marginBottom: '24px' }}>
                                <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '20px' }}>{t('adp.progression')}</h2>
                                <ResponsiveContainer width="100%" height={220}>
                                    <LineChart data={skillData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(124,58,237,0.1)" />
                                        <XAxis dataKey="q" tickFormatter={v => `Q${v}`} tick={{ fill: '#64748b', fontSize: 12 }} />
                                        <YAxis domain={[1, 10]} tick={{ fill: '#64748b', fontSize: 12 }} />
                                        <Tooltip
                                            contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px' }}
                                            formatter={(v, name) => [name === 'skill' ? `${v.toFixed(2)}/10` : `${v.toFixed(1)}/10`, name === 'skill' ? t('adp.skillLabel') : t('adp.diffLabel')]}
                                        />
                                        <ReferenceLine y={5} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" />
                                        <Line type="monotone" dataKey="skill" stroke={cfg.color} strokeWidth={2.5} dot={(p) => (
                                            <circle key={p.index} cx={p.cx} cy={p.cy} r={5} fill={p.payload.correct ? '#10b981' : '#ef4444'} stroke="#0a0a14" strokeWidth={2} />
                                        )} />
                                        <Line type="monotone" dataKey="difficulty" stroke="rgba(255,255,255,0.25)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                                <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '12px', fontSize: '0.8rem', color: 'var(--muted)' }}>
                                    <span>● <span style={{ color: '#10b981' }}>{t('adp.greenDot')}</span></span>
                                    <span>● <span style={{ color: '#ef4444' }}>{t('adp.redDot')}</span></span>
                                    <span>{t('adp.dashLine')}</span>
                                </div>
                            </div>

                            {/* Question breakdown */}
                            <div className="glass" style={{ padding: '24px' }}>
                                <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '16px' }}>{t('adp.breakdown')}</h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {result.answers.map((a, i) => (
                                        <div key={i} style={{ padding: '14px 18px', borderRadius: '10px', background: 'var(--surface2)', border: `1px solid ${a.is_correct ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                    <span>{a.is_correct ? '✅' : '❌'}</span>
                                                    <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>Q{a.question_number}</span>
                                                    {a.topic && <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>{a.topic}</span>}
                                                </div>
                                                <p style={{ color: 'var(--muted)', fontSize: '0.8rem', lineHeight: 1.4 }}>{a.question_text.slice(0, 80)}{a.question_text.length > 80 ? '…' : ''}</p>
                                            </div>
                                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{t('adp.difficulty')}</div>
                                                <div style={{ fontWeight: '700', color: '#a78bfa' }}>{a.question_difficulty.toFixed(1)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </main>
        </div>
    );
}
