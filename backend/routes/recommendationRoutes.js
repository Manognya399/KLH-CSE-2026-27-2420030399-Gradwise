const express = require("express");
const QuizResult = require("../models/QuizResult");

const router = express.Router();

// Generate an adaptive recommendation
router.get("/:studentId", async (req, res) => {
    try {
        const results = await QuizResult.find({
            studentId: req.params.studentId
        });

        if (results.length === 0) {
            return res.status(404).json({
                message: "No quiz results found for this student"
            });
        }

        const latestResult = results[results.length - 1];

        const percentage =
            (latestResult.score / latestResult.totalQuestions) * 100;

        let recommendation;
        let studyTime;

        if (percentage < 50) {
            recommendation = "Focus strongly on the weak topics before attempting another quiz.";
            studyTime = 45;
        } else if (percentage < 70) {
            recommendation = "Review the weak topics and practice a few questions before the next quiz.";
            studyTime = 30;
        } else if (percentage < 85) {
            recommendation = "Review the weak topics briefly and continue with practice questions.";
            studyTime = 20;
        } else {
            recommendation = "Performance is good. Continue practicing and explore advanced topics.";
            studyTime = 15;
        }

        res.json({
            studentId: latestResult.studentId,
            subject: latestResult.subject,
            score: latestResult.score,
            totalQuestions: latestResult.totalQuestions,
            percentage: percentage,
            weakTopics: latestResult.weakTopics,
            recommendedStudyTime: studyTime,
            recommendation: recommendation
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});

module.exports = router;