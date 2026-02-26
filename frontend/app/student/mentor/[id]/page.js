'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '../../../../components/Navbar';
import { api } from '../../../../lib/api';
import { getUser } from '../../../../lib/auth';
import { useLang } from '../../../../lib/LangContext';

// ─── Mini animated typing indicator ─────────────────────────────────────────
function Typing() {
    return (
        <span style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
            {[0, 1, 2].map(i => (
                <span key={i} style={{
                    width: '6px', height: '6px', borderRadius: '50%', background: '#a78bfa',
                    animation: 'bounce 1.2s infinite', animationDelay: `${i * 0.2}s`,
                }} />
            ))}
        </span>
    );
}

// ─── Accordion topic card ─────────────────────────────────────────────────────
function TopicCard({ topic, index, color }) {
    const [open, setOpen] = useState(index === 0);
    const { t } = useLang();
    return (
        <div style={{ border: `1px solid ${color}30`, borderRadius: '12px', overflow: 'hidden', marginBottom: '12px' }}>
            <button onClick={() => setOpen(o => !o)}
                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: open ? `${color}12` : 'var(--surface2)', border: 'none', cursor: 'pointer', fontFamily: 'Inter,sans-serif', textAlign: 'left', transition: 'background 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.2rem' }}>📌</span>
                    <span style={{ fontWeight: '700', color: 'var(--text)', fontSize: '0.95rem' }}>{topic.topic}</span>
                </div>
                <span style={{ color: 'var(--muted)', fontSize: '1.1rem', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
            </button>
            {open && (
                <div style={{ padding: '0 20px 20px', background: `${color}08` }}>
                    {topic.errorPattern && (
                        <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', marginBottom: '12px', marginTop: '12px', fontSize: '0.85rem', color: '#f87171' }}>
                            <strong>{t('men.mistake')}</strong> {topic.errorPattern}
                        </div>
                    )}
                    <p style={{ color: 'var(--text)', lineHeight: 1.7, marginBottom: '12px', fontSize: '0.9rem' }}>
                        <strong style={{ color }}>{t('men.explanation')}</strong><br />{topic.explanation}
                    </p>
                    {topic.analogy && (
                        <div style={{ padding: '12px 16px', background: 'rgba(124,58,237,0.08)', borderLeft: `3px solid ${color}`, borderRadius: '0 8px 8px 0', marginBottom: '12px', fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--text)' }}>
                            <strong>{t('men.analogy')}</strong> {topic.analogy}
                        </div>
                    )}
                    {topic.tip && (
                        <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', fontSize: '0.85rem', color: '#34d399' }}>
                            <strong>{t('men.tip')}</strong> {topic.tip}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Mini-test component ──────────────────────────────────────────────────────
function MiniTest({ questions, onComplete }) {
    const [qi, setQi] = useState(0);
    const [selected, setSelected] = useState(null);
    const [revealed, setRevealed] = useState(false);
    const [score, setScore] = useState(0);
    const [done, setDone] = useState(false);
    const { t } = useLang();

    const q = questions[qi];

    function choose(opt) { if (revealed) return; setSelected(opt); }
    function confirm() { if (!selected) return; setRevealed(true); if (selected === q.correct_answer) setScore(s => s + 1); }
    function next() {
        if (qi + 1 >= questions.length) { setDone(true); onComplete(score + (selected === q.correct_answer ? 1 : 0)); }
        else { setQi(i => i + 1); setSelected(null); setRevealed(false); }
    }
    if (done) return null;
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.85rem', color: 'var(--muted)' }}>
                <span>{t('test.question')} {qi + 1} / {questions.length}</span>
                <span>{t('men.miniScore')} {score}</span>
            </div>
            <div style={{ height: '4px', background: 'var(--surface2)', borderRadius: '2px', marginBottom: '20px', overflow: 'hidden' }}>
                <div style={{ width: `${(qi / questions.length) * 100}%`, height: '100%', background: 'linear-gradient(90deg,#7c3aed,#2563eb)', transition: 'width 0.3s' }} />
            </div>
            <p style={{ fontWeight: '600', lineHeight: 1.65, marginBottom: '20px' }}>{q.question}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                {(q.options || []).map((opt, i) => {
                    let bg = 'var(--surface2)', border = 'var(--border)', color = 'var(--text)';
                    if (revealed) {
                        if (opt === q.correct_answer) { bg = 'rgba(16,185,129,0.15)'; border = '#10b981'; color = '#34d399'; }
                        else if (opt === selected && opt !== q.correct_answer) { bg = 'rgba(239,68,68,0.12)'; border = '#ef4444'; color = '#f87171'; }
                    } else if (selected === opt) { bg = 'rgba(124,58,237,0.15)'; border = 'var(--purple)'; color = '#a78bfa'; }
                    return (
                        <button key={i} onClick={() => choose(opt)}
                            style={{ textAlign: 'left', padding: '13px 18px', borderRadius: '10px', border: `1px solid ${border}`, background: bg, color, cursor: revealed ? 'default' : 'pointer', fontFamily: 'Inter,sans-serif', fontSize: '0.875rem', transition: 'all 0.15s', fontWeight: opt === selected || (revealed && opt === q.correct_answer) ? '600' : '400' }}>
                            <span style={{ color: 'var(--muted)', marginRight: '8px' }}>{String.fromCharCode(65 + i)}.</span>{opt}
                        </button>
                    );
                })}
            </div>
            {revealed && q.explanation && (
                <div style={{ padding: '12px 16px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px', fontSize: '0.85rem', color: '#34d399', lineHeight: 1.6, marginBottom: '16px' }}>
                    💡 {q.explanation}
                </div>
            )}
            {!revealed
                ? <button className="btn-primary" onClick={confirm} disabled={!selected} style={{ width: '100%' }}>{t('men.check')}</button>
                : <button className="btn-primary" onClick={next} style={{ width: '100%' }}>
                    {qi + 1 >= questions.length ? t('men.finishMini') : t('men.nextQ')}
                </button>
            }
        </div>
    );
}

// ─── Week plan card ───────────────────────────────────────────────────────────
function WeekCard({ week }) {
    const colors = ['#7c3aed', '#2563eb', '#10b981'];
    const c = colors[(week.week - 1) % 3];
    return (
        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
            <div style={{ flexShrink: 0, width: '48px', height: '48px', borderRadius: '12px', background: `${c}20`, border: `1px solid ${c}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: '800', color: c }}>W{week.week}</div>
            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '700', marginBottom: '4px' }}>{week.title}</div>
                {week.goal && <div style={{ fontSize: '0.8rem', color: '#a78bfa', marginBottom: '8px' }}>🎯 {week.goal}</div>}
                <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {(week.tasks || []).map((t, i) => (
                        <li key={i} style={{ color: 'var(--muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>{t}</li>
                    ))}
                </ul>
                {week.duration && <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--muted)' }}>⏱ {week.duration}</div>}
            </div>
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function MentorPage() {
    const router = useRouter();
    const { id } = useParams();
    const { t } = useLang();
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [phase, setPhase] = useState('analysis'); // analysis | topics | minitest | plan
    const [miniScore, setMiniScore] = useState(null);

    useEffect(() => {
        const u = getUser();
        if (!u) return router.replace('/login');
        if (u.role !== 'student') return router.replace(`/${u.role}/dashboard`);

        api.getMentorSession(id)
            .then(d => { setSession(d); setLoading(false); })
            .catch(() => { setLoading(false); });
    }, [id, router]);

    if (loading) return (
        <div><Navbar />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 64px)', gap: '20px' }}>
                <div className="spinner" style={{ width: '52px', height: '52px', borderWidth: '4px' }} />
                <p style={{ color: 'var(--muted)' }}>{t('men.loading')}</p>
            </div>
        </div>
    );

    if (!session) return (
        <div><Navbar />
            <div style={{ textAlign: 'center', padding: '80px 24px' }}>
                <p style={{ fontSize: '2rem' }}>😕</p>
                <p style={{ color: 'var(--muted)' }}>{t('men.notFound')}</p>
                <button className="btn-secondary" onClick={() => router.push('/student/dashboard')} style={{ marginTop: '16px' }}>{t('men.back')}</button>
            </div>
        </div>
    );

    const { analysis } = session;
    const weakTopics = analysis?.weakTopics || [];
    const studyPlan = analysis?.studyPlan || [];
    const miniQuestions = analysis?.miniTest || [];

    const PHASES = [
        { key: 'analysis', label: t('men.tabAnalysis') },
        { key: 'topics', label: t('men.tabTopics') },
        { key: 'minitest', label: t('men.tabMini') },
        { key: 'plan', label: t('men.tabPlan') },
    ];

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
            <style>{`@keyframes bounce { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }`}</style>
            <Navbar />
            <main style={{ maxWidth: '820px', margin: '0 auto', padding: '32px 24px' }}>

                {/* Header */}
                <div style={{ marginBottom: '28px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '2rem' }}>🧠</span>
                        <div>
                            <h1 style={{ fontSize: '1.6rem', fontWeight: '800', lineHeight: 1.2 }}>{t('men.session')}</h1>
                            <p style={{ color: '#a78bfa', fontSize: '0.85rem', marginTop: '2px' }}>{t('men.subject')} {session.subject}</p>
                        </div>
                    </div>
                    {analysis?.overallAnalysis && (
                        <div style={{ padding: '16px 20px', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '12px', color: 'var(--text)', lineHeight: 1.7, fontSize: '0.9rem' }}>
                            {analysis.overallAnalysis}
                        </div>
                    )}
                </div>

                {/* Phase tabs */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '24px', flexWrap: 'wrap' }}>
                    {PHASES.map((p, i) => {
                        const isActive = phase === p.key;
                        const isPast = PHASES.findIndex(x => x.key === phase) > i;
                        return (
                            <button key={p.key} onClick={() => setPhase(p.key)}
                                style={{ padding: '8px 16px', borderRadius: '999px', border: `1px solid ${isActive ? 'var(--purple)' : isPast ? '#10b98150' : 'var(--border)'}`, background: isActive ? 'rgba(124,58,237,0.15)' : isPast ? 'rgba(16,185,129,0.08)' : 'var(--surface2)', color: isActive ? '#a78bfa' : isPast ? '#34d399' : 'var(--muted)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600', fontFamily: 'Inter,sans-serif', transition: 'all 0.15s' }}>
                                {isPast && !isActive ? '✓ ' : ''}{p.label}
                            </button>
                        );
                    })}
                </div>

                {/* ── ANALYSIS ── */}
                {phase === 'analysis' && (
                    <div className="fade-in">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: '16px', marginBottom: '28px' }}>
                            {[
                                { label: t('men.weakCount'), value: weakTopics.length, icon: '⚠️', color: '#f59e0b' },
                                { label: t('men.miniCount'), value: miniQuestions.length, icon: '🎯', color: '#7c3aed' },
                                { label: t('men.weekCount'), value: studyPlan.length, icon: '📅', color: '#2563eb' },
                            ].map(c => (
                                <div key={c.label} className="stat-card">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <p style={{ color: 'var(--muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{c.label}</p>
                                            <p style={{ fontSize: '2rem', fontWeight: '800', color: c.color }}>{c.value}</p>
                                        </div>
                                        <span style={{ fontSize: '1.6rem' }}>{c.icon}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="btn-primary" onClick={() => setPhase('topics')} style={{ fontSize: '1rem', padding: '16px', width: '100%' }}>
                            {t('men.goTopics')}
                        </button>
                    </div>
                )}

                {/* ── WEAK TOPICS ── */}
                {phase === 'topics' && (
                    <div className="fade-in">
                        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px' }}>
                            {t('men.weakTitle')} ({weakTopics.length})
                        </h2>
                        {weakTopics.length === 0
                            ? <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>{t('men.noTopics')}</div>
                            : weakTopics.map((t, i) => (
                                <TopicCard key={i} topic={t} index={i} color={['#7c3aed', '#2563eb', '#f59e0b', '#10b981'][i % 4]} />
                            ))
                        }
                        <button className="btn-primary" onClick={() => setPhase('minitest')} style={{ fontSize: '1rem', padding: '16px', width: '100%', marginTop: '8px' }}>
                            {t('men.miniTitle')} →
                        </button>
                    </div>
                )}

                {/* ── MINI-TEST ── */}
                {phase === 'minitest' && (
                    <div className="fade-in">
                        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '4px' }}>{t('men.miniTitle')}</h2>
                        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '20px' }}>{t('men.miniDesc')}</p>
                        <div className="glass" style={{ padding: '28px' }}>
                            {miniScore === null
                                ? <MiniTest questions={miniQuestions} onComplete={(s) => { setMiniScore(s); }} />
                                : (
                                    <div style={{ textAlign: 'center', padding: '20px 0' }} className="fade-in">
                                        <div style={{ fontSize: '3rem', marginBottom: '12px' }}>
                                            {miniScore === miniQuestions.length ? '🏆' : miniScore >= miniQuestions.length / 2 ? '⭐' : '💪'}
                                        </div>
                                        <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '8px' }}>
                                            {miniScore} / {miniQuestions.length} {t('men.miniScore')}
                                        </h3>
                                        <p style={{ color: 'var(--muted)', marginBottom: '24px' }}>
                                            {miniScore === miniQuestions.length ? t('men.perfect') : miniScore >= miniQuestions.length / 2 ? t('men.good') : t('men.keep')}
                                        </p>
                                        <button className="btn-primary" onClick={() => setPhase('plan')} style={{ fontSize: '1rem', padding: '16px 40px' }}>
                                            {t('men.goPlan')}
                                        </button>
                                    </div>
                                )
                            }
                        </div>
                    </div>
                )}

                {/* ── STUDY PLAN ── */}
                {phase === 'plan' && (
                    <div className="fade-in">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div>
                                <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '4px' }}>{t('men.planTitle')}</h2>
                                <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>{t('men.planDesc')}</p>
                            </div>
                            <span style={{ fontSize: '1.5rem' }}>🗓️</span>
                        </div>
                        <div className="glass" style={{ padding: '28px', marginBottom: '20px' }}>
                            {studyPlan.length === 0
                                ? <p style={{ color: 'var(--muted)', textAlign: 'center' }}>{t('men.noPlan')}</p>
                                : studyPlan.map((w, i) => <WeekCard key={i} week={w} />)
                            }
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button className="btn-primary" onClick={() => router.push('/student/adaptive')} style={{ flex: 1 }}>
                                {t('men.retake')}
                            </button>
                            <button className="btn-secondary" onClick={() => router.push('/student/dashboard')} style={{ flex: 1 }}>
                                {t('men.dashboard')}
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
