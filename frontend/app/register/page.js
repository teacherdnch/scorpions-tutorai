'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../lib/api';
import { setAuth } from '../../lib/auth';
import { useLang } from '../../lib/LangContext';

const ROLES = ['student', 'teacher', 'admin'];
const ROLE_ICONS = { student: '👨‍🎓', teacher: '👨‍🏫', admin: '👑' };

export default function RegisterPage() {
    const router = useRouter();
    const { t } = useLang();
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student', teacherCode: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError(''); setLoading(true);
        try {
            const payload = { name: form.name, email: form.email, password: form.password, role: form.role };
            if (form.role === 'teacher') payload.teacherCode = form.teacherCode;
            const { token, user } = await api.register(payload);
            setAuth(token, user);
            router.push(`/${user.role}/dashboard`);
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    }

    const roleDescKey = { student: 'reg.studentDesc', teacher: 'reg.teacherDesc', admin: 'reg.adminDesc' };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '24px' }}>
            <div style={{ width: '100%', maxWidth: '480px' }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🧠</div>
                    <h1 className="gradient-text" style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '8px' }}>Tutorai</h1>
                    <p style={{ color: 'var(--muted)' }}>{t('reg.title')}</p>
                </div>
                <div className="glass" style={{ padding: '36px' }}>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <label className="label">{t('reg.name')}</label>
                            <input id="reg-name" className="input" type="text" placeholder="John Doe" value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })} required />
                        </div>
                        <div>
                            <label className="label">{t('reg.email')}</label>
                            <input id="reg-email" className="input" type="email" placeholder="you@example.com" value={form.email}
                                onChange={e => setForm({ ...form, email: e.target.value })} required />
                        </div>
                        <div>
                            <label className="label">{t('reg.password')}</label>
                            <input id="reg-password" className="input" type="password" placeholder="••••••••" value={form.password}
                                onChange={e => setForm({ ...form, password: e.target.value })} required />
                        </div>
                        <div>
                            <label className="label">{t('reg.role')}</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '8px' }}>
                                {ROLES.map(role => (
                                    <button key={role} type="button" onClick={() => setForm({ ...form, role })}
                                        style={{
                                            padding: '14px 8px', borderRadius: '12px', cursor: 'pointer',
                                            border: `1px solid ${form.role === role ? 'var(--purple)' : 'var(--border)'}`,
                                            background: form.role === role ? 'rgba(124,58,237,0.15)' : 'var(--surface2)',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                                            transition: 'all 0.2s', fontFamily: 'Inter,sans-serif',
                                        }}>
                                        <span style={{ fontSize: '1.5rem' }}>{ROLE_ICONS[role]}</span>
                                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: form.role === role ? '#a78bfa' : 'var(--text)' }}>
                                            {t(`reg.${role}`)}
                                        </span>
                                        <span style={{ fontSize: '0.65rem', color: 'var(--muted)', textAlign: 'center', lineHeight: 1.3 }}>
                                            {t(roleDescKey[role])}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        {form.role === 'teacher' && (
                            <div>
                                <label className="label">{t('reg.teacherCode')}</label>
                                <input id="reg-teacher-code" className="input" type="text" placeholder={t('reg.teacherCodePlaceholder')}
                                    value={form.teacherCode} onChange={e => setForm({ ...form, teacherCode: e.target.value })} required />
                            </div>
                        )}
                        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '10px 14px', color: '#f87171', fontSize: '0.875rem' }}>{error}</div>}
                        <button id="reg-submit" className="btn-primary" type="submit" disabled={loading} style={{ fontSize: '1rem', padding: '16px' }}>
                            {loading ? t('reg.creating') : t('reg.submit')}
                        </button>
                    </form>
                    <p style={{ textAlign: 'center', marginTop: '16px', color: 'var(--muted)', fontSize: '0.875rem' }}>
                        {t('reg.haveAccount')}{' '}
                        <Link href="/login" style={{ color: '#a78bfa', fontWeight: '600', textDecoration: 'none' }}>{t('reg.signIn')}</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
