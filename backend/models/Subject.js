const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student',
            required: true
        },
        subjectName: {
            type: String,
            required: true,
            trim: true
        },
        totalMarks: {
            type: Number,
            required: true,
            min: 1
        },
        obtainedMarks: {
            type: Number,
            required: true,
            min: 0
        },
        semester: {
            type: Number,
            required: true,
            min: 1
        }
    },
    { timestamps: true }
);

// Prevent duplicate subject records for the same student and semester.
subjectSchema.index(
    { student: 1, subjectName: 1, semester: 1 },
    { unique: true }
);

module.exports = mongoose.model('Subject', subjectSchema);
