const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    course: {
        type: String,
        required: true
    },
    year: {
        type: Number,
        required: true
    },
    subjects: {
        type: [String],
        default: []
    }
});

module.exports = mongoose.model("Student", studentSchema);