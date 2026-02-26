'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../../../components/Navbar';
import { api } from '../../../../lib/api';
import { getUser } from '../../../../lib/auth';
import { useLang } from '../../../../lib/LangContext';

export default function ResultsPage() {
    const router = useRouter();
    const params = useParams();
    const testId = params.testId;
    const { t } = useLang();

    const [test, setTest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState({});
    const [mentorLoading, setMentorLoading] = useState(false);

    useEffect(() => {
        const u = getUser();
        if (!u) return router.replace('/login');
        if (u.role !== 'student') return router.replace(`/${u.role}/dashboard`);
        api.getTestById(testId)
            .then(d => { setTest(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, [testId, router]);

    if (loading) return (<div><Navbar /><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 64px)' }}><div className="spinner" /></div></div>);
    if (!test) return (<div><Navbar /><div style={{ textAlign: 'center', padding: '80px 24px', color: 'var(--muted)' }}><p style={{ fontSize: '2rem' }}>😕</p><p>Test not found.</p><Link href="/student/dashboard" style={{ color: '#a78bfa' }}>Back to Dashboard</Link></div></div>);

    const pct = Math.round((test.score / test.total_questions) * 100);
    const scoreColor = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';
    const scoreLabel = pct >= 80 ? t('res.excellent') : pct >= 60 ? t('res.good') : t('res.keep');

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
            <Navbar />
            <main style={{ maxWidth: '820px', margin: '0 auto', padding: '32px 24px' }}>
                {/* Score hero */}
                <div className="glass fade-in" style={{ padding: '40px', textAlign: 'center', marginBottom: '32px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: scoreColor }} />
                    <div style={{ width: '140px', height: '140px', borderRadius: '50%', border: `6px solid ${scoreColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', margin: '0 auto 20px', boxShadow: `0 0 40px ${scoreColor}40` }}>
                        <span style={{ fontSize: '2.4rem', fontWeight: '800', color: scoreColor }}>{pct}%</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{t('res.correct')}</span>
                    </div>
                    <h1 style={{ fontSize: '1.6rem', fontWeight: '800', marginBottom: '6px' }}>{scoreLabel}</h1>
                    <p style={{ color: 'var(--muted)' }}>
                        {test.score}/{test.total_questions} {t('res.correct')} · {test.subject_name} · {test.difficulty} {t('res.difficulty')}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '24px', flexWrap: 'wrap' }}>
                        <button className="btn-primary" onClick={() => router.push('/student/test')}>{t('res.anotherTest')}</button>
                        <button className="btn-secondary" onClick={() => router.push('/student/dashboard')}>{t('res.dashboard')}</button>
                        <button
                            onClick={async () => {
                                setMentorLoading(true);
                                try {
                                    const wrongAnswers = (test.questions || []).filter(q => q.is_correct !== 1).map(q => ({
                                        question: q.question_text, studentAnswer: q.student_answer,
                                        correctAnswer: q.correct_answer, topic: q.topic, explanation: q.explanation,
                                    }));
                                    const m = await api.analyzeMentor({ wrongAnswers, subject: test.subject_name, skillLevel: pct / 10 });
                                    router.push(`/student/mentor/${m.id}`);
                                } catch { setMentorLoading(false); }
                            }}
                            disabled={mentorLoading}
                            style={{ padding: '12px 24px', borderRadius: '10px', border: '1px solid #a78bfa50', background: 'rgba(139,92,246,0.15)', color: '#a78bfa', cursor: 'pointer', fontFamily: 'Inter,sans-serif', fontWeight: '700', fontSize: '0.875rem' }}>
                            {mentorLoading ? t('res.analyzing') : t('res.aiMentor')}
                        </button>
                    </div>
                </div>

                {/* Question breakdown */}
                <div className="glass" style={{ padding: '24px', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '20px' }}>{t('res.breakdown')}</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {test.questions.map((q, i) => {
                            const correct = q.is_correct === 1;
                            const open = expanded[i];
                            return (
                                <div key={i} style={{ borderRadius: '12px', border: `1px solid ${correct ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, background: correct ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)', overflow: 'hidden' }}>
                                    <button onClick={() => setExpanded({ ...expanded, [i]: !open })}
                                        style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                        <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{correct ? '✅' : '❌'}</span>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ color: 'var(--text)', fontSize: '0.9rem', fontWeight: '500', lineHeight: 1.5 }}>{i + 1}. {q.question_text}</p>
                                            {q.topic && <span className="badge badge-purple" style={{ marginTop: '6px' }}>{q.topic}</span>}
                                        </div>
                                        <span style={{ color: 'var(--muted)', flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
                                    </button>
                                    {open && (
                                        <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border)' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
                                                <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                                    <p style={{ color: '#f87171', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>{t('res.yourAnswer')}</p>
                                                    <p style={{ color: 'var(--text)', fontSize: '0.9rem' }}>{q.student_answer || '—'}</p>
                                                </div>
                                                <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                                                    <p style={{ color: '#34d399', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>{t('res.correctAnswer')}</p>
                                                    <p style={{ color: 'var(--text)', fontSize: '0.9rem' }}>{q.correct_answer}</p>
                                                </div>
                                            </div>
                                            {q.explanation && (
                                                <div style={{ marginTop: '12px', padding: '14px', borderRadius: '8px', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}>
                                                    <p style={{ color: '#a78bfa', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>{t('res.explanation')}</p>
                                                    <p style={{ color: 'var(--text)', fontSize: '0.875rem', lineHeight: 1.6 }}>{q.explanation}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Recommendations */}
                {test.recommendations?.length > 0 && (
                    <div className="glass" style={{ padding: '24px' }}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px' }}>{t('res.aiRec')}</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {test.recommendations.map((rec, i) => (
                                <div key={i} style={{ background: 'var(--surface2)', borderRadius: '10px', padding: '16px', borderLeft: '3px solid #7c3aed' }}>
                                    <div className="badge badge-purple" style={{ marginBottom: '8px' }}>{rec.topic}</div>
                                    <p style={{ color: 'var(--text)', fontSize: '0.875rem', lineHeight: 1.6 }}>{rec.material}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
