const mongoose = require('mongoose');

const studySessionSchema = new mongoose.Schema({
    subject: {
        type: String,
        required: true,
        trim: true
    },
    topic: {
        type: String,
        required: true,
        trim: true
    },
    durationMinutes: {
        type: Number,
        required: true,
        min: 1
    },
    activity: {
        type: String,
        required: true,
        trim: true
    },
    completed: {
        type: Boolean,
        default: false
    },
    completedAt: {
        type: Date,
        default: null
    }
});

const studyDaySchema = new mongoose.Schema({
    day: {
        type: Number,
        required: true,
        min: 1
    },
    sessions: {
        type: [studySessionSchema],
        default: []
    }
});

const studyPlanSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true,
        index: true
    },
    title: {
        type: String,
        default: 'Personalized Study Plan'
    },
    dailyHours: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    days: {
        type: Number,
        required: true,
        enum: [7, 14, 30]
    },
    summary: {
        type: String,
        default: ''
    },
    prioritySubjects: {
        type: [String],
        default: []
    },
    schedule: {
        type: [studyDaySchema],
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('StudyPlan', studyPlanSchema);