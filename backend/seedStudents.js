const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Student = require('./models/Student');

const MONGO_URI = 'mongodb://127.0.0.1:27017/adaptive_learning_v2';

const students = [
    {
        name: 'Ananya Sharma',
        email: 'ananya@gradwise.com',
        college: 'Demo College',
        course: 'B.Tech',
        year: 3
    },
    {
        name: 'Rahul Verma',
        email: 'rahul@gradwise.com',
        college: 'Demo College',
        course: 'B.Tech',
        year: 3
    },
    {
        name: 'Priya Reddy',
        email: 'priya@gradwise.com',
        college: 'Demo College',
        course: 'B.Tech',
        year: 3
    },
    {
        name: 'Arjun Kumar',
        email: 'arjun@gradwise.com',
        college: 'Demo College',
        course: 'B.Tech',
        year: 3
    }
];

async function seedStudents() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB.');

        const passwordHash = await bcrypt.hash('Gradwise@123', 10);

        for (const student of students) {
            await Student.findOneAndUpdate(
                { email: student.email },
                { $set: { ...student, password: passwordHash } },
                {
                    upsert: true,
                    new: true,
                    runValidators: true,
                    setDefaultsOnInsert: true
                }
            );

            console.log(`Student ready: ${student.email}`);
        }

        console.log('All four demo students are ready.');
    } catch (error) {
        console.error('Student setup failed:', error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

seedStudents();