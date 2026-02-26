'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '../../../../components/Navbar';
import { api } from '../../../../lib/api';
import { getUser } from '../../../../lib/auth';
import { useLang } from '../../../../lib/LangContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// ─── Risk Badge ─────────────────────────────────────────────────────────────
function RiskBadge({ level, index }) {
    const cfg = {
        low: { label: '✅ Low', bg: 'rgba(22,163,74,0.12)', color: '#16a34a', border: 'rgba(22,163,74,0.3)' },
        moderate: { label: '⚠️ Moderate', bg: 'rgba(202,138,4,0.12)', color: '#ca8a04', border: 'rgba(202,138,4,0.3)' },
        high: { label: '🟠 High', bg: 'rgba(234,88,12,0.12)', color: '#ea580c', border: 'rgba(234,88,12,0.3)' },
        critical: { label: '🔴 Critical', bg: 'rgba(220,38,38,0.12)', color: '#dc2626', border: 'rgba(220,38,38,0.3)' },
    }[level] || { label: '—', bg: 'var(--surface2)', color: 'var(--muted)', border: 'var(--border)' };

    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '4px 12px', borderRadius: '999px',
            background: cfg.bg, color: cfg.color,
            border: `1px solid ${cfg.border}`,
            fontSize: '0.78rem', fontWeight: '700',
            fontFamily: "'Space Grotesk', sans-serif",
        }}>
            {cfg.label} {index !== undefined ? `(${index}/100)` : ''}
        </span>
    );
}

// ─── Risk Meter Bar ──────────────────────────────────────────────────────────
function RiskMeter({ value }) {
    const color = value <= 20 ? '#16a34a' : value <= 40 ? '#ca8a04' : value <= 70 ? '#ea580c' : '#dc2626';
    return (
        <div style={{ marginTop: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '4px' }}>
                <span>Risk Index</span><span style={{ color, fontWeight: '700' }}>{value}/100</span>
            </div>
            <div style={{ height: '8px', background: 'var(--surface2)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: '4px', transition: 'width 0.6s ease' }} />
            </div>
        </div>
    );
}

// ─── Signal Row ──────────────────────────────────────────────────────────────
function SignalRow({ icon, label, desc, score }) {
    return (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 16px', background: 'var(--surface2)', borderRadius: '10px', borderLeft: `3px solid ${score > 0 ? '#dc2626' : '#16a34a'}` }}>
            <span style={{ fontSize: '1.3rem' }}>{icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.875rem' }}>{label}</span>
                    <span style={{ fontSize: '0.78rem', fontWeight: '700', color: score > 0 ? '#dc2626' : '#16a34a' }}>
                        {score > 0 ? `+${score} pts` : '✓ Clean'}
                    </span>
                </div>
                <p style={{ color: 'var(--muted)', fontSize: '0.8rem', marginTop: '2px', lineHeight: 1.4 }}>{desc}</p>
            </div>
        </div>
    );
}

export default function StudentDetail() {
    const router = useRouter();
    const { id } = useParams();
    const { t } = useLang();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [adaptiveSessions, setAdaptiveSessions] = useState([]);
    const [selectedReport, setSelectedReport] = useState(null);
    const [reportLoading, setReportLoading] = useState(false);

    useEffect(() => {
        const u = getUser();
        if (!u) return router.replace('/login');
        if (u.role !== 'teacher') return router.replace(`/${u.role}/dashboard`);
        api.getStudentAnalytics(id)
            .then(d => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, [id, router]);

    async function loadReport(sessionId) {
        setReportLoading(true);
        try {
            const report = await api.getAntiCheatReport(sessionId);
            setSelectedReport(report);
        } catch (e) {
            setSelectedReport({ error: 'No report available for this session yet.' });
        } finally {
            setReportLoading(false);
        }
    }

    if (loading) return (<div><Navbar /><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 64px)' }}><div className="spinner" /></div></div>);
    if (!data) return (<div><Navbar /><div style={{ textAlign: 'center', padding: '80px', color: 'var(--muted)' }}>Student not found.</div></div>);

    const scoreData = (data.tests || []).map((test, i) => ({ test: `#${i + 1}`, [t('tsd.score')]: Math.round((test.score / test.total_questions) * 100) }));
    const sessions = data.adaptiveSessions || [];

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
            <Navbar />
            <main style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px' }}>
                <button onClick={() => router.push('/teacher/dashboard')} className="btn-secondary" style={{ marginBottom: '24px', padding: '8px 16px', fontSize: '0.875rem' }}>
                    {t('tsd.back')}
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--accent2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: '800', color: 'white' }}>
                        {data.student?.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.6rem', fontWeight: '800', marginBottom: '4px' }}>{data.student?.name}</h1>
                        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>{data.student?.email} · {data.tests?.length || 0} {t('tsd.tests')}</p>
                    </div>
                </div>

                {/* Score chart */}
                <div className="glass" style={{ padding: '24px', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '20px' }}>{t('tsd.scoreHistory')}</h2>
                    {scoreData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={scoreData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(22,163,74,0.1)" />
                                <XAxis dataKey="test" tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                                <YAxis domain={[0, 100]} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px' }} />
                                <Line type="monotone" dataKey={t('tsd.score')} stroke="var(--purple)" strokeWidth={2} dot={{ fill: 'var(--purple)', r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '40px' }}>{t('tsd.noTests')}</p>}
                </div>

                {/* Recent tests table */}
                <div className="glass" style={{ padding: '24px', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '20px' }}>{t('tsd.recentTests')}</h2>
                    {(data.tests || []).length === 0 ? (
                        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '20px' }}>{t('tsd.noTests')}</p>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    {[t('tsd.date'), t('tsd.score'), t('tsd.difficulty')].map(h => (
                                        <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.tests.slice(0, 10).map((test, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '12px 14px', color: 'var(--muted)', fontSize: '0.875rem' }}>
                                            {test.completed_at ? new Date(test.completed_at).toLocaleDateString() : '—'}
                                        </td>
                                        <td style={{ padding: '12px 14px', fontWeight: '700', color: (test.score / test.total_questions) >= 0.7 ? 'var(--green)' : 'var(--yellow)' }}>
                                            {Math.round((test.score / test.total_questions) * 100)}%
                                        </td>
                                        <td style={{ padding: '12px 14px' }}><span className="badge badge-green">{test.difficulty}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* ── ANTI-CHEAT PANEL ────────────────────────────────────── */}
                <div className="glass" style={{ padding: '24px', marginBottom: '24px', border: '1px solid rgba(220,38,38,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                        <span style={{ fontSize: '1.4rem' }}>🛡️</span>
                        <h2 style={{ fontSize: '1rem', fontWeight: '700' }}>Anti-Cheat Monitor</h2>
                    </div>

                    {sessions.length === 0 ? (
                        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '20px' }}>No adaptive sessions found.</p>
                    ) : (
                        <>
                            {/* Session list with risk badges */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                                {sessions.map((s, i) => (
                                    <div key={s.id} onClick={() => loadReport(s.id)}
                                        style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '12px 16px', background: 'var(--surface2)', borderRadius: '10px',
                                            cursor: 'pointer', border: `1px solid ${selectedReport?.session_id === s.id ? 'rgba(220,38,38,0.4)' : 'var(--border)'}`,
                                            transition: 'all 0.15s',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(220,38,38,0.3)'}
                                        onMouseLeave={e => e.currentTarget.style.borderColor = selectedReport?.session_id === s.id ? 'rgba(220,38,38,0.4)' : 'var(--border)'}>
                                        <div>
                                            <span style={{ fontWeight: '700', fontSize: '0.875rem' }}>Session #{i + 1}</span>
                                            <span style={{ color: 'var(--muted)', fontSize: '0.8rem', marginLeft: '10px' }}>{s.subject}</span>
                                            <span style={{ color: 'var(--muted)', fontSize: '0.75rem', marginLeft: '8px' }}>
                                                {s.started_at ? new Date(s.started_at).toLocaleDateString() : ''}
                                            </span>
                                        </div>
                                        <RiskBadge level={s.risk_level || 'low'} index={s.risk_index !== undefined ? Math.round(s.risk_index) : 0} />
                                    </div>
                                ))}
                            </div>

                            {/* Detailed report */}
                            {reportLoading && <div style={{ textAlign: 'center', padding: '20px' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>}
                            {selectedReport && !reportLoading && (
                                selectedReport.error ? (
                                    <p style={{ color: 'var(--muted)', padding: '12px', textAlign: 'center' }}>{selectedReport.error}</p>
                                ) : (
                                    <div className="fade-in" style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                            <h3 style={{ fontSize: '0.95rem', fontWeight: '700' }}>Detailed Report</h3>
                                            <RiskBadge level={selectedReport.risk_level} index={Math.round(selectedReport.risk_index)} />
                                        </div>

                                        <RiskMeter value={Math.round(selectedReport.risk_index)} />

                                        {/* Stats row */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: '10px', margin: '16px 0' }}>
                                            {[
                                                { label: 'Paste events', value: selectedReport.paste_events, icon: '📋' },
                                                { label: 'Tab switches', value: selectedReport.tab_switches, icon: '🔀' },
                                                { label: 'Speed flags', value: selectedReport.speed_flags, icon: '⚡' },
                                                { label: 'Avg time (s)', value: selectedReport.avg_answer_time_ms ? (selectedReport.avg_answer_time_ms / 1000).toFixed(1) : 0, icon: '⏱️' },
                                                { label: 'Min time (s)', value: selectedReport.min_answer_time_ms ? (selectedReport.min_answer_time_ms / 1000).toFixed(1) : 0, icon: '🏃' },
                                                { label: 'Similarity', value: `${(selectedReport.pattern_similarity * 100).toFixed(0)}%`, icon: '👥' },
                                            ].map(stat => (
                                                <div key={stat.label} style={{ padding: '12px', background: 'var(--surface2)', borderRadius: '10px', textAlign: 'center' }}>
                                                    <div style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{stat.icon}</div>
                                                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text)' }}>{stat.value}</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '2px' }}>{stat.label}</div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Signal breakdown */}
                                        {selectedReport.details?.signals?.length > 0 ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                                                <h4 style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Detected Signals</h4>
                                                {selectedReport.details.signals.map((sig, i) => {
                                                    const icons = { paste: '📋', tab_switch: '🔀', speed: '⚡', spike: '📈', similarity: '👥', identical_run: '🔁' };
                                                    const labels = { paste: 'Copy-Paste Detected', tab_switch: 'Window Switch', speed: 'Speed Anomaly', spike: 'Correctness Spike', similarity: 'Pattern Similarity', identical_run: 'Identical Answer Run' };
                                                    return <SignalRow key={i} icon={icons[sig.type] || '⚠️'} label={labels[sig.type] || sig.type} desc={sig.desc} score={sig.score} />;
                                                })}
                                            </div>
                                        ) : (
                                            <div style={{ padding: '16px', background: 'rgba(22,163,74,0.08)', borderRadius: '10px', textAlign: 'center', color: '#16a34a', fontWeight: '600', marginTop: '12px' }}>
                                                ✅ No suspicious signals detected
                                            </div>
                                        )}
                                    </div>
                                )
                            )}
                        </>
                    )}
                </div>

                {/* Recommendations */}
                {data.recommendations?.length > 0 && (
                    <div className="glass" style={{ padding: '24px' }}>
                        <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '16px' }}>{t('tsd.recommendations')}</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {data.recommendations.slice(0, 5).map((r, i) => (
                                <div key={i} style={{ padding: '14px', background: 'var(--surface2)', borderRadius: '10px', borderLeft: '3px solid var(--purple)' }}>
                                    <div className="badge badge-green" style={{ marginBottom: '6px' }}>{r.topic}</div>
                                    <p style={{ color: 'var(--text)', fontSize: '0.875rem', lineHeight: 1.5 }}>{r.material}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
