const express = require("express");
const axios = require("axios");

const Student = require("../models/Student");
const QuizResult = require("../models/QuizResult");

const router = express.Router();

router.post("/recommend/:studentId", async (req, res) => {
    try {
        // Find student
        const student = await Student.findById(req.params.studentId);

        if (!student) {
            return res.status(404).json({
                message: "Student not found"
            });
        }

        // Find quiz results
        const results = await QuizResult.find({
            studentId: req.params.studentId
        });

        if (results.length === 0) {
            return res.status(404).json({
                message: "No quiz results found for this student"
            });
        }

        // Use the latest quiz result
        const latestResult = results[results.length - 1];

        // Calculate percentage
        const percentage =
            (latestResult.score / latestResult.totalQuestions) * 100;

        // Create prompt automatically
        const prompt = `
You are an AI learning assistant for a college student.

Student name: ${student.name}
Course: ${student.course}
Year: ${student.year}

Subject: ${latestResult.subject}
Quiz score: ${latestResult.score}/${latestResult.totalQuestions}
Percentage: ${percentage}%
Weak topics: ${latestResult.weakTopics.join(", ")}
Time taken: ${latestResult.timeTaken} minutes

Give a simple personalized study recommendation.

Include:
1. What the student should focus on.
2. How they can improve the weak topics.
3. A suggested study plan for today.

Keep the explanation suitable for a college student.
`;

        // Send prompt to FastAPI AI service
        const response = await axios.post(
            "http://localhost:8000/generate",
            {
                prompt: prompt
            }
        );

        // Return result
        res.json({
            student: student.name,
            subject: latestResult.subject,
            score: latestResult.score,
            totalQuestions: latestResult.totalQuestions,
            percentage: percentage,
            weakTopics: latestResult.weakTopics,
            aiRecommendation: response.data.response
        });

    } catch (error) {
        console.error("AI recommendation error:", error.message);

        res.status(500).json({
            message: "Failed to generate AI recommendation"
        });
    }
});

module.exports = router;