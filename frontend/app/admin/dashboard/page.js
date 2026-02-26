'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../../components/Navbar';
import { api } from '../../../lib/api';
import { getUser } from '../../../lib/auth';
import { useLang } from '../../../lib/LangContext';

export default function AdminDashboard() {
    const router = useRouter();
    const { t } = useLang();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const u = getUser();
        if (!u) return router.replace('/login');
        if (u.role !== 'admin') return router.replace(`/${u.role}/dashboard`);
        api.getAdminStats().then(d => { setStats(d); setLoading(false); }).catch(() => setLoading(false));
    }, [router]);

    if (loading) return (<div><Navbar /><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 64px)' }}><div className="spinner" /></div></div>);

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
            <Navbar />
            <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '6px' }}>👑 {t('ad.title')}</h1>
                <p style={{ color: 'var(--muted)', marginBottom: '32px' }}>{t('ad.subtitle')}</p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                    {[
                        { label: t('ad.users'), value: stats?.userCount ?? 0, icon: '👤', color: '#7c3aed' },
                        { label: t('ad.tests'), value: stats?.testCount ?? 0, icon: '📝', color: '#2563eb' },
                        { label: t('ad.ai'), value: (stats?.testCount ?? 0) * 2, icon: '🤖', color: '#10b981', note: t('ad.aiNote') },
                    ].map(c => (
                        <div key={c.label} className="stat-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                    <p style={{ color: 'var(--muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{c.label}</p>
                                    <p style={{ fontSize: '2.2rem', fontWeight: '800', color: c.color }}>{c.value}</p>
                                    {c.note && <p style={{ color: 'var(--muted)', fontSize: '0.7rem', marginTop: '4px' }}>{c.note}</p>}
                                </div>
                                <span style={{ fontSize: '1.8rem' }}>{c.icon}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {[
                        { href: '/admin/codes', title: t('ad.codesTitle'), desc: t('ad.codesDesc'), icon: '🔑', color: '#f59e0b' },
                        { href: '/admin/users', title: t('ad.usersTitle'), desc: t('ad.usersDesc'), icon: '👤', color: '#7c3aed' },
                    ].map(card => (
                        <Link key={card.href} href={card.href} style={{ textDecoration: 'none' }}>
                            <div className="glass" style={{ padding: '28px', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', borderTop: `3px solid ${card.color}` }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 30px ${card.color}20`; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
                                <div style={{ fontSize: '2rem', marginBottom: '12px' }}>{card.icon}</div>
                                <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '6px' }}>{card.title}</h3>
                                <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>{card.desc}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </main>
        </div>
    );
}
