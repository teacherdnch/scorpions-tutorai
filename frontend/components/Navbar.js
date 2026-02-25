'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getUser, clearAuth } from '../lib/auth';
import { useEffect, useState } from 'react';

export default function Navbar() {
    const router = useRouter();
    const [user, setUser] = useState(null);

    useEffect(() => { setUser(getUser()); }, []);

    function logout() {
        clearAuth();
        router.push('/login');
    }

    if (!user) return null;

    const navLinks = {
        student: [
            { href: '/student/dashboard', label: 'Dashboard' },
            { href: '/student/test', label: '+ Take Test' },
        ],
        teacher: [
            { href: '/teacher/dashboard', label: 'Dashboard' },
        ],
        admin: [
            { href: '/admin/dashboard', label: 'Overview' },
            { href: '/admin/codes', label: 'Codes' },
            { href: '/admin/users', label: 'Users' },
        ],
    };

    const roleColor = { student: '#60a5fa', teacher: '#34d399', admin: '#f59e0b' };

    return (
        <nav style={{
            background: 'rgba(13,13,20,0.8)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid var(--border)',
            padding: '0 32px',
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 100,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                <Link href={`/${user.role}/dashboard`} style={{ textDecoration: 'none' }}>
                    <span style={{ fontSize: '1.3rem', fontWeight: '800' }}>
                        🧠 <span className="gradient-text">Tutorai</span>
                    </span>
                </Link>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {(navLinks[user.role] || []).map(link => (
                        <Link key={link.href} href={link.href} style={{
                            textDecoration: 'none',
                            color: 'var(--muted)',
                            fontSize: '0.9rem',
                            fontWeight: '500',
                            padding: '6px 14px',
                            borderRadius: '8px',
                            transition: 'all 0.2s',
                        }}
                            onMouseEnter={e => { e.target.style.color = 'var(--text)'; e.target.style.background = 'var(--surface2)'; }}
                            onMouseLeave={e => { e.target.style.color = 'var(--muted)'; e.target.style.background = 'transparent'; }}
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '34px', height: '34px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.85rem', fontWeight: '700', color: 'white',
                    }}>
                        {user.name?.[0]?.toUpperCase()}
                    </div>
                    <div style={{ lineHeight: 1.3 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: '600' }}>{user.name}</div>
                        <div style={{ fontSize: '0.75rem', color: roleColor[user.role] || 'var(--muted)', textTransform: 'capitalize' }}>
                            {user.role}
                        </div>
                    </div>
                </div>
                <button onClick={logout} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                    Logout
                </button>
            </div>
        </nav>
    );
}
