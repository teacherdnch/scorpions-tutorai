'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import { api } from '../../../lib/api';
import { getUser } from '../../../lib/auth';

const ROLE_BADGE = {
    admin: 'badge-yellow',
    teacher: 'badge-green',
    student: 'badge-blue',
};

export default function AdminUsers() {
    const router = useRouter();
    const [users, setUsers] = useState([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const u = getUser();
        if (!u) return router.replace('/login');
        if (u.role !== 'admin') return router.replace(`/${u.role}/dashboard`);
        api.getUsers().then(d => { setUsers(d); setLoading(false); }).catch(() => setLoading(false));
    }, [router]);

    const filtered = filter === 'all' ? users : users.filter(u => u.role === filter);

    if (loading) return <div><Navbar /><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 64px)' }}><div className="spinner" /></div></div>;

    const counts = {
        all: users.length,
        admin: users.filter(u => u.role === 'admin').length,
        teacher: users.filter(u => u.role === 'teacher').length,
        student: users.filter(u => u.role === 'student').length,
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
            <Navbar />
            <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 24px' }}>
                <div style={{ marginBottom: '32px' }}>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '6px' }}>👤 User Management</h1>
                    <p style={{ color: 'var(--muted)' }}>{users.length} total registered users</p>
                </div>

                {/* Filter tabs */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                    {['all', 'student', 'teacher', 'admin'].map(r => (
                        <button key={r} id={`filter-${r}`}
                            onClick={() => setFilter(r)}
                            style={{
                                padding: '7px 18px',
                                borderRadius: '999px',
                                border: `1px solid ${filter === r ? 'var(--purple)' : 'var(--border)'}`,
                                background: filter === r ? 'rgba(124,58,237,0.15)' : 'var(--surface2)',
                                color: filter === r ? '#a78bfa' : 'var(--muted)',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                fontFamily: 'Inter, sans-serif',
                                transition: 'all 0.15s',
                            }}>
                            {r.charAt(0).toUpperCase() + r.slice(1)} ({counts[r]})
                        </button>
                    ))}
                </div>

                <div className="glass" style={{ padding: '24px' }}>
                    {filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>
                            <p style={{ fontSize: '2rem', marginBottom: '8px' }}>👤</p>
                            <p>No {filter === 'all' ? '' : filter} users found.</p>
                        </div>
                    ) : (
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Joined</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(u => (
                                    <tr key={u.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{
                                                    width: '32px', height: '32px', borderRadius: '50%',
                                                    background: 'linear-gradient(135deg,#7c3aed,#2563eb)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '0.8rem', fontWeight: '700', color: 'white', flexShrink: 0,
                                                }}>{u.name?.[0]?.toUpperCase()}</div>
                                                <span style={{ fontWeight: '600' }}>{u.name}</span>
                                            </div>
                                        </td>
                                        <td style={{ color: 'var(--muted)' }}>{u.email}</td>
                                        <td><span className={`badge ${ROLE_BADGE[u.role] || 'badge-purple'}`}>{u.role}</span></td>
                                        <td style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                                            {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
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
