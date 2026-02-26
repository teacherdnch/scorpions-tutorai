/**
 * ══════════════════════════════════════════════════════════════════
 *  COGNITIVE ANALYTICS ENGINE  —  Scorpions / TutorAI
 *  Computes: Confidence Index · Stress Level · Behavioral Profile
 * ══════════════════════════════════════════════════════════════════
 *
 *  Raw signals collected per-question (via cheat_events):
 *    answer_time   – ms from question display to answer submission
 *    answer_change – fired every time the student switches their pick
 *    skip          – student explicitly skipped (came back later)
 *    pause         – idle gap > PAUSE_THRESHOLD_MS between actions
 *    return_visit  – student revisited a previously answered question
 *
 *  Derived indices (0–100 unless noted):
 *  ┌─────────────────────────┬──────────────────────────────────────────┐
 *  │ Metric                  │ Calculation summary                      │
 *  ├─────────────────────────┼──────────────────────────────────────────┤
 *  │ Confidence Index (CI)   │ Penalises changes, skips, long pauses;   │
 *  │                         │ rewards fast, stable, first-attempt ans. │
 *  ├─────────────────────────┼──────────────────────────────────────────┤
 *  │ Stress Level (SL)       │ Models arousal via answer-time variance, │
 *  │                         │ pause frequency and skip clustering.     │
 *  ├─────────────────────────┼──────────────────────────────────────────┤
 *  │ Behavioral Profile      │ Classifier into 5 archetypes based on    │
 *  │                         │ the (CI, SL, skip-rate, change-rate)     │
 *  │                         │ feature vector.                          │
 *  └─────────────────────────┴──────────────────────────────────────────┘
 */

const db = require('../db/index');

// ── Tuneable constants ──────────────────────────────────────────────────────
const PAUSE_THRESHOLD_MS = 8_000;       // gap > 8 s between actions = "pause"
const FAST_ANSWER_MS = 4_000;       // answering < 4 s = very confident
const SLOW_ANSWER_MS = 60_000;      // answering > 60 s = very hesitant

// ── Statistical helpers ─────────────────────────────────────────────────────
function mean(arr) {
    if (!arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr) {
    if (arr.length < 2) return 0;
    const m = mean(arr);
    return Math.sqrt(arr.reduce((acc, v) => acc + (v - m) ** 2, 0) / (arr.length - 1));
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ── Event parser ────────────────────────────────────────────────────────────
function parseEvents(sessionId) {
    const raw = db.prepare(
        `SELECT * FROM cheat_events WHERE session_id = ? ORDER BY recorded_at ASC`
    ).all(sessionId);

    const byQuestion = {};      // qNum → { times:[], changes:0, skips:0, pauses:0 }
    const globalPauses = [];    // ms durations of all detected pauses
    const answerTimes = [];    // ms per question

    let lastTimestamp = null;

    for (const ev of raw) {
        const qNum = ev.question_number ?? 0;
        if (!byQuestion[qNum]) byQuestion[qNum] = { times: [], changes: 0, skips: 0, pauses: 0, returnVisits: 0 };

        // ── Detect inter-event pauses ────────────────────────────────────────
        if (lastTimestamp) {
            const ts = new Date(ev.recorded_at).getTime();
            const gap = ts - lastTimestamp;
            if (gap > PAUSE_THRESHOLD_MS) {
                globalPauses.push(gap);
                byQuestion[qNum].pauses++;
            }
        }
        lastTimestamp = new Date(ev.recorded_at).getTime();

        const val = JSON.parse(ev.value_json || '{}');

        switch (ev.event_type) {
            case 'answer_time':
                const ms = val.time_ms || 0;
                byQuestion[qNum].times.push(ms);
                answerTimes.push(ms);
                break;
            case 'answer_change':
                byQuestion[qNum].changes++;
                break;
            case 'skip':
                byQuestion[qNum].skips++;
                break;
            case 'return_visit':
                byQuestion[qNum].returnVisits++;
                break;
            // paste / tab_switch handled by anti-cheat; we ignore here
        }
    }

    return { byQuestion, globalPauses, answerTimes, raw };
}

// ── Confidence Index (0–100) ────────────────────────────────────────────────
//
//  Start at 100.
//  For each question:
//    – answer_change  →  –8 pts each (up to –32 per question)
//    – skip           →  –15 pts each (up to –30)
//    – pause          →  –5 pts each  (up to –15)
//    – slow answer    →  –10 pts (> SLOW_ANSWER_MS)
//    – fast answer    →  +5 pts  (< FAST_ANSWER_MS)
//  Score is normalised to 0–100.
//
function computeConfidenceIndex(byQuestion, totalQuestions) {
    let score = 100;

    for (const q of Object.values(byQuestion)) {
        score -= clamp(q.changes * 8, 0, 32);
        score -= clamp(q.skips * 15, 0, 30);
        score -= clamp(q.pauses * 5, 0, 15);

        for (const t of q.times) {
            if (t > SLOW_ANSWER_MS) score -= 10;
            else if (t < FAST_ANSWER_MS && t > 0) score += 5;
        }
    }

    // Normalise: worst realistic case is ~(-57) * 10 questions = –570 + 100 start
    return clamp(Math.round(score), 0, 100);
}

// ── Stress Level (0–100) ────────────────────────────────────────────────────
//
//  Stress is modelled as arousal/anxiety, combining:
//    a) Time variance component  – high variance in answer times  →  high stress
//    b) Pause frequency          – frequent long pauses           →  moderate stress
//    c) Skip clustering          – skips concentrated in one zone →  high stress
//    d) Speed escalation         – answers getting faster over time (panic rushing) → moderate
//
//  Formula:
//    SL = 0.40·(variance_factor) + 0.30·(pause_factor) + 0.20·(skip_factor) + 0.10·(escalation_factor)
//
function computeStressLevel(byQuestion, answerTimes, globalPauses) {
    // a) Variance factor (0–1)
    const sd = stddev(answerTimes);
    const avgT = mean(answerTimes) || 1;
    const cv = sd / avgT;                   // coefficient of variation
    const varianceFactor = clamp(cv / 1.5, 0, 1);   // CV of 1.5 = max stress

    // b) Pause factor (0–1)
    const pauseCount = globalPauses.length;
    const totalQuestions = Math.max(Object.keys(byQuestion).length, 1);
    const pauseRate = pauseCount / totalQuestions;
    const pauseFactor = clamp(pauseRate / 2, 0, 1);  // 2 pauses/question = max

    // c) Skip factor (0–1)
    const totalSkips = Object.values(byQuestion).reduce((s, q) => s + q.skips, 0);
    const skipRate = totalSkips / totalQuestions;
    const skipFactor = clamp(skipRate, 0, 1);

    // d) Escalation: is the latter half faster than the first half?
    let escalationFactor = 0;
    if (answerTimes.length >= 4) {
        const half = Math.floor(answerTimes.length / 2);
        const firstHalfAvg = mean(answerTimes.slice(0, half));
        const secondHalfAvg = mean(answerTimes.slice(half));
        if (secondHalfAvg < firstHalfAvg * 0.6) {
            // Answers got significantly faster – possible panic rushing
            escalationFactor = clamp((firstHalfAvg - secondHalfAvg) / firstHalfAvg, 0, 1);
        }
    }

    const rawStress = (
        0.40 * varianceFactor +
        0.30 * pauseFactor +
        0.20 * skipFactor +
        0.10 * escalationFactor
    ) * 100;

    return clamp(Math.round(rawStress), 0, 100);
}

// ── Behavioral Profile Classifier ───────────────────────────────────────────
//
//  Five archetypes labelled by (CI, SL, skipRate, changeRate) centroids:
//
//  DECISIVE_CONFIDENT  – CI ≥ 70, SL ≤ 30
//  CAREFUL_METHODICAL  – CI ≥ 55, changes high, low SL
//  ANXIOUS_UNCERTAIN   – SL ≥ 60, CI ≤ 50
//  STRATEGIC_SKIPPER   – skipRate ≥ 0.3
//  IMPULSIVE_RUSHER    – answerTime very low on average, changes low
//
function classifyProfile(ci, sl, skipRate, changeRate, avgAnswerMs) {
    if (skipRate >= 0.30) return {
        id: 'STRATEGIC_SKIPPER',
        label: 'Strategic Skipper',
        emoji: '🔀',
        color: '#f59e0b',
        description: 'Prefers to survey all questions before committing, then returns to unanswered ones. Shows planning ability but may indicate topic uncertainty.',
        traits: ['Surveys before answering', 'Non-linear approach', 'Time-management aware'],
    };

    if (sl >= 60 && ci <= 50) return {
        id: 'ANXIOUS_UNCERTAIN',
        label: 'Anxious & Uncertain',
        emoji: '😰',
        color: '#dc2626',
        description: 'High stress combined with low confidence suggests significant exam anxiety. Frequent second-guessing and pauses indicate cognitive overload.',
        traits: ['Frequent answer changes', 'Long pauses under pressure', 'Possible exam anxiety'],
    };

    if (avgAnswerMs > 0 && avgAnswerMs < FAST_ANSWER_MS && changeRate < 0.15) return {
        id: 'IMPULSIVE_RUSHER',
        label: 'Impulsive Rusher',
        emoji: '⚡',
        color: '#8b5cf6',
        description: 'Answers very quickly with few changes. May reflect over-confidence, guessing, or poor engagement with question depth.',
        traits: ['Ultra-fast responses', 'Minimal deliberation', 'Risk-taking behaviour'],
    };

    if (ci >= 70 && sl <= 30) return {
        id: 'DECISIVE_CONFIDENT',
        label: 'Decisive & Confident',
        emoji: '🎯',
        color: '#10b981',
        description: 'High confidence with low stress. Steady answer times and few changes indicate strong topic mastery and calm test-taking disposition.',
        traits: ['Strong topic mastery', 'Consistent pacing', 'Minimal second-guessing'],
    };

    if (ci >= 55 && changeRate >= 0.20) return {
        id: 'CAREFUL_METHODICAL',
        label: 'Careful & Methodical',
        emoji: '🔍',
        color: '#3b82f6',
        description: 'Regularly revisits and revises answers but ultimately converges on correct thinking. Reflects thorough checking behaviour common in high-performers.',
        traits: ['Thorough double-checking', 'Self-correcting mindset', 'Deliberate pacing'],
    };

    // Default / mixed
    return {
        id: 'BALANCED_LEARNER',
        label: 'Balanced Learner',
        emoji: '⚖️',
        color: '#6b7280',
        description: 'Shows a balanced mix of confidence and caution across the exam. No extreme behavioural signals detected.',
        traits: ['Moderate pacing', 'Moderate deliberation', 'Adaptable approach'],
    };
}

// ── Per-question breakdown ──────────────────────────────────────────────────
function buildQuestionBreakdown(byQuestion) {
    return Object.entries(byQuestion).map(([qNum, q]) => ({
        questionNumber: Number(qNum),
        avgAnswerMs: q.times.length ? Math.round(mean(q.times)) : null,
        answerChanges: q.changes,
        skipped: q.skips > 0,
        pauseCount: q.pauses,
        returnVisits: q.returnVisits,
        // Local confidence (0–100) for this question
        localConfidence: clamp(
            100
            - q.changes * 8
            - q.skips * 15
            - q.pauses * 5
            - (q.times.some(t => t > SLOW_ANSWER_MS) ? 10 : 0)
            + (q.times.some(t => t < FAST_ANSWER_MS && t > 0) ? 5 : 0),
            0, 100
        ),
    }));
}

// ── Master computation ──────────────────────────────────────────────────────
function computeCognitiveProfile(sessionId) {
    const { byQuestion, globalPauses, answerTimes } = parseEvents(sessionId);
    const totalQ = Math.max(Object.keys(byQuestion).length, 1);

    const ci = computeConfidenceIndex(byQuestion, totalQ);
    const sl = computeStressLevel(byQuestion, answerTimes, globalPauses);

    // Aggregate rates
    const totalChanges = Object.values(byQuestion).reduce((s, q) => s + q.changes, 0);
    const totalSkips = Object.values(byQuestion).reduce((s, q) => s + q.skips, 0);
    const changeRate = totalChanges / totalQ;
    const skipRate = totalSkips / totalQ;
    const avgAnswerMs = answerTimes.length ? Math.round(mean(answerTimes)) : 0;

    const profile = classifyProfile(ci, sl, skipRate, changeRate, avgAnswerMs);
    const breakdown = buildQuestionBreakdown(byQuestion);

    return {
        sessionId,
        confidenceIndex: ci,
        stressLevel: sl,
        profile,
        stats: {
            totalQuestions: totalQ,
            avgAnswerMs,
            totalAnswerChanges: totalChanges,
            totalSkips,
            totalPauses: globalPauses.length,
            changeRate: parseFloat(changeRate.toFixed(3)),
            skipRate: parseFloat(skipRate.toFixed(3)),
            answerTimeStdDevMs: Math.round(stddev(answerTimes)),
        },
        questionBreakdown: breakdown,
        computedAt: new Date().toISOString(),
    };
}

// ── Persist profile to DB ───────────────────────────────────────────────────
function saveCognitiveProfile(profile) {
    db.prepare(`
        INSERT OR REPLACE INTO cognitive_profiles
          (session_id, confidence_index, stress_level, profile_id, profile_label,
           profile_emoji, profile_color, profile_desc, stats_json, breakdown_json, computed_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `).run(
        profile.sessionId,
        profile.confidenceIndex,
        profile.stressLevel,
        profile.profile.id,
        profile.profile.label,
        profile.profile.emoji,
        profile.profile.color,
        profile.profile.description,
        JSON.stringify(profile.stats),
        JSON.stringify(profile.questionBreakdown),
        profile.computedAt,
    );
}

// ── Retrieve stored profile ─────────────────────────────────────────────────
function getCognitiveProfile(sessionId) {
    return db.prepare(`SELECT * FROM cognitive_profiles WHERE session_id = ?`).get(sessionId);
}

module.exports = { computeCognitiveProfile, saveCognitiveProfile, getCognitiveProfile };
