'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../../../components/Navbar';
import { api } from '../../../../lib/api';
import { getUser } from '../../../../lib/auth';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function StudentDetailPage() {
    const router = useRouter();
    const params = useParams();
    const studentId = params.id;
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const u = getUser();
        if (!u) return router.replace('/login');
        if (u.role !== 'teacher') return router.replace(`/${u.role}/dashboard`);
        api.getStudentAnalytics(studentId)
            .then(d => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, [studentId, router]);

    if (loading) return <div><Navbar /><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 64px)' }}><div className="spinner" /></div></div>;

    const trendData = (data?.tests || []).map((t, i) => ({
        name: `Test ${i + 1}`,
        score: t.total_questions ? Math.round(t.score * 100 / t.total_questions) : 0,
    })).reverse();

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
            <Navbar />
            <main style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>
                <div style={{ marginBottom: '24px' }}>
                    <Link href="/teacher/dashboard" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '0.875rem' }}>
                        ← Back to Dashboard
                    </Link>
                </div>

                <h1 style={{ fontSize: '1.6rem', fontWeight: '800', marginBottom: '6px' }}>Student Analytics</h1>
                <p style={{ color: 'var(--muted)', marginBottom: '32px' }}>
                    {data?.tests?.length ?? 0} tests taken
                </p>

                {/* Score trend */}
                <div className="glass" style={{ padding: '24px', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '20px' }}>Score History</h2>
                    {trendData.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>No tests yet.</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(124,58,237,0.1)" />
                                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
                                <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 12 }} />
                                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px' }} formatter={v => [`${v}%`, 'Score']} />
                                <Line type="monotone" dataKey="score" stroke="#7c3aed" strokeWidth={2.5} dot={{ fill: '#7c3aed', r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Test list */}
                <div className="glass" style={{ padding: '24px', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '16px' }}>Recent Tests</h2>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Score</th>
                                <th>Difficulty</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data?.tests || []).map(t => {
                                const pct = t.total_questions ? Math.round(t.score * 100 / t.total_questions) : 0;
                                const c = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';
                                return (
                                    <tr key={t.id}>
                                        <td style={{ color: 'var(--muted)' }}>{new Date(t.completed_at).toLocaleDateString()}</td>
                                        <td style={{ color: c, fontWeight: '700' }}>{pct}%</td>
                                        <td><span className="badge badge-purple">{t.difficulty}</span></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Recommendations */}
                {data?.recommendations?.length > 0 && (
                    <div className="glass" style={{ padding: '24px' }}>
                        <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '16px' }}>💡 Latest Recommendations</h2>
                        {data.recommendations.map((rec, i) => (
                            <div key={i} style={{ background: 'var(--surface2)', borderRadius: '10px', padding: '14px', borderLeft: '3px solid #7c3aed', marginBottom: '10px' }}>
                                <div className="badge badge-purple" style={{ marginBottom: '6px' }}>{rec.topic}</div>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text)', lineHeight: 1.5 }}>{rec.material}</p>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
