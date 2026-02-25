'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import { api } from '../../../lib/api';
import { getUser } from '../../../lib/auth';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell
} from 'recharts';

const COLORS = ['#ef4444', '#f59e0b', '#7c3aed', '#2563eb', '#10b981'];

export default function StudentDashboard() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const u = getUser();
        if (!u) return router.replace('/login');
        if (u.role !== 'student') return router.replace(`/${u.role}/dashboard`);
        setUser(u);
        api.getTestProgress().then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
    }, [router]);

    if (loading) return (
        <div>
            <Navbar />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 64px)' }}>
                <div className="spinner" />
            </div>
        </div>
    );

    const trendData = (data?.trend || []).map((t, i) => ({
        name: `Test ${i + 1}`,
        score: t.percentage,
        subject: t.subject_name,
    }));

    const weakTopicsData = (data?.weakTopics || []).map(t => ({
        topic: t.topic?.length > 15 ? t.topic.slice(0, 15) + '…' : t.topic,
        wrong: t.wrong_count,
    }));

    const avg = data?.avgScore ?? 0;
    const avgColor = avg >= 80 ? '#10b981' : avg >= 60 ? '#f59e0b' : '#ef4444';

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
            <Navbar />
            <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
                {/* Header */}
                <div className="fade-in" style={{ marginBottom: '32px' }}>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '6px' }}>
                        Welcome back, <span className="gradient-text">{user?.name?.split(' ')[0]}</span> 👋
                    </h1>
                    <p style={{ color: 'var(--muted)' }}>Here's your learning progress at a glance</p>
                </div>

                {/* Stat cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                    {[
                        { label: 'Tests Taken', value: data?.totalTests ?? 0, icon: '📝', color: '#7c3aed' },
                        { label: 'Average Score', value: `${avg}%`, icon: '🎯', color: avgColor },
                        { label: 'Weak Topics', value: data?.weakTopics?.length ?? 0, icon: '⚠️', color: '#f59e0b' },
                        { label: 'Recommendations', value: data?.recommendations?.length ?? 0, icon: '💡', color: '#2563eb' },
                    ].map(card => (
                        <div key={card.label} className="stat-card fade-in">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <p style={{ color: 'var(--muted)', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{card.label}</p>
                                    <p style={{ fontSize: '2rem', fontWeight: '800', color: card.color }}>{card.value}</p>
                                </div>
                                <span style={{ fontSize: '1.8rem' }}>{card.icon}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                    {/* Score trend */}
                    <div className="glass" style={{ padding: '24px' }}>
                        <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '20px' }}>Score Trend</h2>
                        {trendData.length === 0 ? (
                            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px 0' }}>
                                <p style={{ fontSize: '2rem', marginBottom: '8px' }}>📊</p>
                                <p>No tests yet. Take your first test!</p>
                                <button className="btn-primary" style={{ marginTop: '16px' }} onClick={() => router.push('/student/test')}>
                                    Start Test
                                </button>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={220}>
                                <LineChart data={trendData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(124,58,237,0.1)" />
                                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
                                    <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 12 }} />
                                    <Tooltip
                                        contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text)' }}
                                        formatter={(v) => [`${v}%`, 'Score']}
                                    />
                                    <Line type="monotone" dataKey="score" stroke="#7c3aed" strokeWidth={2.5} dot={{ fill: '#7c3aed', r: 4 }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    {/* Weak topics */}
                    <div className="glass" style={{ padding: '24px' }}>
                        <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '20px' }}>Weak Topics</h2>
                        {weakTopicsData.length === 0 ? (
                            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px 0' }}>
                                <p style={{ fontSize: '2rem', marginBottom: '8px' }}>🌟</p>
                                <p>No weak topics found. Keep it up!</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={weakTopicsData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(124,58,237,0.1)" />
                                    <XAxis type="number" tick={{ fill: '#64748b', fontSize: 12 }} />
                                    <YAxis dataKey="topic" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} width={100} />
                                    <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text)' }} />
                                    <Bar dataKey="wrong" radius={[0, 4, 4, 0]}>
                                        {weakTopicsData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Recommendations */}
                {data?.recommendations?.length > 0 && (
                    <div className="glass" style={{ padding: '24px', marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '16px' }}>💡 AI Study Recommendations</h2>
                        <div style={{ display: 'grid', gap: '12px' }}>
                            {data.recommendations.map((rec, i) => (
                                <div key={i} style={{
                                    background: 'var(--surface2)',
                                    borderRadius: '10px',
                                    padding: '16px',
                                    borderLeft: '3px solid var(--purple)',
                                }}>
                                    <div className="badge badge-purple" style={{ marginBottom: '6px' }}>{rec.topic}</div>
                                    <p style={{ color: 'var(--text)', fontSize: '0.9rem', lineHeight: 1.5 }}>{rec.material}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* CTA */}
                <div style={{ textAlign: 'center', padding: '32px' }}>
                    <button className="btn-primary" style={{ fontSize: '1rem', padding: '16px 40px' }} onClick={() => router.push('/student/test')}>
                        🚀 Take a New Test
                    </button>
                </div>
            </main>
        </div>
    );
}
