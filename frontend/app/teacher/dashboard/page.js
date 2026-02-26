'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import { api } from '../../../lib/api';
import { getUser } from '../../../lib/auth';
import { useLang } from '../../../lib/LangContext';

export default function TeacherDashboard() {
    const router = useRouter();
    const { t } = useLang();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const u = getUser();
        if (!u) return router.replace('/login');
        if (u.role !== 'teacher') return router.replace(`/${u.role}/dashboard`);
        api.getStudents().then(d => { setStudents(d || []); setLoading(false); }).catch(() => setLoading(false));
    }, [router]);

    const totalTests = students.reduce((s, st) => s + (st.test_count || 0), 0);
    const avgScore = students.length
        ? Math.round(students.reduce((s, st) => s + (st.average_score || 0), 0) / students.length)
        : 0;

    if (loading) return (<div><Navbar /><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 64px)' }}><div className="spinner" /></div></div>);

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
            <Navbar />
            <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '6px' }}>{t('td.title')}</h1>
                <p style={{ color: 'var(--muted)', marginBottom: '32px' }}>{t('td.subtitle')}</p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                    {[
                        { label: t('td.students'), value: students.length, icon: '👨‍🎓', color: '#7c3aed' },
                        { label: t('td.tests'), value: totalTests, icon: '📝', color: '#2563eb' },
                        { label: t('td.avg'), value: `${avgScore}%`, icon: '📊', color: '#10b981' },
                    ].map(c => (
                        <div key={c.label} className="stat-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                    <p style={{ color: 'var(--muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{c.label}</p>
                                    <p style={{ fontSize: '2.2rem', fontWeight: '800', color: c.color }}>{c.value}</p>
                                </div>
                                <span style={{ fontSize: '1.8rem' }}>{c.icon}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="glass" style={{ padding: '24px' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '20px' }}>{t('td.leaderboard')}</h2>
                    {students.length === 0 ? (
                        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '40px' }}>{t('td.noStudents')}</p>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    {[t('td.name'), t('td.email'), t('td.testsTaken'), t('td.avgScore'), t('td.action')].map(h => (
                                        <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((s, i) => (
                                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <td style={{ padding: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: `hsl(${i * 60},60%,35%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '700', color: 'white', flexShrink: 0 }}>
                                                {s.name?.[0]?.toUpperCase()}
                                            </div>
                                            {s.name}
                                        </td>
                                        <td style={{ padding: '14px', color: 'var(--muted)', fontSize: '0.875rem' }}>{s.email}</td>
                                        <td style={{ padding: '14px', fontWeight: '600' }}>{s.test_count || 0}</td>
                                        <td style={{ padding: '14px' }}>
                                            <span style={{ color: (s.average_score || 0) >= 70 ? '#10b981' : '#f59e0b', fontWeight: '700' }}>{Math.round(s.average_score || 0)}%</span>
                                        </td>
                                        <td style={{ padding: '14px' }}>
                                            <button className="btn-secondary" onClick={() => router.push(`/teacher/student/${s.id}`)} style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
                                                {t('td.analytics')}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>
        </div>
    );
}
