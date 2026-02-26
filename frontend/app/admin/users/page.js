'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import { api } from '../../../lib/api';
import { getUser } from '../../../lib/auth';
import { useLang } from '../../../lib/LangContext';

export default function AdminUsers() {
    const router = useRouter();
    const { t } = useLang();
    const [users, setUsers] = useState([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const u = getUser();
        if (!u) return router.replace('/login');
        if (u.role !== 'admin') return router.replace(`/${u.role}/dashboard`);
        api.getUsers().then(d => { setUsers(d || []); setLoading(false); }).catch(() => setLoading(false));
    }, [router]);

    const filtered = filter === 'all' ? users : users.filter(u => u.role === filter);
    const roleColor = { student: '#60a5fa', teacher: '#34d399', admin: '#f59e0b' };
    const FILTERS = [
        { key: 'all', label: t('au.all') },
        { key: 'student', label: t('au.student') },
        { key: 'teacher', label: t('au.teacher') },
        { key: 'admin', label: t('au.admin') },
    ];

    if (loading) return (<div><Navbar /><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 64px)' }}><div className="spinner" /></div></div>);

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
            <Navbar />
            <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '6px' }}>{t('au.title')}</h1>
                        <p style={{ color: 'var(--muted)' }}>{users.length} {t('au.total')}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {FILTERS.map(f => (
                            <button key={f.key} onClick={() => setFilter(f.key)}
                                style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${filter === f.key ? 'var(--purple)' : 'var(--border)'}`, background: filter === f.key ? 'rgba(124,58,237,0.15)' : 'var(--surface2)', color: filter === f.key ? '#a78bfa' : 'var(--muted)', cursor: 'pointer', fontFamily: 'Inter,sans-serif', fontSize: '0.85rem', fontWeight: '600', transition: 'all 0.15s' }}>
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="glass" style={{ padding: '24px' }}>
                    {filtered.length === 0 ? (
                        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '40px' }}>{t('au.noUsers')}</p>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    {[t('au.name'), t('au.email'), t('au.role'), t('au.joined')].map(h => (
                                        <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(u => (
                                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <td style={{ padding: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '700', color: 'white', flexShrink: 0 }}>
                                                {u.name?.[0]?.toUpperCase()}
                                            </div>
                                            {u.name}
                                        </td>
                                        <td style={{ padding: '14px', color: 'var(--muted)', fontSize: '0.875rem' }}>{u.email}</td>
                                        <td style={{ padding: '14px' }}>
                                            <span style={{ color: roleColor[u.role], fontWeight: '600', fontSize: '0.85rem', textTransform: 'capitalize' }}>● {u.role}</span>
                                        </td>
                                        <td style={{ padding: '14px', color: 'var(--muted)', fontSize: '0.875rem' }}>
                                            {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
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
