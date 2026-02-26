'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../lib/api';
import { setAuth } from '../../lib/auth';
import { useLang } from '../../lib/LangContext';

export default function LoginPage() {
    const router = useRouter();
    const { t } = useLang();
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError(''); setLoading(true);
        try {
            const { token, user } = await api.login(form);
            setAuth(token, user);
            router.push(`/${user.role}/dashboard`);
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '24px' }}>
            <div style={{ width: '100%', maxWidth: '440px' }}>
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🧠</div>
                    <h1 className="gradient-text" style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '8px' }}>Tutorai</h1>
                    <p style={{ color: 'var(--muted)' }}>{t('login.title')}</p>
                </div>
                <div className="glass" style={{ padding: '40px' }}>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <label className="label">{t('login.email')}</label>
                            <input id="login-email" className="input" type="email" placeholder="you@example.com" value={form.email}
                                onChange={e => setForm({ ...form, email: e.target.value })} required />
                        </div>
                        <div>
                            <label className="label">{t('login.password')}</label>
                            <input id="login-password" className="input" type="password" placeholder="••••••••" value={form.password}
                                onChange={e => setForm({ ...form, password: e.target.value })} required />
                        </div>
                        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '10px 14px', color: '#f87171', fontSize: '0.875rem' }}>{error}</div>}
                        <button id="login-submit" className="btn-primary" type="submit" disabled={loading} style={{ fontSize: '1rem', padding: '16px' }}>
                            {loading ? t('login.loading') : t('login.submit')}
                        </button>
                    </form>
                    <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--muted)', fontSize: '0.875rem' }}>
                        {t('login.noAccount')}{' '}
                        <Link href="/register" style={{ color: '#a78bfa', fontWeight: '600', textDecoration: 'none' }}>{t('login.register')}</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
