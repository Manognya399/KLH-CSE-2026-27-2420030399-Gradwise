const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
const aiRoutes = require('./routes/aiRoutes');
const quizRoutes = require('./routes/quizRoutes');
const studyPlanRoutes = require('./routes/studyPlanRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
// AI learning assistant routes
app.use('/api/ai', aiRoutes);
app.use('/api/study-plan', studyPlanRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/subjects', subjectRoutes);
// Health-check route
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to GradWise API!',
        status: 'Running'
    });
});

// Test route
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'GradWise backend is working!'
    });
});

// Connect to MongoDB and start the server
const PORT = process.env.PORT || 5000;
const MONGO_URI =
    process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/adaptive_learning_v2';

async function startServer() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB connected successfully!');

        app.listen(PORT, () => {
            console.log(`GradWise backend running on port ${PORT}`);
            console.log(`API URL: http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
        process.exit(1);
    }
}

startServer();