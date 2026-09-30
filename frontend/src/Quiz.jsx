import { useEffect, useState } from "react";

const questions = [
  {
    question: "What is Docker mainly used for?",
    options: [
      "Containerization",
      "Database management",
      "Web browsing",
      "Operating system installation"
    ],
    answer: "Containerization",
    topic: "Docker"
  },
  {
    question: "What is a Pod in Kubernetes?",
    options: [
      "A database",
      "The smallest deployable unit",
      "A programming language",
      "A Docker image"
    ],
    answer: "The smallest deployable unit",
    topic: "Kubernetes"
  },
  {
    question: "Which file is commonly used to build a Docker image?",
    options: [
      "Dockerfile",
      "package.json",
      "index.html",
      "server.yaml"
    ],
    answer: "Dockerfile",
    topic: "Docker"
  },
  {
    question: "Which Kubernetes object is commonly used to expose an application?",
    options: [
      "Service",
      "Image",
      "Volume",
      "Dockerfile"
    ],
    answer: "Service",
    topic: "Kubernetes"
  },
  {
    question: "Which command is commonly used to list running Docker containers?",
    options: [
      "docker ps",
      "docker list",
      "docker show",
      "docker containers"
    ],
    answer: "docker ps",
    topic: "Docker"
  },
  {
    question: "Which Kubernetes command is used to view Pods?",
    options: [
      "kubectl get pods",
      "kubectl show pods",
      "kubectl list pods",
      "kube pods"
    ],
    answer: "kubectl get pods",
    topic: "Kubernetes"
  },
  {
    question: "What does a Docker image contain?",
    options: [
      "The application and its dependencies",
      "Only source code",
      "Only the operating system",
      "Only database records"
    ],
    answer: "The application and its dependencies",
    topic: "Docker"
  },
  {
    question: "What is Kubernetes mainly used for?",
    options: [
      "Managing containerized applications",
      "Writing HTML",
      "Creating databases",
      "Editing images"
    ],
    answer: "Managing containerized applications",
    topic: "Kubernetes"
  },
  {
    question: "Which command can create a Kubernetes deployment?",
    options: [
      "kubectl create deployment",
      "kubectl make deployment",
      "kube create app",
      "kubectl deployment start"
    ],
    answer: "kubectl create deployment",
    topic: "Kubernetes"
  },
  {
    question: "Which Docker command creates an image from a Dockerfile?",
    options: [
      "docker build",
      "docker create-image",
      "docker make",
      "docker image-build"
    ],
    answer: "docker build",
    topic: "Docker"
  }
];

function Quiz({ onQuizComplete }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Quiz timer
  useEffect(() => {
    if (submitted) {
      return;
    }

    const timer = setInterval(() => {
      setElapsedSeconds((previous) => previous + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [submitted]);

  const handleAnswer = (index, answer) => {
    setAnswers({
      ...answers,
      [index]: answer
    });
  };

  const submitQuiz = async () => {
    let score = 0;
    const wrongTopics = [];

    questions.forEach((question, index) => {
      if (answers[index] === question.answer) {
        score++;
      } else {
        wrongTopics.push(question.topic);
      }
    });

    const topicCounts = {};

    wrongTopics.forEach((topic) => {
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    });

    const weakTopics = Object.keys(topicCounts);

    const percentage = (score / questions.length) * 100;

    // Convert seconds into minutes with one decimal place
    const timeTaken = Math.max(
      0.1,
      Math.round((elapsedSeconds / 60) * 10) / 10
    );

    const quizResult = {
      studentId: "6ab1f3ea89a4f47f53e19d46",
      subject: "Cloud Computing",
      score: score,
      totalQuestions: questions.length,
      timeTaken: timeTaken,
      weakTopics: weakTopics
    };

    try {
      const response = await fetch(
        "http://localhost:5000/api/quizzes",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(quizResult)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save quiz");
      }

      setResult({
        score,
        percentage,
        weakTopics,
        timeTaken
      });

      setSubmitted(true);

      if (onQuizComplete) {
        onQuizComplete();
      }

    } catch (error) {
      console.error("Quiz submission error:", error);
      alert("Failed to save quiz result.");
    }
  };

  // Convert seconds into MM:SS format
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;

  return (
    <section className="quiz-card">

      <h2>📝 Cloud Computing Quiz</h2>

      <p>
        Answer the following 10 questions and submit your quiz.
      </p>

      {/* Quiz Timer */}
      <div className="quiz-timer">
        ⏱️ Time:{" "}
        {String(minutes).padStart(2, "0")}:
        {String(seconds).padStart(2, "0")}
      </div>

      {questions.map((question, index) => (

        <div className="question" key={index}>

          <h3>
            {index + 1}. {question.question}
          </h3>

          {question.options.map((option) => (

            <label className="option" key={option}>

              <input
                type="radio"
                name={`question-${index}`}
                value={option}
                checked={answers[index] === option}
                onChange={() => handleAnswer(index, option)}
                disabled={submitted}
              />

              {option}

            </label>

          ))}

        </div>

      ))}

      {!submitted && (
        <button
          className="submit-quiz"
          onClick={submitQuiz}
        >
          Submit Quiz
        </button>
      )}

      {submitted && result && (

        <div className="quiz-result">

          <h2>Quiz Completed 🎉</h2>

          <h3>
            Score: {result.score} / {questions.length}
          </h3>

          <h3>
            Percentage: {result.percentage}%
          </h3>

          <h3>
            Time Taken: {result.timeTaken} minutes
          </h3>

          <h3>Weak Topics:</h3>

          {result.weakTopics.length > 0 ? (

            <div className="topics">

              {result.weakTopics.map((topic) => (
                <span key={topic}>{topic}</span>
              ))}

            </div>

          ) : (

            <p>No weak topics detected.</p>

          )}

        </div>

      )}

    </section>
  );
}

export default Quiz;