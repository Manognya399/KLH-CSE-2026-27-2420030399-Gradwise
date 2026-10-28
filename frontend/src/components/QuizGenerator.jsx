import { useEffect, useState } from 'react'
import './QuizGenerator.css'

const DEFAULT_SUBJECTS = [
  'Operating Systems',
  'Data Structures',
  'Database Management Systems',
  'Computer Networks',
]

function QuizGenerator() {
  const [subject, setSubject] = useState('Operating Systems')
  const [difficulty, setDifficulty] = useState('Easy')
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [quizDetails, setQuizDetails] = useState(null)

  const [savingResult, setSavingResult] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  const [quizHistory, setQuizHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')

  // Load quiz history from the backend
  const fetchQuizHistory = async () => {
    const token = sessionStorage.getItem('gradwiseToken')

    if (!token) {
      setHistoryError('Please log in to view your quiz history.')
      return
    }

    setHistoryLoading(true)
    setHistoryError('')

    try {
      const response = await fetch(
        'http://localhost:5000/api/quiz/history',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()

      if (response.status === 401) {
        setHistoryError('Your session has expired. Please log in again.')
        return
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to load quiz history.')
      }

      setQuizHistory(data.history)
    } catch (err) {
      setHistoryError(
        err.message === 'Failed to fetch'
          ? 'Cannot connect to the backend.'
          : err.message
      )
    } finally {
      setHistoryLoading(false)
    }
  }

  // Automatically load history when the component opens
  useEffect(() => {
    fetchQuizHistory()
  }, [])

  // Generate a new quiz
  const generateQuiz = async () => {
    const token = sessionStorage.getItem('gradwiseToken')

    if (!token) {
      setError('Your session has expired. Please log in again.')
      return
    }

    setLoading(true)
    setError('')
    setSaveMessage('')
    setQuestions([])
    setAnswers({})
    setSubmitted(false)
    setQuizDetails(null)

    try {
      const response = await fetch(
        'http://localhost:5000/api/quiz/generate',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ subject, difficulty }),
        }
      )

      const data = await response.json()

      if (response.status === 401) {
        setError('Your session has expired. Please log in again.')
        return
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to generate the quiz.')
      }

      setQuestions(data.questions)
      setQuizDetails({
        subject: data.subject,
        difficulty: data.difficulty,
      })
    } catch (err) {
      setError(
        err.message === 'Failed to fetch'
          ? 'Cannot connect to the backend. Please check that the server is running.'
          : err.message
      )
    } finally {
      setLoading(false)
    }
  }

  // Save the completed quiz result
  const submitQuiz = async () => {
    const token = sessionStorage.getItem('gradwiseToken')

    if (!token) {
      setError('Your session has expired. Please log in again.')
      return
    }

    setSavingResult(true)
    setSaveMessage('')
    setError('')

    try {
      const currentScore = questions.reduce(
        (total, question, index) =>
          total + (answers[index] === question.correctAnswer ? 1 : 0),
        0
      )

      const response = await fetch(
        'http://localhost:5000/api/quiz/history',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            subject: quizDetails.subject,
            difficulty: quizDetails.difficulty,
            score: currentScore,
            totalQuestions: questions.length,
          }),
        }
      )

      const data = await response.json()

      if (response.status === 401) {
        setError('Your session has expired. Please log in again.')
        return
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to save your quiz result.')
      }

      setSubmitted(true)
      setSaveMessage('Quiz result saved to your history!')

      // Refresh history after saving the attempt
      await fetchQuizHistory()
    } catch (err) {
      setError(
        err.message === 'Failed to fetch'
          ? 'Cannot connect to the backend. Please check that the server is running.'
          : err.message
      )
    } finally {
      setSavingResult(false)
    }
  }

  const score = questions.reduce(
    (total, question, index) =>
      total + (answers[index] === question.correctAnswer ? 1 : 0),
    0
  )

  return (
    <section className="quiz-generator">
      <div className="quiz-heading">
        <div>
          <p className="quiz-eyebrow">PRACTICE & IMPROVE</p>
          <h2>AI Quiz Generator</h2>
          <p className="quiz-description">
            Test your knowledge with quizzes generated by GradWise AI.
          </p>
        </div>

        <div className="quiz-heading-icon" aria-hidden="true">
          Q
        </div>
      </div>

      <div className="quiz-settings">
        <div className="quiz-field">
          <label htmlFor="quiz-subject">Choose subject</label>
          <select
            id="quiz-subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            disabled={loading}
          >
            {DEFAULT_SUBJECTS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="quiz-field">
          <label htmlFor="quiz-difficulty">Difficulty level</label>
          <select
            id="quiz-difficulty"
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value)}
            disabled={loading}
          >
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>

        <button
          className="quiz-generate-button"
          type="button"
          onClick={generateQuiz}
          disabled={loading || savingResult}
        >
          {loading
            ? 'Generating questions...'
            : questions.length > 0
              ? 'Generate Another Quiz'
              : 'Generate Quiz'}
        </button>
      </div>

      {loading && (
        <div className="quiz-loading" role="status">
          <span className="quiz-spinner" />
          <p>
            GradWise AI is preparing your questions. This may take a moment.
          </p>
        </div>
      )}

      {error && (
        <p className="quiz-error" role="alert">
          {error}
        </p>
      )}

      {savingResult && (
        <p className="quiz-hint" role="status">
          Saving your quiz result...
        </p>
      )}

      {saveMessage && (
        <p className="quiz-hint" role="status">
          {saveMessage}
        </p>
      )}

      {questions.length > 0 && (
        <div className="quiz-content">
          <div className="quiz-meta">
            <span>{quizDetails?.subject}</span>
            <span>{quizDetails?.difficulty} level</span>
            <span>{questions.length} questions</span>
          </div>

          {submitted && (
            <div className="quiz-result" aria-live="polite">
              <p>Your quiz result</p>
              <h3>
                {score} / {questions.length}
              </h3>
              <p>
                You scored {Math.round((score / questions.length) * 100)}%.
              </p>
            </div>
          )}

          {questions.map((question, index) => (
            <article className="quiz-question-card" key={index}>
              <p className="quiz-question-number">
                QUESTION {index + 1} OF {questions.length}
              </p>

              <h3>{question.question}</h3>

              <div className="quiz-options">
                {question.options.map((option, optionIndex) => {
                  const isCorrect =
                    submitted && optionIndex === question.correctAnswer

                  const isSelected = answers[index] === optionIndex

                  const isWrongSelected =
                    submitted && isSelected && !isCorrect

                  let optionClass = 'quiz-option'

                  if (isSelected) optionClass += ' selected'
                  if (isCorrect) optionClass += ' correct'
                  if (isWrongSelected) optionClass += ' incorrect'

                  return (
                    <label className={optionClass} key={optionIndex}>
                      <input
                        type="radio"
                        name={`question-${index}`}
                        value={optionIndex}
                        checked={isSelected}
                        disabled={submitted}
                        onChange={() =>
                          setAnswers((previous) => ({
                            ...previous,
                            [index]: optionIndex,
                          }))
                        }
                      />

                      <span className="quiz-option-letter">
                        {String.fromCharCode(65 + optionIndex)}
                      </span>

                      <span className="quiz-option-text">{option}</span>

                      {isCorrect && (
                        <span className="quiz-feedback-label">Correct</span>
                      )}

                      {isWrongSelected && (
                        <span className="quiz-feedback-label">
                          Your answer
                        </span>
                      )}
                    </label>
                  )
                })}
              </div>

              {submitted && (
                <div className="quiz-explanation">
                  <strong>Explanation</strong>
                  <p>{question.explanation}</p>
                </div>
              )}
            </article>
          ))}

          {!submitted ? (
            <button
              className="quiz-submit-button"
              type="button"
              onClick={submitQuiz}
              disabled={
                Object.keys(answers).length !== questions.length ||
                savingResult
              }
            >
              {savingResult ? 'Saving Result...' : 'Submit Answers'}
            </button>
          ) : (
            <button
              className="quiz-submit-button"
              type="button"
              onClick={generateQuiz}
              disabled={loading || savingResult}
            >
              Try Another Quiz
            </button>
          )}

          {!submitted && (
            <p className="quiz-hint">
              Answer all {questions.length} questions to submit your quiz.
            </p>
          )}
        </div>
      )}

      {/* Quiz History */}
      <div className="quiz-history">
        <div className="quiz-history-heading">
          <div>
            <p className="quiz-eyebrow">YOUR PROGRESS</p>
            <h2>Quiz History</h2>
            <p className="quiz-description">
              Review your previous quiz attempts and scores.
            </p>
          </div>

          <button
            className="quiz-generate-button"
            type="button"
            onClick={fetchQuizHistory}
            disabled={historyLoading}
          >
            {historyLoading ? 'Refreshing...' : 'Refresh History'}
          </button>
        </div>

        {historyLoading && quizHistory.length === 0 && (
          <p className="quiz-hint" role="status">
            Loading your quiz history...
          </p>
        )}

        {historyError && (
          <p className="quiz-error" role="alert">
            {historyError}
          </p>
        )}

        {!historyLoading &&
          !historyError &&
          quizHistory.length === 0 && (
            <div className="quiz-history-empty">
              <h3>No quiz attempts yet</h3>
              <p>
                Complete your first quiz, and your results will appear here.
              </p>
            </div>
          )}

        {quizHistory.length > 0 && (
          <div className="quiz-history-list">
            {quizHistory.map((attempt) => (
              <article className="quiz-history-card" key={attempt._id}>
                <div className="quiz-history-card-main">
                  <h3>{attempt.subject}</h3>
                  <p>
                    {attempt.difficulty} difficulty
                    {' · '}
                    {new Date(attempt.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="quiz-history-score">
                  <strong>
                    {attempt.score}/{attempt.totalQuestions}
                  </strong>
                  <span>{attempt.percentage}%</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default QuizGenerator
