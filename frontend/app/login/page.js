'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../lib/api';
import { setAuth } from '../../lib/auth';

export default function LoginPage() {
    const router = useRouter();
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { token, user } = await api.login(form);
            setAuth(token, user);
            router.push(`/${user.role}/dashboard`);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'var(--bg)' }}>
            {/* Background orbs */}
            <div style={{ position: 'fixed', top: '-20%', left: '-10%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'fixed', bottom: '-20%', right: '-10%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <div className="glass fade-in" style={{ width: '100%', maxWidth: '420px', padding: '48px 40px' }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '36px' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🧠</div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '6px' }}>
                        <span className="gradient-text">Tutorai</span>
                    </h1>
                    <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Sign in to your account</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <div>
                        <label className="label">Email</label>
                        <input
                            id="login-email"
                            className="input"
                            type="email"
                            placeholder="you@example.com"
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <label className="label">Password</label>
                        <input
                            id="login-password"
                            className="input"
                            type="password"
                            placeholder="••••••••"
                            value={form.password}
                            onChange={e => setForm({ ...form, password: e.target.value })}
                            required
                        />
                    </div>

                    {error && (
                        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '10px 14px', color: '#f87171', fontSize: '0.875rem' }}>
                            {error}
                        </div>
                    )}

                    <button id="login-submit" className="btn-primary" type="submit" disabled={loading} style={{ marginTop: '4px', width: '100%' }}>
                        {loading ? 'Signing in…' : 'Sign In'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '24px', color: 'var(--muted)', fontSize: '0.875rem' }}>
                    No account?{' '}
                    <Link href="/register" style={{ color: '#a78bfa', textDecoration: 'none', fontWeight: '600' }}>
                        Register here
                    </Link>
                </p>
            </div>
        </div>
    );
}
