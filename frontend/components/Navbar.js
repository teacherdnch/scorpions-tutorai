'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getUser, clearAuth } from '../lib/auth';
import { useEffect, useState } from 'react';
import { useLang } from '../lib/LangContext';

export default function Navbar() {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState(null);
    const { lang, setLang, theme, toggleTheme, t } = useLang();

    useEffect(() => { setUser(getUser()); }, []);

    function logout() {
        clearAuth();
        router.push('/login');
    }

    if (!user) return null;

    const navLinks = {
        student: [
            { href: '/student/dashboard', label: t('nav.dashboard') },
            { href: '/student/adaptive', label: t('nav.adaptive') },
            { href: '/student/test', label: t('nav.test') },
            { href: '/student/oral', label: '🎙️ Oral Exam' },
        ],
        teacher: [
            { href: '/teacher/dashboard', label: t('nav.dashboard') },
        ],
        admin: [
            { href: '/admin/dashboard', label: t('nav.overview') },
            { href: '/admin/codes', label: t('nav.codes') },
            { href: '/admin/users', label: t('nav.users') },
        ],
    };

    const roleColors = {
        student: { color: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
        teacher: { color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
        admin: { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
    };
    const rc = roleColors[user.role] || roleColors.student;

    return (
        <nav style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(20px) saturate(1.5)',
            WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
            borderBottom: '1px solid var(--border)',
            padding: '0 28px',
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            boxShadow: '0 1px 0 var(--border), var(--shadow-sm)',
        }}>
            {/* Left — Logo + Nav */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
                {/* Logo */}
                <Link href={`/${user.role}/dashboard`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '34px', height: '34px', borderRadius: '10px',
                        background: 'var(--accent2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.1rem', boxShadow: 'var(--shadow-glow)',
                    }}>🧠</div>
                    <span style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.02em',
                        background: 'var(--accent)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                    }}>Tutorai</span>
                </Link>

                {/* Nav links */}
                <div style={{ display: 'flex', gap: '2px' }}>
                    {(navLinks[user.role] || []).map(link => {
                        const isActive = pathname === link.href || pathname?.startsWith(link.href + '/');
                        return (
                            <Link key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
                                <span style={{
                                    display: 'inline-block',
                                    fontFamily: "'Space Grotesk', sans-serif",
                                    fontSize: '0.86rem', fontWeight: '600',
                                    padding: '7px 14px', borderRadius: '9px',
                                    color: isActive ? 'var(--blue)' : 'var(--muted)',
                                    background: isActive ? 'rgba(56,189,248,0.10)' : 'transparent',
                                    border: isActive ? '1px solid rgba(56,189,248,0.2)' : '1px solid transparent',
                                    transition: 'all 0.2s',
                                }}
                                    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--surface2)'; } }}
                                    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.background = 'transparent'; } }}>
                                    {link.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Right — Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

                {/* Theme toggle */}
                <button onClick={toggleTheme}
                    title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
                    style={{
                        background: 'var(--surface2)', border: '1px solid var(--border)',
                        borderRadius: '10px', width: '38px', height: '38px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', fontSize: '1.1rem', transition: 'all 0.2s',
                        color: 'var(--text)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'scale(1)'; }}>
                    {theme === 'dark' ? '☀️' : '🌙'}
                </button>

                {/* Lang toggle */}
                <div style={{
                    display: 'flex', background: 'var(--surface2)',
                    border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden',
                }}>
                    {['en', 'ru'].map(l => (
                        <button key={l} onClick={() => setLang(l)}
                            style={{
                                padding: '6px 12px', border: 'none', cursor: 'pointer',
                                fontFamily: "'Space Grotesk', sans-serif",
                                fontSize: '0.78rem', fontWeight: '700',
                                background: lang === l ? 'rgba(56,189,248,0.2)' : 'transparent',
                                color: lang === l ? 'var(--blue)' : 'var(--muted)',
                                transition: 'all 0.15s',
                            }}>
                            {l === 'en' ? '🇬🇧 EN' : '🇷🇺 RU'}
                        </button>
                    ))}
                </div>

                {/* Divider */}
                <div style={{ width: '1px', height: '28px', background: 'var(--border)', margin: '0 2px' }} />

                {/* User info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        background: 'var(--accent2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.9rem', fontWeight: '800', color: 'white',
                        fontFamily: "'Space Grotesk', sans-serif",
                        boxShadow: 'var(--shadow-glow)',
                    }}>
                        {user.name?.[0]?.toUpperCase()}
                    </div>
                    <div style={{ lineHeight: 1.3 }}>
                        <div style={{
                            fontSize: '0.875rem', fontWeight: '700',
                            fontFamily: "'Space Grotesk', sans-serif",
                        }}>{user.name?.split(' ')[0]}</div>
                        <div style={{
                            fontSize: '0.7rem', fontWeight: '700',
                            color: rc.color,
                            background: rc.bg,
                            padding: '1px 6px', borderRadius: '4px',
                            display: 'inline-block', textTransform: 'uppercase', letterSpacing: '0.06em',
                            fontFamily: "'Space Grotesk', sans-serif",
                        }}>
                            {user.role}
                        </div>
                    </div>
                </div>

                <button onClick={logout} className="btn-secondary"
                    style={{ padding: '7px 16px', fontSize: '0.82rem', borderRadius: '10px' }}>
                    {t('nav.logout')}
                </button>
            </div>
        </nav>
    );
}
