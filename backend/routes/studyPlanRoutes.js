const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const Subject = require('../models/Subject');
const StudyPlan = require('../models/StudyPlan');
const router = express.Router();

const OLLAMA_URL = 'http://127.0.0.1:11434/api/chat';
const OLLAMA_MODEL = 'qwen2.5:3b';

// POST /api/study-plan/generate
router.post('/generate', authMiddleware, async (req, res) => {
    try {
        const { dailyHours, days, prioritySubjects = [] } = req.body;

        // Validate daily study hours.
        if (
            !Number.isInteger(dailyHours) ||
            dailyHours < 1 ||
            dailyHours > 5
        ) {
            return res.status(400).json({
                success: false,
                message: 'Daily study hours must be between 1 and 5.'
            });
        }

        // Validate planning period.
        if (![7, 14, 30].includes(days)) {
            return res.status(400).json({
                success: false,
                message: 'Planning period must be 7, 14, or 30 days.'
            });
        }

        // Validate selected subjects.
        if (
            !Array.isArray(prioritySubjects) ||
            prioritySubjects.length > 50 ||
            !prioritySubjects.every(
                (subject) =>
                    typeof subject === 'string' &&
                    subject.trim().length > 0 &&
                    subject.length <= 150
            )
        ) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid list of priority subjects.'
            });
        }

        // Retrieve only the logged-in student's academic records.
        const subjects = await Subject.find({
            student: req.student.id
        })
            .select('subjectName obtainedMarks totalMarks semester')
            .sort({ subjectName: 1 })
            .lean();

        if (subjects.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No subject records found. Add subjects before creating a study plan.'
            });
        }

        // Prepare academic records and validate marks.
        const academicRecords = subjects.map((subject) => {
            const obtainedMarks = Number(subject.obtainedMarks);
            const totalMarks = Number(subject.totalMarks);

            const percentage =
                Number.isFinite(obtainedMarks) &&
                Number.isFinite(totalMarks) &&
                totalMarks > 0
                    ? Math.max(
                          0,
                          Math.min(
                              100,
                              Math.round((obtainedMarks / totalMarks) * 100)
                          )
                      )
                    : null;

            return {
                name: subject.subjectName.trim(),
                percentage,
                semester: subject.semester
            };
        });

        // Reject invalid or duplicate subject names.
        const actualSubjectNames = new Set(
            academicRecords.map((subject) => subject.name.toLowerCase())
        );

        if (
            academicRecords.some((subject) => !subject.name) ||
            actualSubjectNames.size !== academicRecords.length
        ) {
            return res.status(500).json({
                success: false,
                message: 'The subject records contain invalid or duplicate subject names.'
            });
        }

        // Match selected subjects against the student's real subjects.
        const requestedPriorities = new Set(
            prioritySubjects.map((name) => name.trim().toLowerCase())
        );

        const validPriorities = academicRecords
            .filter((subject) =>
                requestedPriorities.has(subject.name.toLowerCase())
            )
            .map((subject) => subject.name);

        // Reject invalid selections rather than silently ignoring them.
        if (requestedPriorities.size !== validPriorities.length &&
            [...requestedPriorities].some(
                (name) => !actualSubjectNames.has(name)
            )) {
            return res.status(400).json({
                success: false,
                message: 'One or more selected subjects were not found in your academic records.'
            });
        }

        const allowedSubjects =
            validPriorities.length > 0
                ? academicRecords.filter((subject) =>
                      validPriorities.some(
                          (name) =>
                              name.toLowerCase() === subject.name.toLowerCase()
                      )
                  )
                : academicRecords;

        const allowedSubjectNames = new Set(
            allowedSubjects.map((subject) => subject.name.toLowerCase())
        );

        const targetMinutes = dailyHours * 60;

        const systemPrompt = `
You are GradWise, an academic study-planning assistant for B.Tech students.

Create a realistic study timetable using the student's academic records.

STRICT RULES:
- Return ONLY valid JSON without Markdown or code fences.
- Create exactly ${days} day entries.
- Number the day entries consecutively from 1 to ${days}.
- Every day must contain study sessions totaling EXACTLY ${targetMinutes} minutes.
- Each session must have a positive integer durationMinutes.
- Every session subject MUST be one of the allowed subjects supplied by the user.
- Do not invent, rename, abbreviate, or introduce other subjects.
- If priority subjects are supplied, use ONLY those priority subjects throughout the timetable.
- If no priority subjects are supplied, use any of the student's allowed subjects.
- When scores are available, allocate more attention to lower-scoring allowed subjects.
- Distribute sessions across the allowed subjects when practical.
- Include a sensible mixture of concept learning, problem-solving, practice questions, and revision.
- Use relevant, broadly applicable B.Tech topics. Do not claim to know the student's exact syllabus.
- Avoid unnecessary repetition of topics, except for revision.
- The summary must accurately describe the generated plan.

Return this exact JSON structure:
{
  "title": "Personalized Study Plan",
  "dailyHours": ${dailyHours},
  "days": ${days},
  "summary": "A short explanation of the plan",
  "schedule": [
    {
      "day": 1,
      "sessions": [
        {
          "subject": "Exact allowed subject name",
          "durationMinutes": 60,
          "topic": "Study topic",
          "activity": "Specific learning activity"
        }
      ]
    }
  ]
}

The schedule array must contain exactly ${days} entries.
Every day's session durations must add up to exactly ${targetMinutes} minutes.
`;

        const userPrompt = `
Student academic records:
${JSON.stringify(academicRecords)}

Allowed subjects:
${JSON.stringify(allowedSubjects)}

${validPriorities.length > 0
    ? `The student selected these priority subjects. Use ONLY these subjects: ${JSON.stringify(validPriorities)}`
    : 'The student did not select priority subjects. Use the allowed subjects and prioritize lower scores.'}

Create a ${days}-day timetable with exactly ${dailyHours} hours of study per day.
`;

        // Ask Ollama to generate the timetable.
        const ollamaResponse = await fetch(OLLAMA_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                stream: false,
                format: 'json',
                options: {
                    temperature: 0.2
                },
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ]
            }),
            signal: AbortSignal.timeout(180000)
        });

        if (!ollamaResponse.ok) {
            console.error('Ollama study-plan status:', ollamaResponse.status);

            return res.status(502).json({
                success: false,
                message: 'The AI service could not generate your study plan.'
            });
        }

        const data = await ollamaResponse.json();
        const content = data.message?.content;

        if (!content) {
            return res.status(502).json({
                success: false,
                message: 'The AI returned an empty study plan.'
            });
        }

        let studyPlan;

        try {
            studyPlan = JSON.parse(content);
        } catch {
            return res.status(502).json({
                success: false,
                message: 'The AI returned invalid JSON. Please try again.'
            });
        }

        // Validate plan metadata and the overall structure.
        if (
            !studyPlan ||
            studyPlan.title !== 'Personalized Study Plan' ||
            studyPlan.dailyHours !== dailyHours ||
            studyPlan.days !== days ||
            typeof studyPlan.summary !== 'string' ||
            !studyPlan.summary.trim() ||
            !Array.isArray(studyPlan.schedule) ||
            studyPlan.schedule.length !== days
        ) {
            return res.status(502).json({
                success: false,
                message: 'The generated study plan had invalid metadata or structure. Please try again.'
            });
        }

        // Validate every day and every session.
        for (let index = 0; index < studyPlan.schedule.length; index++) {
            const entry = studyPlan.schedule[index];

            if (
                !entry ||
                entry.day !== index + 1 ||
                !Array.isArray(entry.sessions) ||
                entry.sessions.length === 0
            ) {
                return res.status(502).json({
                    success: false,
                    message: 'The generated timetable contains an invalid day. Please try again.'
                });
            }

            let totalMinutes = 0;

            for (const session of entry.sessions) {
                if (
                    !session ||
                    typeof session.subject !== 'string' ||
                    !session.subject.trim() ||
                    typeof session.topic !== 'string' ||
                    !session.topic.trim() ||
                    typeof session.activity !== 'string' ||
                    !session.activity.trim() ||
                    !Number.isInteger(session.durationMinutes) ||
                    session.durationMinutes <= 0 ||
                    session.durationMinutes > targetMinutes
                ) {
                    return res.status(502).json({
                        success: false,
                        message: 'The generated timetable contains an invalid study session. Please try again.'
                    });
                }

                const subjectName = session.subject.trim().toLowerCase();

                // Enforce selected-subject restrictions on the server.
                if (!allowedSubjectNames.has(subjectName)) {
                    return res.status(502).json({
                        success: false,
                        message: validPriorities.length > 0
                            ? 'The AI included a subject outside your selected priorities. Please generate the plan again.'
                            : 'The AI included a subject not in your academic records. Please try again.'
                    });
                }

                // Normalize the subject to its exact database spelling.
                const actualSubject = allowedSubjects.find(
                    (subject) => subject.name.toLowerCase() === subjectName
                );

                session.subject = actualSubject.name;

                totalMinutes += session.durationMinutes;
            }

            // Enforce the selected daily study duration.
            if (totalMinutes !== targetMinutes) {
                return res.status(502).json({
                    success: false,
                    message: `The AI generated ${totalMinutes} study minutes for Day ${index + 1}, but ${targetMinutes} minutes are required. Please generate the plan again.`
                });
            }
        }

        // Return only the validated study plan.
        return res.status(200).json({
            success: true,
            studyPlan
        });
    } catch (error) {
        console.error('Study-plan generation error:', error.message);

        const isTimeout =
            error.name === 'TimeoutError' ||
            error.name === 'AbortError';

        return res.status(isTimeout ? 504 : 502).json({
            success: false,
            message: isTimeout
                ? 'Study-plan generation took too long. Please try again.'
                : 'Unable to generate your study plan. Check that MongoDB and Ollama are running.'
        });
    }
});
// GET /api/study-plan/current
// Retrieve the logged-in student's latest saved study plan.
router.get('/current', authMiddleware, async (req, res) => {
    try {
        const studyPlan = await StudyPlan.findOne({
            studentId: req.student.id
        }).sort({ updatedAt: -1 });

        if (!studyPlan) {
            return res.status(404).json({
                success: false,
                message: 'No saved study plan found.'
            });
        }

        return res.status(200).json({
            success: true,
            studyPlan
        });
    } catch (error) {
        console.error('Retrieve study plan error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Unable to retrieve your saved study plan.'
        });
    }
});
// POST /api/study-plan/save
// Save the generated study plan for the logged-in student.
router.post('/save', authMiddleware, async (req, res) => {
    try {
        const {
            title,
            dailyHours,
            days,
            summary,
            prioritySubjects = [],
            schedule
        } = req.body;

        // Validate the basic study-plan information.
        if (
            !Number.isInteger(dailyHours) ||
            dailyHours < 1 ||
            dailyHours > 5 ||
            ![7, 14, 30].includes(days) ||
            !Array.isArray(schedule) ||
            schedule.length !== days
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid study-plan information.'
            });
        }

        // Ensure every day contains valid sessions.
        for (let i = 0; i < schedule.length; i++) {
            const day = schedule[i];

            if (
                !day ||
                day.day !== i + 1 ||
                !Array.isArray(day.sessions) ||
                day.sessions.length === 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'The study plan contains an invalid day.'
                });
            }

            for (const session of day.sessions) {
                if (
                    !session ||
                    typeof session.subject !== 'string' ||
                    !session.subject.trim() ||
                    typeof session.topic !== 'string' ||
                    !session.topic.trim() ||
                    typeof session.activity !== 'string' ||
                    !session.activity.trim() ||
                    !Number.isInteger(session.durationMinutes) ||
                    session.durationMinutes <= 0
                ) {
                    return res.status(400).json({
                        success: false,
                        message: 'The study plan contains an invalid session.'
                    });
                }
            }
        }

        // Save a new plan for the logged-in student.
        const savedPlan = await StudyPlan.create({
            studentId: req.student.id,
            title: title || 'Personalized Study Plan',
            dailyHours,
            days,
            summary: summary || '',
            prioritySubjects,
            schedule: schedule.map((day) => ({
                day: day.day,
                sessions: day.sessions.map((session) => ({
                    subject: session.subject.trim(),
                    topic: session.topic.trim(),
                    durationMinutes: session.durationMinutes,
                    activity: session.activity.trim(),
                    completed: false,
                    completedAt: null
                }))
            }))
        });

        return res.status(201).json({
            success: true,
            message: 'Study plan saved successfully.',
            studyPlan: savedPlan
        });
    } catch (error) {
        console.error('Save study plan error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Unable to save your study plan.'
        });
    }
});
// PATCH /api/study-plan/:planId/sessions/:day/:sessionIndex
// Update the completion status of a study session.
router.patch(
    '/:planId/sessions/:day/:sessionIndex',
    authMiddleware,
    async (req, res) => {
        try {
            const mongoose = require('mongoose');

            const { planId, day, sessionIndex } = req.params;
            const { completed } = req.body;

            // Validate request parameters.
            if (
                !mongoose.isValidObjectId(planId) ||
                !Number.isInteger(Number(day)) ||
                Number(day) < 1 ||
                !Number.isInteger(Number(sessionIndex)) ||
                Number(sessionIndex) < 0 ||
                typeof completed !== 'boolean'
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid study-session information.'
                });
            }

            // Only allow the owner of the plan to update it.
            const studyPlan = await StudyPlan.findOne({
                _id: planId,
                studentId: req.student.id
            });

            if (!studyPlan) {
                return res.status(404).json({
                    success: false,
                    message: 'Study plan not found.'
                });
            }

            // Find the requested day and session.
            const dayEntry = studyPlan.schedule.find(
                (entry) => entry.day === Number(day)
            );

            if (
                !dayEntry ||
                !dayEntry.sessions[Number(sessionIndex)]
            ) {
                return res.status(404).json({
                    success: false,
                    message: 'Study session not found.'
                });
            }

            const session = dayEntry.sessions[Number(sessionIndex)];

            // Update completion status and timestamp.
            session.completed = completed;
            session.completedAt = completed ? new Date() : null;

            await studyPlan.save();

            return res.status(200).json({
                success: true,
                message: completed
                    ? 'Study session marked as completed.'
                    : 'Study session marked as incomplete.',
                studyPlan
            });
        } catch (error) {
            console.error('Update study session error:', error.message);

            return res.status(500).json({
                success: false,
                message: 'Unable to update study-session status.'
            });
        }
    }
);
module.exports = router;
