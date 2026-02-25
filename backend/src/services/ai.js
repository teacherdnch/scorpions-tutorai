const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function generateTestContent(subjectName, difficulty) {
    try {
        const completion = await openai.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are an expert tutor. Generate a multiple-choice test in JSON format."
                },
                {
                    role: "user",
                    content: `Generate 5 multiple-choice questions for ${subjectName} at ${difficulty} difficulty.
          Return a JSON object with a "questions" key containing an array of objects, where each object has:
          - question_text (string)
          - options (array of 4 strings)
          - correct_answer (string, must exactly match one of the options)
          - explanation (string, explaining why the answer is correct)
          - topic (string, specific subtopic)`
                }
            ],
            model: "gpt-3.5-turbo",
            response_format: { type: "json_object" },
        });

        const parsed = JSON.parse(completion.choices[0].message.content);
        return parsed.questions || [];
    } catch (error) {
        console.error("AI test generation failed:", error);
        throw error;
    }
}

async function analyzeMistakesAndRecommend(wrongAnswers) {
    try {
        const completion = await openai.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are an expert tutor analyzing a student's mistakes to provide recommendations in JSON format."
                },
                {
                    role: "user",
                    content: `Analyze these missed questions and provide recommendations.
          Questions: ${JSON.stringify(wrongAnswers)}
          
          Return a JSON object with a "recommendations" key containing an array of objects, where each object has:
          - topic (string)
          - material (string, short study advice)`
                }
            ],
            model: "gpt-3.5-turbo",
            response_format: { type: "json_object" },
        });

        const parsed = JSON.parse(completion.choices[0].message.content);
        return parsed.recommendations || [];
    } catch (error) {
        console.error("AI analysis failed:", error);
        return [];
    }
}

module.exports = { generateTestContent, analyzeMistakesAndRecommend };
