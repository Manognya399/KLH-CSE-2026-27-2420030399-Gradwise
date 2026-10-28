const express = require('express');
const Subject = require('../models/Subject');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/subjects
// Retrieve subjects belonging to the logged-in student
router.get('/', authMiddleware, async (req, res) => {
    try {
        const subjects = await Subject.find({
            student: req.student.id
        })
            .select('subjectName obtainedMarks totalMarks semester')
            .sort({ subjectName: 1 });

        const formattedSubjects = subjects.map((subject) => ({
            id: subject._id,
            subjectName: subject.subjectName,
            obtainedMarks: subject.obtainedMarks,
            totalMarks: subject.totalMarks,
            percentage: Math.round(
                (subject.obtainedMarks / subject.totalMarks) * 100
            ),
            semester: subject.semester
        }));

        return res.status(200).json({
            success: true,
            count: formattedSubjects.length,
            subjects: formattedSubjects
        });
    } catch (error) {
        console.error('Subject retrieval error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Unable to retrieve academic records.'
        });
    }
});

module.exports = router;
