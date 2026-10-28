const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const Subject = require('../models/Subject');

const router = express.Router();

const OLLAMA_URL = 'http://127.0.0.1:11434/api/chat';
const OLLAMA_MODEL = 'qwen2.5:3b';

// POST /api/ai/chat
// Generate answers using the student's own academic records.
router.post('/chat', authMiddleware, async (req, res) => {
    try {
        const { message } = req.body;

        if (typeof message !== 'string' || !message.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a question.'
            });
        }

        if (message.length > 2000) {
            return res.status(400).json({
                success: false,
                message: 'Your question must be 2000 characters or fewer.'
            });
        }

        // Fetch only the authenticated student's subjects.
        const subjects = await Subject.find({
            student: req.student.id
        })
            .select('subjectName obtainedMarks totalMarks semester')
            .sort({ subjectName: 1 })
            .lean();

        // Calculate each subject's percentage and performance level.
        const academicRecords = subjects.map((subject) => {
            const percentage = Math.round(
                (subject.obtainedMarks / subject.totalMarks) * 100
            );

            let performance = 'Needs Improvement';

            if (percentage >= 80) {
                performance = 'Strong';
            } else if (percentage >= 60) {
                performance = 'Good';
            }

            return {
                subject: subject.subjectName,
                marks: `${subject.obtainedMarks}/${subject.totalMarks}`,
                percentage,
                performance,
                semester: subject.semester
            };
        });

        const averageScore = academicRecords.length > 0
            ? (
                academicRecords.reduce(
                    (total, subject) => total + subject.percentage,
                    0
                ) / academicRecords.length
            ).toFixed(1)
            : null;

        const weakestSubject = academicRecords.length > 0
            ? academicRecords.reduce((weakest, subject) =>
                subject.percentage < weakest.percentage
                    ? subject
                    : weakest
            )
            : null;

        const strongSubjects = academicRecords.filter(
            (subject) => subject.percentage >= 80
        );

        let academicContext;

        if (academicRecords.length > 0) {
            const subjectSummary = academicRecords.map((subject) =>
                `- ${subject.subject}: ${subject.marks} ` +
                `(${subject.percentage}%), Performance: ${subject.performance}, ` +
                `Semester: ${subject.semester}`
            ).join('\n');

            academicContext = `
STUDENT ACADEMIC CONTEXT:
These records belong to the currently authenticated student.

Subjects and performance:
${subjectSummary}

Average score across recorded subjects: ${averageScore}%

Strong subjects (80% or above):
${strongSubjects.map((subject) => subject.subject).join(', ') || 'None'}

Lowest-scoring subject:
${weakestSubject.subject} (${weakestSubject.percentage}%)

Personalization rules:
- Use these records for personalized academic recommendations.
- When asked which subject needs attention, consider the lowest-scoring subjects.
- Suggest practical study steps, revision topics, and practice questions.
- Do not invent marks, subjects, or student information.
- For general academic questions, answer normally.
`;
        } else {
            academicContext = `
STUDENT ACADEMIC CONTEXT:
No academic records are currently available for this student.
Answer general academic questions normally.
Do not invent marks, subjects, or academic performance.
If the student asks for personalized performance advice, explain that subject records are needed first.
`;
        }

        const systemPrompt =
    'You are GradWise, a reliable AI learning assistant for B.Tech students. ' +
    'Explain concepts in simple, student-friendly language. ' +
    'Prioritize technical accuracy over generating long answers. ' +
    'Use standard, recognized technical terms and algorithms. ' +
    'Never invent algorithms, abbreviations, formulas, or technical concepts. ' +
    'Distinguish clearly between memory allocation techniques, page replacement algorithms, and CPU scheduling algorithms. ' +
    'For Operating Systems, use recognized examples such as First Fit, Best Fit, Worst Fit, FIFO, and LRU only in their correct contexts. ' +
    'When suggesting a study plan, focus on standard B.Tech syllabus topics and practical revision tasks. ' +
    'If uncertain about a technical fact, acknowledge the uncertainty rather than guessing. ' +
    'Use normal Markdown formatting with clear headings, numbered lists, and bullet points when helpful. ' +
    'Avoid unnecessary repetition and keep recommendations practical.\n\n' +
    'For multi-day study plans, assign a distinct main topic to each day and avoid repeating topics unless it is a planned revision session. ' +
'Include a balanced mix of concept learning, practice questions, and revision. ' +
'Present the weakest subject, strongest subject, and average score once, then focus on actionable recommendations.\n\n' +
    academicContext;

        const ollamaResponse = await fetch(OLLAMA_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                stream: false,
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: message.trim()
                    }
                ]
            }),
            signal: AbortSignal.timeout(120000)
        });

        if (!ollamaResponse.ok) {
            console.error(
                'Ollama returned status:',
                ollamaResponse.status
            );

            return res.status(502).json({
                success: false,
                message: 'The AI service could not process your question.'
            });
        }

        const data = await ollamaResponse.json();
        const answer = data.message?.content;

        if (!answer) {
            return res.status(502).json({
                success: false,
                message: 'The AI service returned an empty answer.'
            });
        }

        return res.status(200).json({
            success: true,
            answer
        });

    } catch (error) {
        console.error('AI chat error:', error.message);

        const isTimeout =
            error.name === 'TimeoutError' ||
            error.name === 'AbortError';

        return res.status(isTimeout ? 504 : 502).json({
            success: false,
            message: isTimeout
                ? 'The AI took too long to respond. Please try again.'
                : 'Unable to process your question. Check that MongoDB and Ollama are running.'
        });
    }
});

module.exports = router;