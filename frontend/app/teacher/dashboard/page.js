'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../../components/Navbar';
import { api } from '../../../lib/api';
import { getUser } from '../../../lib/auth';

export default function TeacherDashboard() {
    const router = useRouter();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const u = getUser();
        if (!u) return router.replace('/login');
        if (u.role !== 'teacher') return router.replace(`/${u.role}/dashboard`);
        api.getStudents().then(d => { setStudents(d); setLoading(false); }).catch(() => setLoading(false));
    }, [router]);

    const classAvg = students.length > 0
        ? Math.round(students.reduce((s, st) => s + (st.avg_score || 0), 0) / students.length)
        : 0;

    const classAvgPct = students.length > 0
        ? Math.round(students.reduce((s, st) => {
            // avg_score from backend is raw score, not percentage
            return s + (st.avg_score || 0);
        }, 0) / students.length)
        : 0;

    if (loading) return (
        <div><Navbar />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 64px)' }}>
                <div className="spinner" />
            </div>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
            <Navbar />
            <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>
                <div className="fade-in" style={{ marginBottom: '32px' }}>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '6px' }}>
                        👨‍🏫 <span className="gradient-text">Teacher Dashboard</span>
                    </h1>
                    <p style={{ color: 'var(--muted)' }}>Monitor your students' performance and progress</p>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                    {[
                        { label: 'Total Students', value: students.length, icon: '👥', color: '#7c3aed' },
                        { label: 'Total Tests Taken', value: students.reduce((s, st) => s + (st.tests_taken || 0), 0), icon: '📝', color: '#2563eb' },
                        { label: 'Class Avg Score', value: `${classAvgPct}`, icon: '🎯', color: classAvgPct >= 70 ? '#10b981' : '#f59e0b' },
                    ].map(c => (
                        <div key={c.label} className="stat-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                    <p style={{ color: 'var(--muted)', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px' }}>{c.label}</p>
                                    <p style={{ fontSize: '2rem', fontWeight: '800', color: c.color }}>{c.value}</p>
                                </div>
                                <span style={{ fontSize: '1.8rem' }}>{c.icon}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Students table */}
                <div className="glass" style={{ padding: '24px' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '20px' }}>Student Rankings</h2>
                    {students.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>
                            <p style={{ fontSize: '2rem', marginBottom: '8px' }}>📚</p>
                            <p>No students have registered yet.</p>
                        </div>
                    ) : (
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Student</th>
                                    <th>Email</th>
                                    <th>Tests Taken</th>
                                    <th>Avg Score</th>
                                    <th>Analytics</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...students].sort((a, b) => (b.avg_score || 0) - (a.avg_score || 0)).map((st, i) => {
                                    const avg = st.avg_score ? Math.round(st.avg_score) : 0;
                                    const avgColor = avg >= 70 ? '#10b981' : avg >= 50 ? '#f59e0b' : '#ef4444';
                                    return (
                                        <tr key={st.id}>
                                            <td style={{ color: 'var(--muted)', fontWeight: '700' }}>#{i + 1}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{
                                                        width: '32px', height: '32px', borderRadius: '50%',
                                                        background: 'linear-gradient(135deg,#7c3aed,#2563eb)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: '0.8rem', fontWeight: '700', color: 'white', flexShrink: 0,
                                                    }}>{st.name?.[0]?.toUpperCase()}</div>
                                                    <span style={{ fontWeight: '600' }}>{st.name}</span>
                                                </div>
                                            </td>
                                            <td style={{ color: 'var(--muted)' }}>{st.email}</td>
                                            <td>{st.tests_taken ?? 0}</td>
                                            <td style={{ color: avgColor, fontWeight: '700' }}>{avg}</td>
                                            <td>
                                                <Link href={`/teacher/student/${st.id}`} style={{ textDecoration: 'none' }}>
                                                    <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>View →</button>
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>
        </div>
    );
}
