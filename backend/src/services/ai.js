const OpenAI = require('openai');

// ─── Gemini via OpenAI-compatible endpoint ───────────────────────────────────
// No new packages needed — just point the OpenAI client at Google's endpoint.
// Get your key at: https://aistudio.google.com/app/apikey
const openai = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
});

const MODEL = 'gemini-2.5-flash';   // confirmed working — fast & free tier friendly

// ─── Generate a full test (5 questions) ─────────────────────────────────────
async function generateTestContent(subjectName, difficulty) {
    try {
        const completion = await openai.chat.completions.create({
            model: MODEL,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert tutor. Generate a multiple-choice test in JSON format.',
                },
                {
                    role: 'user',
                    content: `Generate 5 multiple-choice questions for ${subjectName} at ${difficulty} difficulty.
Return a JSON object with a "questions" key containing an array of objects, where each object has:
- question_text (string)
- options (array of 4 strings)
- correct_answer (string, must exactly match one of the options)
- explanation (string, explaining why the answer is correct)
- topic (string, specific subtopic)`,
                },
            ],
        });

        const parsed = JSON.parse(completion.choices[0].message.content);
        return parsed.questions || [];
    } catch (error) {
        console.error('AI test generation failed:', error.message);
        throw error;
    }
}

// ─── Analyse wrong answers, return recommendations ───────────────────────────
async function analyzeMistakesAndRecommend(wrongAnswers) {
    try {
        const completion = await openai.chat.completions.create({
            model: MODEL,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert tutor analysing a student\'s mistakes. Respond with JSON only.',
                },
                {
                    role: 'user',
                    content: `Analyse these missed questions and provide recommendations.
Questions: ${JSON.stringify(wrongAnswers)}

Return a JSON object with a "recommendations" key containing an array of objects, where each object has:
- topic (string)
- material (string, short study advice)`,
                },
            ],
        });

        const parsed = JSON.parse(completion.choices[0].message.content);
        return parsed.recommendations || [];
    } catch (error) {
        console.error('AI analysis failed:', error.message);
        return [];
    }
}

// ─── Generate ONE adaptive question at a given difficulty ────────────────────
async function generateAdaptiveQuestion(subject, difficulty) {
    const diffLabel =
        difficulty < 2 ? 'very easy (basic recall)' :
            difficulty < 4 ? 'easy (foundational understanding)' :
                difficulty < 6 ? 'medium (application of concepts)' :
                    difficulty < 8 ? 'hard (analysis and synthesis)' :
                        'very hard (expert-level reasoning)';

    try {
        const completion = await openai.chat.completions.create({
            model: MODEL,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert educator. Generate exactly ONE multiple-choice question in JSON format.',
                },
                {
                    role: 'user',
                    content: `Generate ONE ${diffLabel} question for the subject: ${subject}.
The difficulty level is ${difficulty.toFixed(1)} on a scale of 1-10.
Return a JSON object with these exact keys:
- question_text (string)
- options (array of exactly 4 strings)
- correct_answer (string, must exactly match one option)
- explanation (string, why the answer is correct)
- topic (string, the specific subtopic this question covers)`,
                },
            ],
        });

        return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
        console.error('Adaptive question generation failed:', error.message);
        throw error;
    }
}

// ─── Generate a full AI Mentor session ───────────────────────────────────────
async function generateMentorSession({ wrongAnswers, subject, skillLevel, studentName }) {
    const skillLabel =
        skillLevel < 2 ? 'Beginner' :
            skillLevel < 4 ? 'Elementary' :
                skillLevel < 6 ? 'Intermediate' :
                    skillLevel < 8 ? 'Advanced' : 'Expert';

    const prompt = wrongAnswers.length === 0
        ? `The student "${studentName}" scored 100% on a ${subject} exam (skill: ${skillLabel}).
           Generate encouragement, 1 advanced challenge topic, a 2-week plan to reach expert level, and 3 challenge mini-test questions.`
        : `You are an expert AI tutor. Analyse this student's mistakes and create a personalised learning session.

Student: ${studentName}
Subject: ${subject}
Current level: ${skillLabel} (${skillLevel?.toFixed(1) ?? '5.0'}/10)
Mistakes made:
${JSON.stringify(wrongAnswers, null, 2)}

Return ONLY a JSON object with this exact structure:
{
  "overallAnalysis": "2-3 sentences: what went well, what needs work, encouraging tone",
  "weakTopics": [
    {
      "topic": "topic name",
      "errorPattern": "what mistake the student keeps making",
      "explanation": "Simple 2-3 sentence explanation a 12-year-old could understand",
      "analogy": "one real-world analogy or example to make it click",
      "tip": "one concrete study action"
    }
  ],
  "studyPlan": [
    {
      "week": 1,
      "title": "short focus area title",
      "goal": "what the student will be able to do after this week",
      "tasks": ["specific task 1", "specific task 2", "specific task 3"],
      "duration": "X hours/week"
    }
  ],
  "miniTest": [
    {
      "question": "question text targeting a weak topic",
      "options": ["option A", "option B", "option C", "option D"],
      "correct_answer": "the exact correct option text",
      "explanation": "why this is correct, addressing the common mistake"
    }
  ]
}

Provide 2-4 weak topics, a 3-week study plan, exactly 3 mini-test questions. Keep language simple and encouraging.`;

    try {
        const completion = await openai.chat.completions.create({
            model: MODEL,
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: 'You are an expert, encouraging AI tutor. Always respond with valid JSON.' },
                { role: 'user', content: prompt },
            ],
        });
        return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
        console.error('Mentor session generation failed:', error.message);
        throw error;
    }
}

module.exports = { generateTestContent, analyzeMistakesAndRecommend, generateAdaptiveQuestion, generateMentorSession, generateOralQuestion, evaluateOralAnswer };

// ─── Generate an open-ended oral exam question ──────────────────────────────
async function generateOralQuestion(subject, difficulty, questionNumber, previousTopics = []) {
    const diffLabel =
        difficulty === 'easy' ? 'basic, conceptual' :
            difficulty === 'medium' ? 'intermediate, requiring explanation' :
                'advanced, requiring analysis and examples';

    const avoidTopics = previousTopics.length
        ? `Do NOT repeat these topics: ${previousTopics.join(', ')}.` : '';

    try {
        const completion = await openai.chat.completions.create({
            model: MODEL,
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: 'You are an expert oral examiner. Generate open-ended questions for spoken answers. Return valid JSON.' },
                {
                    role: 'user', content: `Generate ONE ${diffLabel} open-ended question for a spoken oral exam on the subject: "${subject}".
Question #${questionNumber}. ${avoidTopics}
The student will SPEAK their answer aloud (30-90 seconds). The question should encourage explanation, reasoning, and examples.

Return JSON:
{
  "question": "The full question text",
  "topic": "specific subtopic",
  "ideal_answer_points": ["key point 1", "key point 2", "key point 3"],
  "follow_up": "A follow-up question to probe deeper understanding",
  "time_hint": "Recommended speaking time in seconds (30-90)"
}` }
            ],
        });
        return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
        console.error('Oral question generation failed:', error.message);
        throw error;
    }
}

// ─── Evaluate a transcribed oral answer ────────────────────────────────────
async function evaluateOralAnswer({ question, transcript, idealPoints, subject, language = 'en' }) {
    if (!transcript || transcript.trim().length < 5) {
        return {
            totalScore: 0, grade: 'F',
            dimensions: {
                relevance: { score: 0, max: 30, feedback: 'No answer provided.' },
                grammar: { score: 0, max: 20, feedback: 'No answer to evaluate.' },
                depth: { score: 0, max: 25, feedback: 'No answer to evaluate.' },
                communication: { score: 0, max: 25, feedback: 'No answer to evaluate.' },
            },
            overallFeedback: 'The student did not provide a spoken answer.',
            strengths: [],
            improvements: ['Please speak your answer aloud.'],
            wordCount: 0,
        };
    }

    const wordCount = transcript.trim().split(/\s+/).length;

    try {
        const completion = await openai.chat.completions.create({
            model: MODEL,
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: 'You are an expert oral examiner and language evaluator. Score spoken answers fairly and constructively. Return valid JSON only.' },
                {
                    role: 'user', content: `Evaluate this student's SPOKEN answer for an oral exam.

Subject: ${subject}
Question: ${question}
Ideal answer should cover: ${JSON.stringify(idealPoints)}
Student's transcribed answer: "${transcript}"
Word count: ${wordCount}

Score on 4 dimensions. Return JSON:
{
  "dimensions": {
    "relevance":     { "score": 0-30, "feedback": "specific feedback" },
    "grammar":       { "score": 0-20, "feedback": "grammar and language quality" },
    "depth":         { "score": 0-25, "feedback": "depth, detail, examples" },
    "communication": { "score": 0-25, "feedback": "clarity, structure, fluency" }
  },
  "overallFeedback": "2-3 sentence overall assessment, encouraging tone",
  "strengths": ["specific strength 1", "specific strength 2"],
  "improvements": ["specific improvement 1", "specific improvement 2"],
  "missedPoints": ["key point not covered"]
}

Be fair: consider this is a spoken answer (informal grammar is acceptable). Focus on understanding and communication.` }
            ],
        });

        const result = JSON.parse(completion.choices[0].message.content);
        const dims = result.dimensions || {};
        const totalScore = Math.round(
            (dims.relevance?.score || 0) +
            (dims.grammar?.score || 0) +
            (dims.depth?.score || 0) +
            (dims.communication?.score || 0)
        );
        const grade = totalScore >= 90 ? 'A+' : totalScore >= 80 ? 'A' : totalScore >= 70 ? 'B' :
            totalScore >= 60 ? 'C' : totalScore >= 50 ? 'D' : 'F';

        return { ...result, totalScore, grade, wordCount };
    } catch (error) {
        console.error('Oral answer evaluation failed:', error.message);
        throw error;
    }
}
