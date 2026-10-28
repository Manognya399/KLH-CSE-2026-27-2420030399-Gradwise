const mongoose = require('mongoose');

const quizAttemptSchema = new mongoose.Schema(
    {
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student',
            required: true,
            index: true
        },

        subject: {
            type: String,
            required: true,
            trim: true
        },

        difficulty: {
            type: String,
            required: true,
            enum: ['Easy', 'Medium', 'Hard']
        },

        score: {
            type: Number,
            required: true,
            min: 0,
            max: 5
        },

        totalQuestions: {
            type: Number,
            default: 5,
            min: 1,
            max: 5
        },

        percentage: {
            type: Number,
            required: true,
            min: 0,
            max: 100
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);