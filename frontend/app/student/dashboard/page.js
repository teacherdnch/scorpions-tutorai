'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import { api } from '../../../lib/api';
import { getUser } from '../../../lib/auth';
import { useLang } from '../../../lib/LangContext';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell,
} from 'recharts';

export default function StudentDashboard() {
    const router = useRouter();
    const { t } = useLang();
    const [progress, setProgress] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const u = getUser();
        if (!u) return router.replace('/login');
        if (u.role !== 'student') return router.replace(`/${u.role}/dashboard`);
        setUser(u);
        api.getTestProgress()
            .then(d => { setProgress(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, [router]);

    if (loading) return (
        <div><Navbar />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 64px)' }}>
                <div className="spinner" />
            </div>
        </div>
    );

    const statCards = [
        { label: t('sd.testsTaken'), value: progress?.totalTests ?? 0, icon: '📝', color: '#7c3aed' },
        { label: t('sd.avgScore'), value: progress?.averageScore != null ? `${progress.averageScore}%` : '—', icon: '📊', color: '#2563eb' },
        { label: t('sd.weakTopics'), value: progress?.weakTopics?.length ?? 0, icon: '🎯', color: '#f59e0b' },
        { label: t('sd.recommendations'), value: progress?.recommendations?.length ?? 0, icon: '💡', color: '#10b981' },
    ];

    const scoreTrendData = (progress?.scoreTrend || []).map((s, i) => ({ test: `#${i + 1}`, [t('sd.score')]: s }));
    const weakTopicsData = (progress?.weakTopics || []).map(w => ({ topic: w.topic, [t('sd.wrongCount')]: w.wrongCount }));
    const COLORS = ['#7c3aed', '#2563eb', '#f59e0b', '#10b981', '#ef4444'];

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
            <Navbar />
            <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' }}>
                <div style={{ marginBottom: '32px' }}>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '6px' }}>
                        {t('sd.welcome')}, {user?.name?.split(' ')[0]} 👋
                    </h1>
                    <p style={{ color: 'var(--muted)' }}>{t('sd.subtitle')}</p>
                </div>

                {/* Stat cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                    {statCards.map(c => (
                        <div key={c.label} className="stat-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <p style={{ color: 'var(--muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{c.label}</p>
                                    <p style={{ fontSize: '2.2rem', fontWeight: '800', color: c.color }}>{c.value}</p>
                                </div>
                                <span style={{ fontSize: '1.8rem' }}>{c.icon}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {progress?.totalTests > 0 ? (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                            {/* Score trend */}
                            <div className="glass" style={{ padding: '24px' }}>
                                <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '20px' }}>{t('sd.scoreTrend')}</h2>
                                <ResponsiveContainer width="100%" height={200}>
                                    <LineChart data={scoreTrendData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(124,58,237,0.1)" />
                                        <XAxis dataKey="test" tick={{ fill: '#64748b', fontSize: 11 }} />
                                        <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} />
                                        <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px' }} />
                                        <Line type="monotone" dataKey={t('sd.score')} stroke="#7c3aed" strokeWidth={2} dot={{ fill: '#7c3aed', r: 4 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                            {/* Weak topics */}
                            <div className="glass" style={{ padding: '24px' }}>
                                <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '20px' }}>{t('sd.weakTopicsChart')}</h2>
                                {weakTopicsData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={200}>
                                        <BarChart data={weakTopicsData} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(124,58,237,0.1)" />
                                            <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
                                            <YAxis type="category" dataKey="topic" tick={{ fill: '#64748b', fontSize: 11 }} width={80} />
                                            <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px' }} />
                                            <Bar dataKey={t('sd.wrongCount')} radius={[0, 4, 4, 0]}>
                                                {weakTopicsData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : <p style={{ color: 'var(--muted)', textAlign: 'center', paddingTop: '60px' }}>—</p>}
                            </div>
                        </div>

                        {/* Recommendations */}
                        <div className="glass" style={{ padding: '24px' }}>
                            <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '16px' }}>{t('sd.aiRec')}</h2>
                            {progress?.recommendations?.length > 0 ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                                    {progress.recommendations.map((r, i) => (
                                        <div key={i} style={{ padding: '16px', background: 'var(--surface2)', borderRadius: '10px', borderLeft: '3px solid #7c3aed' }}>
                                            <div className="badge badge-purple" style={{ marginBottom: '8px' }}>{r.topic}</div>
                                            <p style={{ color: 'var(--text)', fontSize: '0.875rem', lineHeight: 1.5 }}>{r.material}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>{t('sd.noRec')}</p>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="glass" style={{ padding: '60px', textAlign: 'center' }}>
                        <p style={{ fontSize: '3rem', marginBottom: '16px' }}>🚀</p>
                        <p style={{ color: 'var(--muted)', marginBottom: '24px' }}>{t('sd.noTests')}</p>
                        <button className="btn-primary" onClick={() => router.push('/student/test')}>{t('sd.takeTest')}</button>
                    </div>
                )}
            </main>
        </div>
    );
}
