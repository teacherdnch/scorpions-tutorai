'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../lib/api';
import { setAuth } from '../../lib/auth';

export default function RegisterPage() {
    const router = useRouter();
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student', teacherCode: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const payload = { name: form.name, email: form.email, password: form.password, role: form.role };
            if (form.role === 'teacher') payload.teacherCode = form.teacherCode;
            const { token, user } = await api.register(payload);
            setAuth(token, user);
            router.push(`/${user.role}/dashboard`);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    const roles = [
        { value: 'student', label: '👨‍🎓 Student', desc: 'Take AI tests & track progress' },
        { value: 'teacher', label: '👨‍🏫 Teacher', desc: 'View class analytics' },
        { value: 'admin', label: '👑 Admin', desc: 'System management' },
    ];

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'var(--bg)' }}>
            <div style={{ position: 'fixed', top: '-20%', right: '-10%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'fixed', bottom: '-20%', left: '-10%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <div className="glass fade-in" style={{ width: '100%', maxWidth: '460px', padding: '48px 40px' }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🧠</div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '6px' }}>
                        <span className="gradient-text">Create Account</span>
                    </h1>
                    <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Join Tutorai today</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <div>
                        <label className="label">Full Name</label>
                        <input id="reg-name" className="input" type="text" placeholder="John Doe" value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })} required />
                    </div>

                    <div>
                        <label className="label">Email</label>
                        <input id="reg-email" className="input" type="email" placeholder="you@example.com" value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })} required />
                    </div>

                    <div>
                        <label className="label">Password</label>
                        <input id="reg-password" className="input" type="password" placeholder="Min 8 characters" value={form.password}
                            onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} />
                    </div>

                    {/* Role selector */}
                    <div>
                        <label className="label">I am a…</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                            {roles.map(r => (
                                <button key={r.value} type="button" id={`role-${r.value}`}
                                    onClick={() => setForm({ ...form, role: r.value })}
                                    style={{
                                        padding: '12px 8px',
                                        borderRadius: '10px',
                                        border: `1px solid ${form.role === r.value ? 'var(--purple)' : 'var(--border)'}`,
                                        background: form.role === r.value ? 'rgba(124,58,237,0.15)' : 'var(--surface2)',
                                        color: form.role === r.value ? '#a78bfa' : 'var(--muted)',
                                        cursor: 'pointer',
                                        fontSize: '0.8rem',
                                        fontWeight: '600',
                                        fontFamily: 'Inter, sans-serif',
                                        transition: 'all 0.2s',
                                        textAlign: 'center',
                                    }}>
                                    <div style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{r.label.split(' ')[0]}</div>
                                    <div>{r.label.split(' ').slice(1).join(' ')}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Teacher code */}
                    {form.role === 'teacher' && (
                        <div className="fade-in">
                            <label className="label">Teacher Registration Code</label>
                            <input id="reg-teacher-code" className="input" type="text" placeholder="e.g. AB12CD34" value={form.teacherCode}
                                onChange={e => setForm({ ...form, teacherCode: e.target.value.toUpperCase() })} required />
                        </div>
                    )}

                    {error && (
                        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '10px 14px', color: '#f87171', fontSize: '0.875rem' }}>
                            {error}
                        </div>
                    )}

                    <button id="reg-submit" className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: '4px' }}>
                        {loading ? 'Creating account…' : 'Create Account'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '24px', color: 'var(--muted)', fontSize: '0.875rem' }}>
                    Already have an account?{' '}
                    <Link href="/login" style={{ color: '#a78bfa', textDecoration: 'none', fontWeight: '600' }}>Sign in</Link>
                </p>
            </div>
        </div>
    );
}
