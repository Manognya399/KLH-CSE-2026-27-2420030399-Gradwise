import { useEffect, useState } from "react";
import Quiz from "./Quiz";

function App() {
  const [student, setStudent] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [aiRecommendation, setAiRecommendation] = useState("");
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);

  const studentId = "6ab1f3ea89a4f47f53e19d46";

  // Fetch student and latest quiz data
  const fetchDashboardData = async () => {
    try {
      const studentResponse = await fetch(
        "http://localhost:5000/api/students"
      );

      const studentData = await studentResponse.json();

      const quizResponse = await fetch(
        `http://localhost:5000/api/quizzes/student/${studentId}`
      );

      const quizData = await quizResponse.json();

      setStudent(studentData[0]);

      if (quizData.length > 0) {
        setQuiz(quizData[quizData.length - 1]);
      } else {
        setQuiz(null);
      }

      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      setLoading(false);
    }
  };

  // Load dashboard when page opens
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Generate AI recommendation
  const generateRecommendation = async () => {
    setAiLoading(true);

    try {
      const response = await fetch(
        `http://localhost:5000/api/ai/recommend/${studentId}`,
        {
          method: "POST"
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to generate recommendation"
        );
      }

      setAiRecommendation(data.aiRecommendation);
    } catch (error) {
      console.error("AI recommendation error:", error);

      setAiRecommendation(
        "Unable to generate the AI recommendation. Please make sure the AI service is running."
      );
    } finally {
      setAiLoading(false);
    }
  };

  // Called after quiz submission
  const handleQuizComplete = async () => {
    await fetchDashboardData();

    setShowQuiz(false);

    // Clear old AI recommendation because quiz data has changed
    setAiRecommendation("");
  };

  if (loading) {
    return <h2>Loading dashboard...</h2>;
  }

  if (!student) {
    return <h2>No student data found.</h2>;
  }

  const percentage = quiz
    ? (quiz.score / quiz.totalQuestions) * 100
    : 0;

  return (
    <div className="app">

      {/* Header */}

      <header className="header">
        <h1>Adaptive AI Learning Assistant</h1>
        <p>Personalized Learning Dashboard</p>
      </header>

      <main className="dashboard">

        {/* Student Profile */}

        <section className="student-card">
          <h2>Student Profile</h2>

          <p>
            <strong>Name:</strong> {student.name}
          </p>

          <p>
            <strong>Course:</strong> {student.course}
          </p>

          <p>
            <strong>Year:</strong> {student.year}
          </p>
        </section>

        {/* Quiz Statistics */}

        {quiz && (
          <section className="stats">

            <div className="stat-card">
              <h3>Quiz Score</h3>

              <div className="score">
                {percentage}%
              </div>

              <p>
                {quiz.score} / {quiz.totalQuestions}
              </p>
            </div>

            <div className="stat-card">
              <h3>Subject</h3>

              <div className="subject">
                {quiz.subject}
              </div>
            </div>

            <div className="stat-card">
              <h3>Time Taken</h3>

              <div className="score">
                {quiz.timeTaken}
              </div>

              <p>minutes</p>
            </div>

          </section>
        )}

        {/* Weak Topics */}

        {quiz && (
          <section className="weak-topics">

            <h2>Weak Topics</h2>

            <div className="topics">
              {quiz.weakTopics.length > 0 ? (
                quiz.weakTopics.map((topic) => (
                  <span key={topic}>
                    {topic}
                  </span>
                ))
              ) : (
                <p>No weak topics detected.</p>
              )}
            </div>

          </section>
        )}

        {/* Subjects */}

        <section className="weak-topics">

          <h2>Subjects</h2>

          <div className="topics">
            {student.subjects.map((subject) => (
              <span key={subject}>
                {subject}
              </span>
            ))}
          </div>

        </section>

        {/* AI Recommendation */}

        <section className="ai-card">

          <h2>🤖 AI Study Recommendation</h2>

          <p>
            Generate a personalized study recommendation based on
            your latest quiz performance and weak topics.
          </p>

          <button
            onClick={generateRecommendation}
            disabled={aiLoading}
          >
            {aiLoading
              ? "Generating Recommendation..."
              : "Generate AI Recommendation"}
          </button>

          {aiRecommendation && (
            <div className="ai-result">

              <h3>Your Personalized Recommendation</h3>

              <div className="recommendation-text">
                {aiRecommendation}
              </div>

            </div>
          )}

        </section>

        {/* Quiz Launch */}

        <section className="quiz-launch">

          <h2>📝 Take a New Quiz</h2>

          <p>
            Test your Cloud Computing knowledge and update
            your learning profile.
          </p>

          <button
            onClick={() => setShowQuiz(!showQuiz)}
          >
            {showQuiz
              ? "Hide Quiz"
              : "Start Cloud Computing Quiz"}
          </button>

        </section>

        {/* Quiz */}

        {showQuiz && (
          <Quiz onQuizComplete={handleQuizComplete} />
        )}

      </main>

    </div>
  );
}

export default App;