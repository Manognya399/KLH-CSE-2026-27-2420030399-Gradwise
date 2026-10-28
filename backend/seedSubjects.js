const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Student = require('./models/Student');
const Subject = require('./models/Subject');

dotenv.config();

const academicRecords = [
    {
        email: 'ananya@gradwise.com',
        subjects: [
            { subjectName: 'Data Structures', obtainedMarks: 85, totalMarks: 100, semester: 5 },
            { subjectName: 'Database Management Systems', obtainedMarks: 72, totalMarks: 100, semester: 5 },
            { subjectName: 'Operating Systems', obtainedMarks: 48, totalMarks: 100, semester: 5 },
            { subjectName: 'Computer Networks', obtainedMarks: 58, totalMarks: 100, semester: 5 }
        ]
    },
    {
        email: 'rahul@gradwise.com',
        subjects: [
            { subjectName: 'Data Structures', obtainedMarks: 68, totalMarks: 100, semester: 5 },
            { subjectName: 'Database Management Systems', obtainedMarks: 82, totalMarks: 100, semester: 5 },
            { subjectName: 'Operating Systems', obtainedMarks: 75, totalMarks: 100, semester: 5 },
            { subjectName: 'Computer Networks', obtainedMarks: 61, totalMarks: 100, semester: 5 }
        ]
    },
    {
        email: 'priya@gradwise.com',
        subjects: [
            { subjectName: 'Data Structures', obtainedMarks: 91, totalMarks: 100, semester: 5 },
            { subjectName: 'Database Management Systems', obtainedMarks: 88, totalMarks: 100, semester: 5 },
            { subjectName: 'Operating Systems', obtainedMarks: 79, totalMarks: 100, semester: 5 },
            { subjectName: 'Computer Networks', obtainedMarks: 84, totalMarks: 100, semester: 5 }
        ]
    },
    {
        email: 'arjun@gradwise.com',
        subjects: [
            { subjectName: 'Data Structures', obtainedMarks: 55, totalMarks: 100, semester: 5 },
            { subjectName: 'Database Management Systems', obtainedMarks: 64, totalMarks: 100, semester: 5 },
            { subjectName: 'Operating Systems', obtainedMarks: 42, totalMarks: 100, semester: 5 },
            { subjectName: 'Computer Networks', obtainedMarks: 70, totalMarks: 100, semester: 5 }
        ]
    }
];

async function seedSubjects() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected successfully!');

        for (const record of academicRecords) {
            const student = await Student.findOne({
                email: record.email
            });

            if (!student) {
                console.log(`Student not found: ${record.email}`);
                continue;
            }

            for (const subjectData of record.subjects) {
                await Subject.findOneAndUpdate(
                    {
                        student: student._id,
                        subjectName: subjectData.subjectName,
                        semester: subjectData.semester
                    },
                    {
                        $set: {
                            ...subjectData,
                            student: student._id
                        }
                    },
                    {
                        upsert: true,
                        runValidators: true
                    }
                );
            }

            console.log(`Academic records saved for ${student.name}`);
        }

        console.log('Subject seeding completed successfully!');
    } catch (error) {
        console.error('Error seeding subjects:', error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

seedSubjects();
