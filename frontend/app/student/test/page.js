'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import { api } from '../../../lib/api';
import { getUser } from '../../../lib/auth';
import { useLang } from '../../../lib/LangContext';

export default function TestPage() {
    const router = useRouter();
    const { t } = useLang();
    const [step, setStep] = useState('config');
    const [config, setConfig] = useState({ subject: '', difficulty: 'medium' });
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [testId, setTestId] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const u = getUser();
        if (!u) return router.replace('/login');
        if (u.role !== 'student') return router.replace(`/${u.role}/dashboard`);
    }, [router]);

    async function generateTest(e) {
        e.preventDefault();
        if (!config.subject.trim()) return setError('Subject required');
        setError(''); setStep('loading');
        try {
            const data = await api.generateTest(config);
            setTestId(data.testId);
            setQuestions(data.questions || []);
            setStep('test');
        } catch (err) {
            setError(err.message);
            setStep('config');
        }
    }

    async function submitTest() {
        setStep('loading');
        try {
            const answersArr = questions.map((q, i) => ({ questionId: q.id, answer: answers[i] || '' }));
            const result = await api.submitTest({ testId, answers: answersArr });
            router.push(`/student/results/${result.testId || testId}`);
        } catch (err) {
            setError(err.message);
            setStep('test');
        }
    }

    const difficultyOptions = [
        { key: 'easy', label: t('test.easy'), color: '#10b981' },
        { key: 'medium', label: t('test.medium'), color: '#f59e0b' },
        { key: 'hard', label: t('test.hard'), color: '#ef4444' },
    ];

    const SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'History', 'English'];

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
            <Navbar />
            <main style={{ maxWidth: '760px', margin: '0 auto', padding: '40px 24px' }}>

                {step === 'config' && (
                    <div className="fade-in">
                        <h1 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '8px' }}>{t('test.title')}</h1>
                        <p style={{ color: 'var(--muted)', marginBottom: '32px' }}>AI-generated questions tailored to your level.</p>
                        <div className="glass" style={{ padding: '36px' }}>
                            <form onSubmit={generateTest} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <div>
                                    <label className="label">{t('test.subject')}</label>
                                    <input id="test-subject" className="input" type="text" placeholder={t('test.subjectPH')}
                                        value={config.subject} onChange={e => setConfig({ ...config, subject: e.target.value })} required />
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                                        {SUBJECTS.map(s => (
                                            <button key={s} type="button" onClick={() => setConfig({ ...config, subject: s })}
                                                style={{ padding: '4px 12px', borderRadius: '999px', border: `1px solid ${config.subject === s ? 'var(--purple)' : 'var(--border)'}`, background: config.subject === s ? 'rgba(124,58,237,0.15)' : 'var(--surface2)', color: config.subject === s ? '#a78bfa' : 'var(--muted)', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Inter,sans-serif', transition: 'all 0.15s' }}>
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="label">{t('test.difficulty')}</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '8px' }}>
                                        {difficultyOptions.map(d => (
                                            <button key={d.key} type="button" onClick={() => setConfig({ ...config, difficulty: d.key })}
                                                style={{ padding: '12px', borderRadius: '10px', cursor: 'pointer', border: `1px solid ${config.difficulty === d.key ? d.color : 'var(--border)'}`, background: config.difficulty === d.key ? `${d.color}15` : 'var(--surface2)', color: config.difficulty === d.key ? d.color : 'var(--muted)', fontWeight: '700', fontFamily: 'Inter,sans-serif', transition: 'all 0.2s' }}>
                                                {d.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '10px 14px', color: '#f87171', fontSize: '0.875rem' }}>{error}</div>}
                                <button id="generate-test-btn" className="btn-primary" type="submit" style={{ fontSize: '1rem', padding: '16px' }}>{t('test.generate')}</button>
                            </form>
                        </div>
                    </div>
                )}

                {step === 'loading' && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 180px)', gap: '20px' }}>
                        <div className="spinner" style={{ width: '52px', height: '52px', borderWidth: '4px' }} />
                        <p style={{ color: 'var(--muted)' }}>{t('test.loading')}</p>
                    </div>
                )}

                {step === 'test' && (
                    <div className="fade-in">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h1 style={{ fontSize: '1.4rem', fontWeight: '800' }}>{config.subject} — {t(`test.${config.difficulty}`)}</h1>
                            <span style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>{Object.keys(answers).length}/{questions.length} {t('res.correct')}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {questions.map((q, qi) => (
                                <div key={qi} className="glass" style={{ padding: '24px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <span style={{ fontWeight: '700', color: '#a78bfa' }}>{t('test.question')} {qi + 1} {t('test.of')} {questions.length}</span>
                                        {q.topic && <span className="badge badge-purple">{q.topic}</span>}
                                    </div>
                                    <p style={{ fontSize: '1rem', fontWeight: '600', lineHeight: 1.6, marginBottom: '18px' }}>{q.question_text}</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {(q.options || []).map((opt, oi) => (
                                            <button key={oi} onClick={() => setAnswers({ ...answers, [qi]: opt })}
                                                style={{ textAlign: 'left', padding: '13px 18px', borderRadius: '10px', border: `1px solid ${answers[qi] === opt ? 'var(--purple)' : 'var(--border)'}`, background: answers[qi] === opt ? 'rgba(124,58,237,0.15)' : 'var(--surface2)', color: answers[qi] === opt ? '#a78bfa' : 'var(--text)', cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'Inter,sans-serif', fontWeight: answers[qi] === opt ? '600' : '400', transition: 'all 0.15s' }}>
                                                <span style={{ color: 'var(--muted)', marginRight: '10px' }}>{String.fromCharCode(65 + oi)}.</span>{opt}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '10px 14px', color: '#f87171', fontSize: '0.875rem', marginTop: '16px' }}>{error}</div>}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                            <button className="btn-primary" onClick={submitTest} disabled={Object.keys(answers).length < questions.length} style={{ fontSize: '1rem', padding: '14px 36px' }}>
                                {t('test.submit')}
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
