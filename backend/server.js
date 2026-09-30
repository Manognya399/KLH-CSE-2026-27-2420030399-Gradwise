const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const aiRoutes = require("./routes/aiRoutes");
const studentRoutes = require("./routes/studentRoutes");
const quizRoutes = require("./routes/quizRoutes");
const recommendationRoutes = require("./routes/recommendationRoutes");
const app = express();

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

app.use(express.json());
app.use(cors());

app.use("/api/students", studentRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/ai", aiRoutes);

mongoose
    .connect(MONGO_URI)
    .then(() => {
        console.log("MongoDB connected successfully!");

        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error("MongoDB connection failed:", error.message);
    });

app.get("/", (req, res) => {
    res.send("Adaptive AI Learning Assistant Backend is Running!");
});