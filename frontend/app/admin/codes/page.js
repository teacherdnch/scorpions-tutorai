'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import { api } from '../../../lib/api';
import { getUser } from '../../../lib/auth';

export default function CodesPage() {
    const router = useRouter();
    const [codes, setCodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [newCode, setNewCode] = useState(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const u = getUser();
        if (!u) return router.replace('/login');
        if (u.role !== 'admin') return router.replace(`/${u.role}/dashboard`);
        loadCodes();
    }, [router]);

    async function loadCodes() {
        try {
            const d = await api.getCodes();
            setCodes(d);
        } catch { }
        setLoading(false);
    }

    async function generate() {
        setGenerating(true);
        try {
            const d = await api.generateCode();
            setNewCode(d.code);
            await loadCodes();
        } catch (e) { alert(e.message); }
        setGenerating(false);
    }

    function copyCode(code) {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    if (loading) return <div><Navbar /><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 64px)' }}><div className="spinner" /></div></div>;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
            <Navbar />
            <main style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '6px' }}>🔑 Teacher Codes</h1>
                        <p style={{ color: 'var(--muted)' }}>Generate one-time registration codes for teachers</p>
                    </div>
                    <button id="generate-code-btn" className="btn-primary" onClick={generate} disabled={generating}>
                        {generating ? 'Generating…' : '+ Generate Code'}
                    </button>
                </div>

                {/* New code banner */}
                {newCode && (
                    <div className="fade-in" style={{
                        background: 'rgba(124,58,237,0.1)',
                        border: '1px solid rgba(124,58,237,0.4)',
                        borderRadius: '14px',
                        padding: '20px 24px',
                        marginBottom: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}>
                        <div>
                            <p style={{ color: '#a78bfa', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>NEW CODE GENERATED</p>
                            <p style={{ fontSize: '1.8rem', fontWeight: '800', letterSpacing: '0.1em', fontFamily: 'monospace' }}>{newCode}</p>
                        </div>
                        <button onClick={() => copyCode(newCode)} className="btn-secondary" id="copy-code-btn">
                            {copied ? '✅ Copied!' : '📋 Copy'}
                        </button>
                    </div>
                )}

                {/* Codes table */}
                <div className="glass" style={{ padding: '24px' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '16px' }}>All Codes ({codes.length})</h2>
                    {codes.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>
                            <p style={{ fontSize: '2rem', marginBottom: '8px' }}>🔑</p>
                            <p>No codes generated yet.</p>
                        </div>
                    ) : (
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Code</th>
                                    <th>Status</th>
                                    <th>Expires</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {codes.map(c => {
                                    const expired = new Date(c.expires_at) < new Date();
                                    const badgeClass = c.is_used ? 'badge-red' : expired ? 'badge-yellow' : 'badge-green';
                                    const badgeLabel = c.is_used ? 'Used' : expired ? 'Expired' : 'Active';
                                    return (
                                        <tr key={c.id}>
                                            <td style={{ fontFamily: 'monospace', fontWeight: '700', letterSpacing: '0.05em' }}>{c.code}</td>
                                            <td><span className={`badge ${badgeClass}`}>{badgeLabel}</span></td>
                                            <td style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                                                {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td>
                                                {!c.is_used && !expired && (
                                                    <button onClick={() => copyCode(c.code)} className="btn-secondary" style={{ padding: '5px 12px', fontSize: '0.8rem' }}>
                                                        📋 Copy
                                                    </button>
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
