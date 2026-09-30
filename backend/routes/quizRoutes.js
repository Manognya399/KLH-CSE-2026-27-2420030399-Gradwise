const express = require("express");
const QuizResult = require("../models/QuizResult");

const router = express.Router();

// Get all quiz results
router.get("/", async (req, res) => {
    try {
        const results = await QuizResult.find();
        res.json(results);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Add a quiz result
router.post("/", async (req, res) => {
    try {
        const quizResult = new QuizResult(req.body);
        const savedResult = await quizResult.save();

        res.status(201).json(savedResult);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get quiz results for one student
router.get("/student/:studentId", async (req, res) => {
    try {
        const results = await QuizResult.find({
            studentId: req.params.studentId
        });

        res.json(results);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;