/**
 * ══════════════════════════════════════════════════════════════════
 *  ANTI-CHEAT DETECTION ENGINE  —  Tutorai
 *  Risk Index: 0 (clean) → 100 (critical)
 * ══════════════════════════════════════════════════════════════════
 *
 *  Signals tracked:
 *  ┌─────────────────────────────────┬────────┬────────────────────────────────┐
 *  │ Signal                          │ Weight │ Logic                          │
 *  ├─────────────────────────────────┼────────┼────────────────────────────────┤
 *  │ Copy-paste events               │  +25   │ Any paste in answer area       │
 *  │ Tab / window switches           │  +15   │ Each focus-out during question  │
 *  │ Speed anomalies                 │  +20   │ Answer < threshold for diff    │
 *  │ Correctness spike               │  +20   │ Sudden jump after wrong streak │
 *  │ Pattern similarity (vs others)  │  +30   │ Jaccard on answer sequences    │
 *  └─────────────────────────────────┴────────┴────────────────────────────────┘
 *
 *  Risk levels:
 *    0  – 20   ✅  low
 *    21 – 40   ⚠️  moderate
 *    41 – 70   🟠  high
 *    71 – 100  🔴  critical
 */

const db = require('../db/index');
const { v4: uuidv4 } = require('uuid');

// ─── Speed thresholds (ms) per difficulty band ───────────────────────────────
// Below these times → suspiciously fast answer
const SPEED_THRESHOLDS = {
    easy: 4_000,   // < 4 s on easy questions
    medium: 7_000,   // < 7 s on medium
    hard: 10_000,  // < 10 s on hard
};

function difficultyBand(diff) {
    if (diff < 4) return 'easy';
    if (diff < 7) return 'medium';
    return 'hard';
}

// ─── Jaccard similarity between two answer sequences ─────────────────────────
function jaccardSimilarity(seqA, seqB) {
    if (!seqA.length || !seqB.length) return 0;
    const setA = new Set(seqA.map((a, i) => `${i}:${a}`));   // position-keyed
    const setB = new Set(seqB.map((a, i) => `${i}:${a}`));
    const intersection = [...setA].filter(x => setB.has(x)).length;
    const union = new Set([...setA, ...setB]).size;
    return union === 0 ? 0 : intersection / union;
}

// ─── Consecutive-run similarity (exact same sequence of N) ───────────────────
function longestCommonRun(seqA, seqB) {
    let maxRun = 0, current = 0;
    const len = Math.min(seqA.length, seqB.length);
    for (let i = 0; i < len; i++) {
        if (seqA[i] === seqB[i]) { current++; maxRun = Math.max(maxRun, current); }
        else { current = 0; }
    }
    return maxRun;
}

// ─── Correctness-spike detector ──────────────────────────────────────────────
// Returns spike magnitude: how many consecutive correct answers appeared
// after ≥2 consecutive wrong ones
function correctnessSpike(answers) {
    let wrongStreak = 0, maxSpike = 0, inWrong = false;
    for (const a of answers) {
        if (!a.is_correct) { wrongStreak++; inWrong = wrongStreak >= 2; }
        else if (inWrong) {
            let spike = 1;
            const idx = answers.indexOf(a);
            for (let j = idx + 1; j < answers.length && answers[j].is_correct; j++) spike++;
            maxSpike = Math.max(maxSpike, spike);
            wrongStreak = 0; inWrong = false;
        } else { wrongStreak = 0; }
    }
    return maxSpike;
}

// ─── Main risk calculator ─────────────────────────────────────────────────────
function computeRiskIndex(sessionId) {
    const events = db.prepare(`SELECT * FROM cheat_events WHERE session_id = ?`).all(sessionId);
    const answers = db.prepare(
        `SELECT * FROM adaptive_answers WHERE session_id = ? ORDER BY question_number ASC`
    ).all(sessionId);
    const session = db.prepare(`SELECT * FROM adaptive_sessions WHERE id = ?`).get(sessionId);

    if (!session || !answers.length) return null;

    let riskScore = 0;
    const details = { signals: [], breakdown: {} };

    // ── 1. COPY-PASTE ──────────────────────────────────────────────────────────
    const pastes = events.filter(e => e.event_type === 'paste');
    const pasteCount = pastes.length;
    if (pasteCount > 0) {
        const pasteScore = Math.min(25, pasteCount * 12);
        riskScore += pasteScore;
        details.signals.push({
            type: 'paste', count: pasteCount, score: pasteScore,
            desc: `${pasteCount} paste action${pasteCount > 1 ? 's' : ''} detected during exam`
        });
    }
    details.breakdown.paste_events = pasteCount;

    // ── 2. TAB / WINDOW SWITCHES ───────────────────────────────────────────────
    const tabSwitches = events.filter(e => e.event_type === 'tab_switch' || e.event_type === 'blur');
    const switchCount = tabSwitches.length;
    if (switchCount >= 2) {
        const switchScore = Math.min(15, switchCount * 4);
        riskScore += switchScore;
        details.signals.push({
            type: 'tab_switch', count: switchCount, score: switchScore,
            desc: `Left exam window ${switchCount} time${switchCount > 1 ? 's' : ''}`
        });
    }
    details.breakdown.tab_switches = switchCount;

    // ── 3. SPEED ANOMALIES ────────────────────────────────────────────────────
    const timeEvents = events.filter(e => e.event_type === 'answer_time');
    let speedFlags = 0;
    const times = [];
    for (const te of timeEvents) {
        const val = JSON.parse(te.value_json || '{}');
        const ms = val.time_ms || 0;
        const diff = val.difficulty || 5;
        times.push(ms);
        const threshold = SPEED_THRESHOLDS[difficultyBand(diff)];
        if (ms > 0 && ms < threshold) speedFlags++;
    }
    if (speedFlags >= 2) {
        const speedScore = Math.min(20, speedFlags * 5);
        riskScore += speedScore;
        details.signals.push({
            type: 'speed', count: speedFlags, score: speedScore,
            desc: `${speedFlags} answers submitted suspiciously fast`
        });
    }
    details.breakdown.speed_flags = speedFlags;
    details.breakdown.avg_answer_time_ms = times.length
        ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
    details.breakdown.min_answer_time_ms = times.length ? Math.min(...times) : 0;

    // ── 4. CORRECTNESS SPIKE ─────────────────────────────────────────────────
    const spike = correctnessSpike(answers);
    if (spike >= 3) {
        const spikeScore = Math.min(20, spike * 5);
        riskScore += spikeScore;
        details.signals.push({
            type: 'spike', value: spike, score: spikeScore,
            desc: `${spike} consecutive correct answers after wrong streak`
        });
    }
    details.breakdown.correctness_spike = spike;

    // ── 5. CROSS-STUDENT PATTERN SIMILARITY ──────────────────────────────────
    const myAnswers = answers.map(a => a.student_answer);
    const otherSessions = db.prepare(`
    SELECT s.id FROM adaptive_sessions s
    WHERE s.subject = ? AND s.status = 'completed'
      AND s.student_id != ? AND s.id != ?
    ORDER BY s.completed_at DESC LIMIT 50
  `).all(session.subject, session.student_id, sessionId);

    let maxSimilarity = 0;
    let maxRun = 0;
    for (const other of otherSessions) {
        const otherAnswers = db.prepare(
            `SELECT student_answer FROM adaptive_answers WHERE session_id = ? ORDER BY question_number ASC`
        ).all(other.id).map(a => a.student_answer);
        const sim = jaccardSimilarity(myAnswers, otherAnswers);
        const run = longestCommonRun(myAnswers, otherAnswers);
        if (sim > maxSimilarity) maxSimilarity = sim;
        if (run > maxRun) maxRun = run;
    }

    if (maxSimilarity > 0.80) {
        const simScore = Math.min(30, Math.round((maxSimilarity - 0.80) / 0.20 * 30));
        riskScore += simScore;
        details.signals.push({
            type: 'similarity', value: maxSimilarity.toFixed(2), score: simScore,
            desc: `Answer pattern is ${(maxSimilarity * 100).toFixed(0)}% similar to another student`
        });
    }
    if (maxRun >= 5) {
        const runScore = Math.min(20, maxRun * 2);
        riskScore += runScore;
        details.signals.push({
            type: 'identical_run', value: maxRun, score: runScore,
            desc: `${maxRun} consecutive identical answers with another student`
        });
    }
    details.breakdown.pattern_similarity = parseFloat(maxSimilarity.toFixed(3));
    details.breakdown.longest_identical_run = maxRun;

    // ── FINAL SCORE & LEVEL ───────────────────────────────────────────────────
    riskScore = Math.min(100, Math.round(riskScore));
    const riskLevel =
        riskScore <= 20 ? 'low' :
            riskScore <= 40 ? 'moderate' :
                riskScore <= 70 ? 'high' : 'critical';

    return {
        session_id: sessionId,
        risk_index: riskScore,
        risk_level: riskLevel,
        paste_events: details.breakdown.paste_events,
        tab_switches: details.breakdown.tab_switches,
        speed_flags: details.breakdown.speed_flags,
        correctness_spike: details.breakdown.correctness_spike,
        pattern_similarity: details.breakdown.pattern_similarity,
        avg_answer_time_ms: details.breakdown.avg_answer_time_ms,
        min_answer_time_ms: details.breakdown.min_answer_time_ms,
        details_json: JSON.stringify(details),
    };
}

// ─── Save report + update session ────────────────────────────────────────────
function saveReport(report) {
    db.prepare(`
    INSERT OR REPLACE INTO anti_cheat_reports
      (session_id, risk_index, risk_level, paste_events, tab_switches, speed_flags,
       correctness_spike, pattern_similarity, avg_answer_time_ms, min_answer_time_ms, details_json)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `).run(
        report.session_id, report.risk_index, report.risk_level,
        report.paste_events, report.tab_switches, report.speed_flags,
        report.correctness_spike, report.pattern_similarity,
        report.avg_answer_time_ms, report.min_answer_time_ms, report.details_json
    );

    db.prepare(`UPDATE adaptive_sessions SET risk_index = ?, risk_level = ? WHERE id = ?`)
        .run(report.risk_index, report.risk_level, report.session_id);
}

// ─── Record a raw event from frontend ────────────────────────────────────────
function recordEvent(sessionId, eventType, questionNumber, valueJson) {
    db.prepare(`
    INSERT INTO cheat_events (id, session_id, event_type, question_number, value_json)
    VALUES (?, ?, ?, ?, ?)
  `).run(uuidv4(), sessionId, eventType, questionNumber, JSON.stringify(valueJson || {}));
}

// ─── Get report for teacher view ─────────────────────────────────────────────
function getReport(sessionId) {
    return db.prepare(`SELECT * FROM anti_cheat_reports WHERE session_id = ?`).get(sessionId);
}

module.exports = { computeRiskIndex, saveReport, recordEvent, getReport };
