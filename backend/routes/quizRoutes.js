const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const QuizAttempt = require('../models/QuizAttempt');

const router = express.Router();

const OLLAMA_URL = 'http://127.0.0.1:11434/api/chat';
const OLLAMA_MODEL = 'qwen2.5:3b';

// POST /api/quiz/generate
router.post('/generate', authMiddleware, async (req, res) => {
    try {
        const { subject, difficulty } = req.body;

        const allowedDifficulties = ['Easy', 'Medium', 'Hard'];

        if (
            typeof subject !== 'string' ||
            !subject.trim() ||
            subject.trim().length > 100
        ) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid subject.'
            });
        }

        if (!allowedDifficulties.includes(difficulty)) {
            return res.status(400).json({
                success: false,
                message: 'Difficulty must be Easy, Medium, or Hard.'
            });
        }

        const prompt = `
Create exactly 5 multiple-choice quiz questions for a B.Tech student.

Subject: ${subject.trim()}
Difficulty: ${difficulty}

Return ONLY valid JSON in this format:
{
  "questions": [
    {
      "question": "Question text",
      "options": [
        "Option A",
        "Option B",
        "Option C",
        "Option D"
      ],
      "correctAnswer": 0,
      "explanation": "Short explanation"
    }
  ]
}

STRICT RULES:
- Generate exactly 5 questions.
- Each question must be relevant to the specified subject.
- Each question must contain a non-empty question string.
- Each question must have exactly 4 non-empty string options.
- correctAnswer must be an integer from 0 to 3.
- explanation must be a non-empty string.
- There must be exactly one correct option per question.
- Do not use Markdown fences.
- Do not include text outside the JSON object.
`;

        const ollamaResponse = await fetch(OLLAMA_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                stream: false,
                format: 'json',
                messages: [
                    {
                        role: 'system',
                        content:
                            'You are an educational quiz generator. Follow the requested JSON structure exactly. Return five valid multiple-choice questions with four options each. The correctAnswer field must be a zero-based integer from 0 to 3.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                options: {
                    temperature: 0.2
                }
            }),
            signal: AbortSignal.timeout(120000)
        });

        if (!ollamaResponse.ok) {
            throw new Error(
                `Ollama returned status ${ollamaResponse.status}`
            );
        }

        const data = await ollamaResponse.json();
        const rawAnswer = data.message?.content;

        if (!rawAnswer) {
            throw new Error('Ollama returned an empty response.');
        }

        let quiz;

        try {
            quiz = JSON.parse(rawAnswer);
        } catch (parseError) {
            console.error('Invalid JSON from Ollama:', rawAnswer);
            throw new Error('Ollama returned invalid JSON.');
        }

        if (
            !quiz ||
            !Array.isArray(quiz.questions) ||
            quiz.questions.length !== 5
        ) {
            console.error(
                'Unexpected quiz structure:',
                JSON.stringify(quiz, null, 2)
            );

            throw new Error(
                'The generated quiz did not contain exactly 5 questions.'
            );
        }

        const validQuestions = quiz.questions.every(
            (question, index) => {
                const valid =
                    question &&
                    typeof question.question === 'string' &&
                    question.question.trim().length > 0 &&
                    Array.isArray(question.options) &&
                    question.options.length === 4 &&
                    question.options.every(
                        (option) =>
                            typeof option === 'string' &&
                            option.trim().length > 0
                    ) &&
                    Number.isInteger(question.correctAnswer) &&
                    question.correctAnswer >= 0 &&
                    question.correctAnswer <= 3 &&
                    typeof question.explanation === 'string' &&
                    question.explanation.trim().length > 0;

                if (!valid) {
                    console.error(
                        `Invalid question at index ${index}:`,
                        JSON.stringify(question, null, 2)
                    );
                }

                return valid;
            }
        );

        if (!validQuestions) {
            console.error(
                'Ollama generated quiz:',
                JSON.stringify(quiz, null, 2)
            );

            throw new Error(
                'The generated quiz had an invalid question format.'
            );
        }

        return res.json({
            success: true,
            subject: subject.trim(),
            difficulty,
            questions: quiz.questions
        });
    } catch (error) {
        console.error('Quiz generation error:', error.message);

        return res.status(502).json({
            success: false,
            message:
                'Unable to generate the quiz right now. Please try again.'
        });
    }
});

// POST /api/quiz/history
// Save a completed quiz attempt
router.post('/history', authMiddleware, async (req, res) => {
    try {
        const {
            subject,
            difficulty,
            score,
            totalQuestions
        } = req.body;

        const allowedDifficulties = ['Easy', 'Medium', 'Hard'];

        if (
            typeof subject !== 'string' ||
            !subject.trim() ||
            subject.trim().length > 100
        ) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid subject.'
            });
        }

        if (!allowedDifficulties.includes(difficulty)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid difficulty level.'
            });
        }

        if (
            !Number.isInteger(score) ||
            !Number.isInteger(totalQuestions) ||
            totalQuestions !== 5 ||
            score < 0 ||
            score > totalQuestions
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid quiz score.'
            });
        }

        const percentage = Math.round(
            (score / totalQuestions) * 100
        );

        const attempt = await QuizAttempt.create({
            studentId: req.student.id,
            subject: subject.trim(),
            difficulty,
            score,
            totalQuestions,
            percentage
        });

        return res.status(201).json({
            success: true,
            message: 'Quiz attempt saved successfully.',
            attempt
        });
    } catch (error) {
        console.error(
            'Save quiz history error:',
            error.message
        );

        return res.status(500).json({
            success: false,
            message: 'Unable to save quiz history.'
        });
    }
});

// GET /api/quiz/history
// Get the logged-in student's quiz history
router.get('/history', authMiddleware, async (req, res) => {
    try {
        const history = await QuizAttempt.find({
            studentId: req.student.id
        })
            .sort({ createdAt: -1 })
            .limit(50)
            .select(
                'subject difficulty score totalQuestions percentage createdAt'
            );

        return res.json({
            success: true,
            history
        });
    } catch (error) {
        console.error(
            'Quiz history error:',
            error.message
        );

        return res.status(500).json({
            success: false,
            message: 'Unable to retrieve quiz history.'
        });
    }
});

module.exports = router;
