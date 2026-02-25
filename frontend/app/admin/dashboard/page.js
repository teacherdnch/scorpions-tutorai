'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import { api } from '../../../lib/api';
import { getUser } from '../../../lib/auth';

export default function AdminDashboard() {
    const router = useRouter();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const u = getUser();
        if (!u) return router.replace('/login');
        if (u.role !== 'admin') return router.replace(`/${u.role}/dashboard`);
        api.getAdminStats().then(d => { setStats(d); setLoading(false); }).catch(() => setLoading(false));
    }, [router]);

    if (loading) return <div><Navbar /><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 64px)' }}><div className="spinner" /></div></div>;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
            <Navbar />
            <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>
                <div className="fade-in" style={{ marginBottom: '32px' }}>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '6px' }}>
                        👑 <span className="gradient-text">Admin Overview</span>
                    </h1>
                    <p style={{ color: 'var(--muted)' }}>System health and global statistics</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                    {[
                        { label: 'Total Users', value: stats?.users ?? 0, icon: '👥', color: '#7c3aed' },
                        { label: 'Tests Taken', value: stats?.tests ?? 0, icon: '📝', color: '#2563eb' },
                        { label: 'AI Calls Made', value: stats?.tests ?? 0, icon: '🤖', color: '#10b981', note: 'est. (2 per test)' },
                    ].map(c => (
                        <div key={c.label} className="stat-card fade-in">
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                    <p style={{ color: 'var(--muted)', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{c.label}</p>
                                    <p style={{ fontSize: '2.2rem', fontWeight: '800', color: c.color }}>{c.value}</p>
                                    {c.note && <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: '4px' }}>{c.note}</p>}
                                </div>
                                <span style={{ fontSize: '2rem' }}>{c.icon}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Quick links */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '32px' }}>
                    {[
                        { href: '/admin/codes', title: '🔑 Teacher Codes', desc: 'Generate and manage teacher registration codes', color: '#7c3aed' },
                        { href: '/admin/users', title: '👤 User Management', desc: 'View all users and their roles', color: '#2563eb' },
                    ].map(link => (
                        <button key={link.href} onClick={() => router.push(link.href)}
                            className="glass"
                            style={{ padding: '28px', textAlign: 'left', cursor: 'pointer', border: `1px solid ${link.color}30`, transition: 'border-color 0.2s, transform 0.2s', background: 'none' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = link.color; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = `${link.color}30`; e.currentTarget.style.transform = 'translateY(0)'; }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '8px', color: link.color }}>{link.title}</h3>
                            <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>{link.desc}</p>
                        </button>
                    ))}
                </div>
            </main>
        </div>
    );
}
