import { useEffect, useState } from 'react'
import './Dashboard.css'
import AIAssistant from './components/AIAssistant'
import QuizGenerator from './components/QuizGenerator'
import StudyPlanner from './components/StudyPlanner'

function Dashboard({ student, onLogout }) {
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [studyPlan, setStudyPlan] = useState(null)
  const [studyPlanLoading, setStudyPlanLoading] = useState(true)

  // Fetch student subject records
  useEffect(() => {
    const fetchSubjects = async () => {
      const token = sessionStorage.getItem('gradwiseToken')

      if (!token) {
        setError('Your session has expired. Please log in again.')
        setLoading(false)
        return
      }

      try {
        const response = await fetch('http://localhost:5000/api/subjects', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const data = await response.json()

        if (response.status === 401) {
          onLogout()
          return
        }

        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Unable to load your subjects.')
        }

        setSubjects(
          data.subjects.map((subject) => {
            const score = subject.percentage
            let level = 'Needs Improvement'

            if (score >= 80) {
              level = 'Strong'
            } else if (score >= 60) {
              level = 'Good'
            }

            return {
              ...subject,
              name: subject.subjectName,
              score,
              level,
            }
          })
        )
      } catch (err) {
        setError(
          err.message === 'Failed to fetch'
            ? 'Cannot connect to the server. Please check that the backend is running.'
            : err.message
        )
      } finally {
        setLoading(false)
      }
    }

    fetchSubjects()
  }, [onLogout])

  // Fetch the student's saved study plan
  useEffect(() => {
    const fetchStudyPlan = async () => {
      const token = sessionStorage.getItem('gradwiseToken')

      if (!token) {
        setStudyPlanLoading(false)
        return
      }

      try {
        const response = await fetch(
          'http://localhost:5000/api/study-plan/current',
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        if (response.status === 404) {
          setStudyPlan(null)
          return
        }

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || 'Unable to load study progress.')
        }

        setStudyPlan(data.studyPlan || null)
      } catch (err) {
        console.error('Study progress error:', err.message)
      } finally {
        setStudyPlanLoading(false)
      }
    }

    fetchStudyPlan()
  }, [])

  // Calculate academic statistics
  const averageScore = subjects.length
    ? (
        subjects.reduce((total, subject) => total + subject.score, 0) /
        subjects.length
      ).toFixed(1)
    : '0.0'

  const strongSubjects = subjects.filter(
    (subject) => subject.score >= 80
  ).length

  const weakestSubject = subjects.length
    ? subjects.reduce((weakest, subject) =>
        subject.score < weakest.score ? subject : weakest
      )
    : null

  // Calculate study plan progress
  const studySessions = (studyPlan?.schedule || []).flatMap(
    (day) => day.sessions || []
  )

  const completedStudySessions = studySessions.filter(
    (session) => session.completed
  ).length

  const totalStudySessions = studySessions.length

  const pendingStudySessions =
    totalStudySessions - completedStudySessions

  const studyProgressPercentage =
    totalStudySessions > 0
      ? Math.round(
          (completedStudySessions / totalStudySessions) * 100
        )
      : 0

  return (
    <div className="dashboard">
      <aside className="dashboard-sidebar">
        <div className="dashboard-logo">
          ✦ Grad<span>Wise</span>
        </div>

        <p className="sidebar-label">MAIN MENU</p>

        <nav className="dashboard-nav">
          <a href="#overview" className="active">▦ Overview</a>
          <a href="#subjects">▤ My Subjects</a>
          <a href="#study-plan">▣ Study Plan</a>
          <a href="#study-progress">📈 Study Progress</a>
          <a href="#ai-assistant">✧ AI Assistant</a>
          <a href="#quiz-generator">Quiz Generator</a>
        </nav>

        <button
          className="dashboard-logout"
          onClick={onLogout}
        >
          ↪ Log out
        </button>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-greeting">STUDENT DASHBOARD</p>
            <h1>Welcome back, {student.name.split(' ')[0]}! 👋</h1>
            <p>Let's make today a productive learning day.</p>
          </div>

          <div className="student-avatar">
            {student.name.charAt(0).toUpperCase()}
          </div>
        </header>

        {/* Academic Overview */}
        <section id="overview" className="dashboard-section">
          <h2>Academic Overview</h2>
          <p className="section-description">
            Here's a snapshot of your learning journey.
          </p>

          <div className="overview-grid">
            <div className="overview-card">
              <span className="overview-icon">📚</span>
              <p>Total Subjects</p>
              <h3>{loading ? '...' : subjects.length}</h3>
              <span className="card-note">Subjects enrolled</span>
            </div>

            <div className="overview-card">
              <span className="overview-icon">🎯</span>
              <p>Average Score</p>
              <h3>{loading ? '...' : `${averageScore}%`}</h3>
              <span className="card-note">Across all subjects</span>
            </div>

            <div className="overview-card">
              <span className="overview-icon">⚡</span>
              <p>Strong Subjects</p>
              <h3>{loading ? '...' : strongSubjects}</h3>
              <span className="card-note">Scores of 80% or above</span>
            </div>

            <div className="overview-card">
              <span className="overview-icon">🗓️</span>
              <p>Study Goal</p>
              <h3>2 hrs</h3>
              <span className="card-note">Suggested daily target</span>
            </div>
          </div>
        </section>

        {/* Subject Records */}
        <section id="subjects" className="dashboard-section">
          <div className="section-heading">
            <div>
              <h2>My Subjects</h2>
              <p className="section-description">
                Identify where to focus your efforts.
              </p>
            </div>
          </div>

          {loading && <p>Loading your academic records...</p>}

          {!loading && error && (
            <p className="login-error" role="alert">{error}</p>
          )}

          {!loading && !error && subjects.length === 0 && (
            <p>No subject records found for your account.</p>
          )}

          {!loading && !error && subjects.length > 0 && (
            <div className="subjects-list">
              {subjects.map((subject) => (
                <div className="subject-card" key={subject.id}>
                  <div className="subject-info">
                    <h3>{subject.name}</h3>
                    <span
                      className={`subject-status ${
                        subject.level === 'Strong'
                          ? 'status-strong'
                          : subject.level === 'Good'
                            ? 'status-good'
                            : 'status-needs-work'
                      }`}
                    >
                      {subject.level}
                    </span>
                  </div>

                  <div className="subject-progress">
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{ width: `${subject.score}%` }}
                      />
                    </div>

                    <strong>{subject.score}%</strong>
                  </div>

                  <p>
                    Marks: {subject.obtainedMarks}/{subject.totalMarks}
                    {' · '}Semester {subject.semester}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Personalized Study Recommendation */}
        <section id="study-plan" className="dashboard-section">
          <div className="study-plan-card">
            <div>
              <span className="study-plan-label">YOUR NEXT STEP</span>
              <h2>
                {weakestSubject
                  ? `Strengthen ${weakestSubject.name}`
                  : 'Build your study plan'}
              </h2>
              <p>
                {weakestSubject
                  ? `${weakestSubject.name} is currently your lowest-scoring subject at ${weakestSubject.score}%. Consider prioritizing it in your next study session.`
                  : 'Your personalized study recommendation will appear when subject records are available.'}
              </p>
            </div>

            <div className="study-plan-icon">🎯</div>
          </div>
        </section>

        {/* Saved Study Progress */}
        <section id="study-progress" className="dashboard-section">
          <div className="overview-card study-progress-card">
            <span className="overview-icon">📈</span>
            <h2>Study Plan Progress</h2>

            {studyPlanLoading ? (
              <p>Loading your saved study progress...</p>
            ) : studyPlan ? (
              totalStudySessions > 0 ? (
                <>
                  <p>
                    Completed sessions: {completedStudySessions} /{' '}
                    {totalStudySessions}
                  </p>

                  <h3>{studyProgressPercentage}% completed</h3>

                  <div
                    className="progress-track"
                    role="progressbar"
                    aria-label="Study plan completion"
                    aria-valuenow={studyProgressPercentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="progress-fill"
                      style={{
                        width: `${studyProgressPercentage}%`,
                      }}
                    />
                  </div>

                  <p className="card-note">
                    {pendingStudySessions} sessions remaining
                  </p>
                </>
              ) : (
                <p className="card-note">
                  Your saved study plan has no sessions to track yet.
                </p>
              )
            ) : (
              <p className="card-note">
                Generate a study plan to start tracking your progress.
              </p>
            )}
          </div>
        </section>

        {/* Personalized Study Planner */}
        <section id="personalized-planner" className="dashboard-section">
          <StudyPlanner subjects={subjects} />
        </section>

        {/* AI Assistant */}
        <section id="ai-assistant" className="dashboard-section">
          <AIAssistant />
        </section>

        {/* Quiz Generator */}
        <section id="quiz-generator" className="dashboard-section">
          <QuizGenerator />
        </section>

        <footer className="dashboard-footer">
          GradWise · Your journey. Your pace. Your success.
        </footer>
      </main>
    </div>
  )
}

export default Dashboard