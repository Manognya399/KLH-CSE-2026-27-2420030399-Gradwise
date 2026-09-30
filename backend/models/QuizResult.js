const mongoose = require("mongoose");

const quizResultSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    score: {
        type: Number,
        required: true
    },
    totalQuestions: {
        type: Number,
        required: true
    },
    timeTaken: {
        type: Number,
        required: true
    },
    weakTopics: {
        type: [String],
        default: []
    }
});

module.exports = mongoose.model("QuizResult", quizResultSchema);