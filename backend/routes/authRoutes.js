const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');

const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate the input
        if (
            typeof email !== 'string' ||
            typeof password !== 'string' ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required.'
            });
        }

        // Find the student and explicitly include the password hash
        const student = await Student.findOne({
            email: email.trim().toLowerCase()
        }).select('+password');

        // Reject invalid credentials
        if (!student || !(await bcrypt.compare(password, student.password))) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        // Generate a signed JWT
        const token = jwt.sign(
            {
                id: student._id.toString(),
                email: student.email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '2h'
            }
        );

        // Return the token and safe student information
        return res.status(200).json({
            success: true,
            message: 'Login successful.',
            token,
            student: {
                id: student._id,
                name: student.name,
                email: student.email,
                college: student.college,
                course: student.course,
                year: student.year
            }
        });
    } catch (error) {
        console.error('Login error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'An internal server error occurred.'
        });
    }
});
// GET /api/auth/me - Get the currently logged-in student
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const student = await Student.findById(req.student.id);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found.'
            });
        }

        return res.status(200).json({
            success: true,
            student: {
                id: student._id,
                name: student.name,
                email: student.email,
                college: student.college,
                course: student.course,
                year: student.year
            }
        });
    } catch (error) {
        console.error('Profile error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Unable to retrieve student profile.'
        });
    }
});

module.exports = router;