'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import { api } from '../../../lib/api';
import { getUser } from '../../../lib/auth';
import { useLang } from '../../../lib/LangContext';

// ─── Score Ring ──────────────────────────────────────────────────────────────
function ScoreRing({ score, max, label, color }) {
    const pct = max ? score / max : 0;
    const r = 28, c = 2 * Math.PI * r;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <svg width="72" height="72" viewBox="0 0 72 72">
                <circle cx="36" cy="36" r={r} fill="none" stroke="var(--surface2)" strokeWidth="5" />
                <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={`${c * pct} ${c}`}
                    strokeDashoffset={c * 0.25}
                    style={{ transition: 'stroke-dasharray 0.8s ease' }} />
                <text x="36" y="40" textAnchor="middle" fontSize="13" fontWeight="800" fill={color}
                    fontFamily="Space Grotesk, sans-serif">{score}/{max}</text>
            </svg>
            <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: '600', textAlign: 'center', maxWidth: '72px' }}>{label}</span>
        </div>
    );
}

// ─── Waveform animation ──────────────────────────────────────────────────────
function Waveform({ active }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '36px' }}>
            {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} style={{
                    width: '4px', borderRadius: '2px',
                    background: `linear-gradient(180deg, var(--purple), var(--blue))`,
                    height: active ? `${10 + Math.abs(Math.sin(i * 0.8)) * 26}px` : '4px',
                    transition: `height ${0.2 + i * 0.04}s ease`,
                    animation: active ? `wavePulse ${0.6 + i * 0.07}s ease-in-out infinite alternate` : 'none',
                }} />
            ))}
            <style>{`@keyframes wavePulse { from{height:6px} to{height:${28}px} }`}</style>
        </div>
    );
}

// ─── Grade Badge ─────────────────────────────────────────────────────────────
function GradeBadge({ grade }) {
    const c = { 'A+': '#16a34a', A: '#22c55e', B: '#3b82f6', C: '#f59e0b', D: '#f97316', F: '#dc2626' };
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '52px', height: '52px', borderRadius: '14px',
            background: `${c[grade] || '#6b7280'}18`, border: `2px solid ${c[grade] || '#6b7280'}`,
            fontSize: '1.3rem', fontWeight: '900', color: c[grade] || '#6b7280',
            fontFamily: "'Space Grotesk', sans-serif",
        }}>{grade}</span>
    );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function OralExam() {
    const router = useRouter();
    const { t } = useLang();

    // Config
    const [subject, setSubject] = useState('');
    const [difficulty, setDifficulty] = useState('medium');
    const [totalQ, setTotalQ] = useState(5);
    const [error, setError] = useState('');

    // Session
    const [step, setStep] = useState('config'); // config|loading|question|recording|evaluating|feedback|result
    const [session, setSession] = useState(null);
    const [question, setQuestion] = useState(null);
    const [qNumber, setQNumber] = useState(1);
    const [transcript, setTranscript] = useState('');
    const [interimText, setInterimText] = useState('');
    const [evaluation, setEvaluation] = useState(null);
    const [allResults, setAllResults] = useState([]);
    const [finalData, setFinalData] = useState(null);

    // Speech refs
    const recognitionRef = useRef(null);
    const synthRef = useRef(null);
    const isRecording = step === 'recording';

    useEffect(() => {
        const u = getUser();
        if (!u) return router.replace('/login');
        if (u.role !== 'student') return router.replace(`/${u.role}/dashboard`);
    }, [router]);

    // ── Text-to-Speech: read question aloud ─────────────────────────────────
    function speakText(text, onEnd) {
        if (!window.speechSynthesis) { onEnd?.(); return; }
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(text);
        utt.rate = 0.92;
        utt.pitch = 1.0;
        utt.lang = 'en-US';
        // Pick a natural voice if available
        const voices = window.speechSynthesis.getVoices();
        const pref = voices.find(v => v.lang === 'en-US' && v.name.includes('Google'))
            || voices.find(v => v.lang.startsWith('en'));
        if (pref) utt.voice = pref;
        utt.onend = () => onEnd?.();
        synthRef.current = utt;
        window.speechSynthesis.speak(utt);
    }

    function stopSpeaking() {
        window.speechSynthesis?.cancel();
    }

    // ── Speech Recognition setup ─────────────────────────────────────────────
    function startRecording() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
            setError('Your browser does not support speech recognition. Try Chrome or Edge.');
            return;
        }
        const rec = new SR();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';
        rec.maxAlternatives = 1;

        let finalTranscript = transcript;
        rec.onresult = (e) => {
            let interim = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const chunk = e.results[i][0].transcript;
                if (e.results[i].isFinal) { finalTranscript += chunk + ' '; }
                else { interim = chunk; }
            }
            setTranscript(finalTranscript);
            setInterimText(interim);
        };
        rec.onerror = (e) => {
            if (e.error !== 'no-speech') setError(`Mic error: ${e.error}`);
        };
        recognitionRef.current = rec;
        rec.start();
        setStep('recording');
    }

    function stopRecording() {
        recognitionRef.current?.stop();
        setInterimText('');
        setStep('question');  // back to question view, transcript ready
    }

    // ── Start exam ───────────────────────────────────────────────────────────
    async function startExam(e) {
        e.preventDefault();
        if (!subject.trim()) return setError('Please enter a subject');
        setError('');
        setStep('loading');
        try {
            const data = await api.startOral({ subject: subject.trim(), difficulty, totalQuestions: totalQ });
            setSession({ id: data.sessionId, totalQuestions: data.totalQuestions });
            setQuestion(data.question);
            setQNumber(1);
            setTranscript('');
            setEvaluation(null);
            setStep('question');
            // Read question aloud after 0.5s
            setTimeout(() => speakText(data.question.question), 500);
        } catch (err) {
            setError(err.message);
            setStep('config');
        }
    }

    // ── Submit answer ────────────────────────────────────────────────────────
    async function submitAnswer() {
        if (!transcript.trim()) return setError('Please record your answer first');
        stopSpeaking(); stopRecording();
        setStep('evaluating');
        setError('');
        try {
            const data = await api.submitOralAnswer(session.id, {
                transcript: transcript.trim(),
                questionText: question.question,
                topic: question.topic,
                idealPoints: question.ideal_answer_points || [],
            });
            setEvaluation(data.evaluation);
            setAllResults(r => [...r, { question, transcript, evaluation: data.evaluation, qNumber }]);
            setStep('feedback');
            if (data.done) { setFinalData(data); }
            else {
                // Preload next question
                setTimeout(() => {
                    setQuestion(data.nextQuestion);
                    setQNumber(data.questionNumber);
                }, 0);
            }
        } catch (err) {
            setError(err.message);
            setStep('question');
        }
    }

    function nextQuestion() {
        if (finalData) { setStep('result'); return; }
        setTranscript('');
        setInterimText('');
        setEvaluation(null);
        setStep('question');
        setTimeout(() => speakText(question.question), 300);
    }

    // ── CONFIG screen ────────────────────────────────────────────────────────
    if (step === 'config') return (
        <div style={{ minHeight: '100vh' }}>
            <Navbar />
            <main style={{ maxWidth: '600px', margin: '0 auto', padding: '48px 24px' }}>
                <div style={{ textAlign: 'center', marginBottom: '36px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🎙️</div>
                    <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '8px' }}>Oral Exam</h1>
                    <p style={{ color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                        Speak your answers aloud. AI evaluates grammar, depth, and communication skills.
                    </p>
                </div>

                <div className="glass" style={{ padding: '28px' }}>
                    <form onSubmit={startExam} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {error && <div style={{ padding: '12px 16px', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: '10px', color: 'var(--red)', fontSize: '0.875rem' }}>{error}</div>}

                        <div>
                            <label className="label">Subject</label>
                            <input className="input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Physics, History, English..." />
                        </div>

                        <div>
                            <label className="label">Difficulty</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {['easy', 'medium', 'hard'].map(d => (
                                    <button key={d} type="button" onClick={() => setDifficulty(d)}
                                        style={{ flex: 1, padding: '10px', borderRadius: '10px', border: `1px solid ${difficulty === d ? 'var(--blue)' : 'var(--border)'}`, background: difficulty === d ? 'rgba(5,150,105,0.12)' : 'var(--surface2)', color: difficulty === d ? 'var(--blue)' : 'var(--muted)', cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif", fontWeight: '600', fontSize: '0.85rem', transition: 'all 0.15s', textTransform: 'capitalize' }}>
                                        {d === 'easy' ? '🌱' : d === 'medium' ? '⚡' : '🔥'} {d}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="label">Number of Questions</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {[3, 5, 8, 10].map(n => (
                                    <button key={n} type="button" onClick={() => setTotalQ(n)}
                                        style={{ flex: 1, padding: '10px', borderRadius: '10px', border: `1px solid ${totalQ === n ? 'var(--blue)' : 'var(--border)'}`, background: totalQ === n ? 'rgba(5,150,105,0.12)' : 'var(--surface2)', color: totalQ === n ? 'var(--blue)' : 'var(--muted)', cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif", fontWeight: '700', fontSize: '0.95rem', transition: 'all 0.15s' }}>
                                        {n}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Browser support notice */}
                        <div style={{ padding: '10px 14px', background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)', borderRadius: '10px', fontSize: '0.78rem', color: 'var(--blue)' }}>
                            🎤 Uses your browser's microphone for speech recognition (Chrome/Edge recommended)
                        </div>

                        <button type="submit" className="btn-primary" style={{ padding: '16px', fontSize: '1rem' }}>
                            🎙️ Start Oral Exam
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );

    // ── LOADING screen ───────────────────────────────────────────────────────
    if (step === 'loading' || step === 'evaluating') return (
        <div style={{ minHeight: '100vh' }}>
            <Navbar />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 64px)', gap: '20px' }}>
                <div className="spinner" style={{ width: '52px', height: '52px', borderWidth: '4px' }} />
                <p style={{ color: 'var(--muted)', fontFamily: "'Space Grotesk', sans-serif" }}>
                    {step === 'evaluating' ? '🤖 AI is evaluating your answer...' : '⚙️ Generating question...'}
                </p>
            </div>
        </div>
    );

    // ── QUESTION / RECORDING screen ──────────────────────────────────────────
    if (step === 'question' || step === 'recording') return (
        <div style={{ minHeight: '100vh' }}>
            <Navbar />
            <main style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 24px' }}>

                {/* Progress */}
                <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '8px' }}>
                        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: '700' }}>
                            Question {qNumber} / {session.totalQuestions}
                        </span>
                        <span style={{ textTransform: 'capitalize', color: 'var(--blue)' }}>{difficulty}</span>
                    </div>
                    <div style={{ height: '5px', background: 'var(--surface2)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${((qNumber - 1) / session.totalQuestions) * 100}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.4s' }} />
                    </div>
                </div>

                {/* Question card */}
                <div className="glass fade-in" style={{ padding: '28px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--blue)', background: 'rgba(5,150,105,0.1)', padding: '3px 10px', borderRadius: '999px', border: '1px solid rgba(5,150,105,0.2)' }}>
                            📌 {question?.topic}
                        </span>
                        <button onClick={() => speakText(question?.question)} title="Read question aloud"
                            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontSize: '1rem' }}>
                            🔊
                        </button>
                    </div>
                    <p style={{ fontSize: '1.15rem', fontWeight: '600', lineHeight: 1.65, color: 'var(--text)' }}>
                        {question?.question}
                    </p>
                    {question?.time_hint && (
                        <p style={{ marginTop: '12px', color: 'var(--muted)', fontSize: '0.8rem' }}>
                            ⏱️ Suggested speaking time: ~{question.time_hint}s
                        </p>
                    )}
                </div>

                {/* Transcript area */}
                <div className="glass" style={{ padding: '20px', marginBottom: '20px', minHeight: '100px', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Answer</span>
                        {isRecording && <Waveform active={true} />}
                    </div>

                    {(transcript || interimText) ? (
                        <p style={{ color: 'var(--text)', lineHeight: 1.7, fontSize: '0.95rem' }}>
                            {transcript}
                            {interimText && <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>{interimText}</span>}
                        </p>
                    ) : (
                        <p style={{ color: 'var(--muted2)', fontSize: '0.875rem', fontStyle: 'italic' }}>
                            {isRecording ? '🎤 Listening... speak clearly' : 'Press "Start Recording" to answer'}
                        </p>
                    )}

                    {transcript && (
                        <div style={{ marginTop: '10px', fontSize: '0.75rem', color: 'var(--muted)' }}>
                            {transcript.trim().split(/\s+/).length} words
                        </div>
                    )}
                </div>

                {/* Error */}
                {error && <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(220,38,38,0.08)', borderRadius: '10px', color: 'var(--red)', fontSize: '0.875rem' }}>{error}</div>}

                {/* Controls */}
                <div style={{ display: 'flex', gap: '12px' }}>
                    {!isRecording ? (
                        <button onClick={startRecording} className="btn-primary" style={{ flex: 1, padding: '16px', fontSize: '1rem' }}>
                            🎙️ Start Recording
                        </button>
                    ) : (
                        <button onClick={stopRecording} style={{
                            flex: 1, padding: '16px', borderRadius: '12px', border: '2px solid #dc2626',
                            background: 'rgba(220,38,38,0.1)', color: '#dc2626', cursor: 'pointer',
                            fontFamily: "'Space Grotesk', sans-serif", fontWeight: '700', fontSize: '1rem',
                            animation: 'pulse 1.5s ease-in-out infinite',
                        }}>
                            ⏹ Stop Recording
                        </button>
                    )}
                    {transcript && !isRecording && (
                        <button onClick={submitAnswer} className="btn-primary" style={{ flex: 1, padding: '16px', fontSize: '1rem' }}>
                            ✅ Submit Answer
                        </button>
                    )}
                </div>

                {/* Follow-up hint */}
                {question?.follow_up && (
                    <div style={{ marginTop: '16px', padding: '12px 16px', background: 'var(--surface2)', borderRadius: '10px', fontSize: '0.8rem', color: 'var(--muted)', borderLeft: '3px solid var(--blue)' }}>
                        💭 <strong>Follow-up to consider:</strong> {question.follow_up}
                    </div>
                )}
            </main>
            <style>{`@keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,0.4)} 50%{box-shadow:0 0 0 8px rgba(220,38,38,0)} }`}</style>
        </div>
    );

    // ── FEEDBACK screen ──────────────────────────────────────────────────────
    if (step === 'feedback' && evaluation) {
        const dims = evaluation.dimensions || {};
        const dimConfig = [
            { key: 'relevance', label: 'Relevance', max: 30, color: '#16a34a', icon: '🎯' },
            { key: 'grammar', label: 'Grammar', max: 20, color: '#3b82f6', icon: '📝' },
            { key: 'depth', label: 'Depth', max: 25, color: '#8b5cf6', icon: '🔬' },
            { key: 'communication', label: 'Communication', max: 25, color: '#f59e0b', icon: '🗣️' },
        ];

        return (
            <div style={{ minHeight: '100vh' }}>
                <Navbar />
                <main style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 24px' }}>
                    <div className="fade-in">
                        {/* Header */}
                        <div className="glass" style={{ padding: '24px', marginBottom: '20px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                                <GradeBadge grade={evaluation.grade} />
                                <div>
                                    <div style={{ fontSize: '2.2rem', fontWeight: '900', fontFamily: "'Space Grotesk', sans-serif" }}>{evaluation.totalScore}<span style={{ fontSize: '1rem', color: 'var(--muted)' }}>/100</span></div>
                                    <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{evaluation.wordCount} words spoken</div>
                                </div>
                            </div>
                            <p style={{ color: 'var(--text)', lineHeight: 1.65, fontSize: '0.9rem' }}>{evaluation.overallFeedback}</p>
                        </div>

                        {/* Score rings */}
                        <div className="glass" style={{ padding: '24px', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '20px' }}>Score Breakdown</h3>
                            <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '16px' }}>
                                {dimConfig.map(d => (
                                    <ScoreRing key={d.key} score={dims[d.key]?.score || 0} max={d.max} label={`${d.icon} ${d.label}`} color={d.color} />
                                ))}
                            </div>
                            {/* Dimension feedback */}
                            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {dimConfig.map(d => dims[d.key]?.feedback && (
                                    <div key={d.key} style={{ padding: '10px 14px', background: 'var(--surface2)', borderRadius: '9px', borderLeft: `3px solid ${d.color}` }}>
                                        <span style={{ fontWeight: '700', fontSize: '0.8rem', color: d.color }}>{d.icon} {d.label}</span>
                                        <p style={{ color: 'var(--text)', fontSize: '0.82rem', marginTop: '3px', lineHeight: 1.5 }}>{dims[d.key].feedback}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Strengths + Improvements */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                            {evaluation.strengths?.length > 0 && (
                                <div className="glass" style={{ padding: '16px' }}>
                                    <h4 style={{ fontSize: '0.8rem', fontWeight: '700', color: '#16a34a', marginBottom: '10px' }}>✅ Strengths</h4>
                                    {evaluation.strengths.map((s, i) => (
                                        <p key={i} style={{ fontSize: '0.8rem', color: 'var(--text)', lineHeight: 1.5, marginBottom: '4px' }}>• {s}</p>
                                    ))}
                                </div>
                            )}
                            {evaluation.improvements?.length > 0 && (
                                <div className="glass" style={{ padding: '16px' }}>
                                    <h4 style={{ fontSize: '0.8rem', fontWeight: '700', color: '#f59e0b', marginBottom: '10px' }}>📈 To Improve</h4>
                                    {evaluation.improvements.map((s, i) => (
                                        <p key={i} style={{ fontSize: '0.8rem', color: 'var(--text)', lineHeight: 1.5, marginBottom: '4px' }}>• {s}</p>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Transcript */}
                        <div className="glass" style={{ padding: '16px', marginBottom: '20px' }}>
                            <h4 style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Transcript</h4>
                            <p style={{ color: 'var(--text)', fontSize: '0.875rem', lineHeight: 1.65, fontStyle: 'italic' }}>"{transcript}"</p>
                        </div>

                        <button onClick={nextQuestion} className="btn-primary" style={{ width: '100%', padding: '16px', fontSize: '1rem' }}>
                            {finalData ? '📊 View Final Results' : '➡️ Next Question'}
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    // ── RESULT screen ────────────────────────────────────────────────────────
    if (step === 'result' && finalData) {
        const avg = finalData.avgScore || 0;
        const grade = avg >= 90 ? 'A+' : avg >= 80 ? 'A' : avg >= 70 ? 'B' : avg >= 60 ? 'C' : avg >= 50 ? 'D' : 'F';
        return (
            <div style={{ minHeight: '100vh' }}>
                <Navbar />
                <main style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 24px' }}>
                    <div className="fade-in">
                        {/* Final score */}
                        <div className="glass" style={{ padding: '32px', marginBottom: '24px', textAlign: 'center', border: '1px solid rgba(22,163,74,0.25)' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🎙️</div>
                            <h1 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '6px' }}>Oral Exam Complete!</h1>
                            <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '20px' }}>{session.totalQuestions} questions · {subject}</p>
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px' }}>
                                <GradeBadge grade={grade} />
                                <div>
                                    <div style={{ fontSize: '3rem', fontWeight: '900', fontFamily: "'Space Grotesk', sans-serif", color: 'var(--purple)' }}>{avg}<span style={{ fontSize: '1.2rem', color: 'var(--muted)' }}>/100</span></div>
                                    <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Average Score</div>
                                </div>
                            </div>
                        </div>

                        {/* Per-question summary */}
                        <div className="glass" style={{ padding: '24px', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '16px' }}>Question-by-Question Results</h3>
                            {allResults.map((r, i) => (
                                <div key={i} style={{ padding: '14px 16px', background: 'var(--surface2)', borderRadius: '10px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <p style={{ fontWeight: '700', fontSize: '0.875rem', marginBottom: '2px' }}>Q{i + 1}: {r.question?.topic}</p>
                                        <p style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>{r.transcript?.slice(0, 60)}...</p>
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                                        <GradeBadge grade={r.evaluation.grade} />
                                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '4px' }}>{r.evaluation.totalScore}/100</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button onClick={() => { setStep('config'); setTranscript(''); setAllResults([]); setFinalData(null); }}
                            className="btn-primary" style={{ width: '100%', padding: '16px', fontSize: '1rem' }}>
                            🔄 Start New Oral Exam
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    return null;
}
