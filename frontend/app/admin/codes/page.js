'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import { api } from '../../../lib/api';
import { getUser } from '../../../lib/auth';
import { useLang } from '../../../lib/LangContext';

export default function AdminCodes() {
    const router = useRouter();
    const { t } = useLang();
    const [codes, setCodes] = useState([]);
    const [newCode, setNewCode] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const u = getUser();
        if (!u) return router.replace('/login');
        if (u.role !== 'admin') return router.replace(`/${u.role}/dashboard`);
        api.getCodes().then(d => setCodes(d || []));
    }, [router]);

    async function generate() {
        setGenerating(true);
        try {
            const d = await api.generateCode();
            setNewCode(d.code);
            setCodes(prev => [d, ...prev]);
        } finally { setGenerating(false); }
    }

    function copy() {
        navigator.clipboard.writeText(newCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    function getStatus(code) {
        if (code.is_used) return { label: t('ac.used'), color: '#6b7280' };
        if (code.expires_at && new Date(code.expires_at) < new Date()) return { label: t('ac.expired'), color: '#ef4444' };
        return { label: t('ac.active'), color: '#10b981' };
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
            <Navbar />
            <main style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '6px' }}>{t('ac.title')}</h1>
                        <p style={{ color: 'var(--muted)' }}>{t('ac.subtitle')}</p>
                    </div>
                    <button id="generate-code-btn" className="btn-primary" onClick={generate} disabled={generating} style={{ minWidth: '160px' }}>
                        {generating ? t('ac.generating') : t('ac.generate')}
                    </button>
                </div>

                {newCode && (
                    <div className="glass fade-in" style={{ padding: '24px', marginBottom: '24px', border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.05)' }}>
                        <p style={{ color: '#34d399', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>{t('ac.newCode')}</p>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <code style={{ fontSize: '1.4rem', fontWeight: '800', color: '#10b981', letterSpacing: '0.1em', background: 'rgba(16,185,129,0.1)', padding: '8px 16px', borderRadius: '8px' }}>{newCode}</code>
                            <button onClick={copy} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                                {copied ? t('ac.copied') : t('ac.copy')}
                            </button>
                        </div>
                    </div>
                )}

                <div className="glass" style={{ padding: '24px' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '20px' }}>{t('ac.allCodes')}</h2>
                    {codes.length === 0 ? (
                        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '40px' }}>{t('ac.noCodes')}</p>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    {[t('ac.code'), t('ac.status'), t('ac.expires'), t('ac.action')].map(h => (
                                        <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {codes.map(c => {
                                    const status = getStatus(c);
                                    return (
                                        <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '14px' }}><code style={{ fontWeight: '700', letterSpacing: '0.05em' }}>{c.code}</code></td>
                                            <td style={{ padding: '14px' }}><span style={{ color: status.color, fontWeight: '600', fontSize: '0.85rem' }}>● {status.label}</span></td>
                                            <td style={{ padding: '14px', color: 'var(--muted)', fontSize: '0.875rem' }}>{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : '—'}</td>
                                            <td style={{ padding: '14px' }}>
                                                {!c.is_used && status.label !== t('ac.expired') && (
                                                    <button onClick={() => { navigator.clipboard.writeText(c.code); }} className="btn-secondary" style={{ padding: '5px 12px', fontSize: '0.78rem' }}>{t('ac.copy')}</button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>
        </div>
    );
}
