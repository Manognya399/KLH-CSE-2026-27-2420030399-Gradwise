import { useState, useEffect } from 'react'
import './StudyPlanner.css'

const API_URL = 'http://localhost:5000/api/study-plan'

function StudyPlanner({ subjects }) {
  const [dailyHours, setDailyHours] = useState(2)
  const [days, setDays] = useState(7)
  const [weakSubjects, setWeakSubjects] = useState([])
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [loadingSavedPlan, setLoadingSavedPlan] = useState(true)
  const [savingSession, setSavingSession] = useState('')
  const [saveMessage, setSaveMessage] = useState('')

  // Load the student's latest saved study plan.
  useEffect(() => {
    const loadSavedPlan = async () => {
      try {
        const token = sessionStorage.getItem('gradwiseToken')

        if (!token) {
          return
        }

        const response = await fetch(`${API_URL}/current`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.status === 404) {
          return
        }

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.message || 'Unable to load your saved study plan.'
          )
        }

        if (data.studyPlan && Array.isArray(data.studyPlan.schedule)) {
          setPlan(data.studyPlan)
          setDailyHours(data.studyPlan.dailyHours)
          setDays(data.studyPlan.days)
          setWeakSubjects(data.studyPlan.prioritySubjects || [])
        }
      } catch (err) {
        console.error('Load saved study plan error:', err.message)
        setError(err.message || 'Unable to load your saved study plan.')
      } finally {
        setLoadingSavedPlan(false)
      }
    }

    loadSavedPlan()
  }, [])

  // Select or deselect priority subjects.
  const handleSubjectChange = (subjectName) => {
    setWeakSubjects((current) =>
      current.includes(subjectName)
        ? current.filter((name) => name !== subjectName)
        : [...current, subjectName]
    )
  }

  // Generate a timetable and save it in MongoDB.
  const generateStudyPlan = async () => {
    setLoading(true)
    setError('')
    setSaveMessage('')
    setPlan(null)

    try {
      const token = sessionStorage.getItem('gradwiseToken')

      if (!token) {
        throw new Error('Please log in again to generate your study plan.')
      }

      const response = await fetch(`${API_URL}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          dailyHours,
          days,
          prioritySubjects: weakSubjects,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.message || data.error || 'Unable to generate your study plan.'
        )
      }

      if (!data.studyPlan || !Array.isArray(data.studyPlan.schedule)) {
        throw new Error('The server returned an invalid study plan.')
      }

      // Save the generated timetable.
      const saveResponse = await fetch(`${API_URL}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data.studyPlan,
          prioritySubjects: weakSubjects,
        }),
      })

      const savedData = await saveResponse.json()

      if (!saveResponse.ok) {
        throw new Error(
          savedData.message ||
            'The timetable was generated but could not be saved.'
        )
      }

      setPlan(savedData.studyPlan)
      setSaveMessage('Study plan saved successfully!')
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Update a session's completion status in MongoDB.
  const toggleSessionCompletion = async (
    dayNumber,
    sessionIndex,
    currentlyCompleted
  ) => {
    const token = sessionStorage.getItem('gradwiseToken')

    if (!token || !plan?._id) {
      setError('Please log in again or generate a new saved study plan.')
      return
    }

    const sessionKey = `${dayNumber}-${sessionIndex}`

    setSavingSession(sessionKey)
    setError('')
    setSaveMessage('')

    try {
      const response = await fetch(
        `${API_URL}/${plan._id}/sessions/${dayNumber}/${sessionIndex}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            completed: !currentlyCompleted,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.message || 'Unable to update the session.'
        )
      }

      if (!data.studyPlan) {
        throw new Error('The server did not return the updated study plan.')
      }

      setPlan(data.studyPlan)
      setSaveMessage(
        !currentlyCompleted
          ? 'Study session marked as completed!'
          : 'Study session marked as incomplete.'
      )
    } catch (err) {
      setError(err.message || 'Unable to update the session.')
    } finally {
      setSavingSession('')
    }
  }

  // Calculate overall session completion.
  const allSessions = (plan?.schedule || []).flatMap((day) =>
    (day.sessions || []).map((session) => session)
  )

  const completedSessions = allSessions.filter(
    (session) => session.completed
  ).length

  const totalSessions = allSessions.length

  const progressPercentage =
    totalSessions > 0
      ? Math.round((completedSessions / totalSessions) * 100)
      : 0

  return (
    <div className="study-planner">
      <h2>Personalized Study Planner</h2>

      <p>
        Create a study schedule based on your subjects, available time,
        and learning priorities.
      </p>

      <div className="planner-form">
        <label htmlFor="daily-hours">Daily study hours</label>

        <select
          id="daily-hours"
          value={dailyHours}
          onChange={(event) => setDailyHours(Number(event.target.value))}
          disabled={loading}
        >
          <option value={1}>1 hour</option>
          <option value={2}>2 hours</option>
          <option value={3}>3 hours</option>
          <option value={4}>4 hours</option>
          <option value={5}>5 hours</option>
        </select>

        <label htmlFor="study-days">Planning period</label>

        <select
          id="study-days"
          value={days}
          onChange={(event) => setDays(Number(event.target.value))}
          disabled={loading}
        >
          <option value={7}>7 days</option>
          <option value={14}>14 days</option>
          <option value={30}>30 days</option>
        </select>

        <h3>Subjects to prioritize</h3>

        <p>
          Select the subjects you want to focus on. If you don't select any,
          the AI will plan using your available subjects.
        </p>

        {subjects.length === 0 ? (
          <p>No subjects are available yet.</p>
        ) : (
          subjects.map((subject) => (
            <label className="planner-subject" key={subject.id}>
              <input
                type="checkbox"
                checked={weakSubjects.includes(subject.name)}
                onChange={() => handleSubjectChange(subject.name)}
                disabled={loading}
              />

              {subject.name} ({subject.score}%)
            </label>
          ))
        )}

        <button
          type="button"
          className="generate-plan-button"
          onClick={generateStudyPlan}
          disabled={loading || subjects.length === 0}
        >
          {loading ? 'Generating Your Study Plan...' : 'Generate Study Plan'}
        </button>

        {loading && (
          <p className="planner-loading">
            AI is preparing your personalized timetable. This may take a
            little time.
          </p>
        )}

        {loadingSavedPlan && (
          <p className="planner-loading">
            Loading your saved study plan...
          </p>
        )}

        {error && (
          <p className="planner-error" role="alert">
            {error}
          </p>
        )}

        {saveMessage && (
          <p className="planner-success" role="status">
            {saveMessage}
          </p>
        )}
      </div>

      {plan && (
        <div className="generated-study-plan">
          <h3>Your Personalized Study Timetable</h3>

          {plan.summary && <p>{plan.summary}</p>}

          <div className="study-progress">
            <h4>Your Study Progress</h4>

            <p>
              Completed sessions: {completedSessions} / {totalSessions}
            </p>

            <p>{progressPercentage}% completed</p>

            <progress
              value={progressPercentage}
              max="100"
              aria-label="Study plan completion progress"
            />
          </div>

          {plan.schedule.map((item, index) => {
            const daySessions = item.sessions || []
            const dayCompleted = daySessions.filter(
              (session) => session.completed
            ).length

            return (
              <div className="study-plan-day" key={item.day ?? index}>
                <h4>
                  Day {item.day ?? index + 1}
                  {' — '}
                  {dayCompleted}/{daySessions.length} sessions completed
                </h4>

                {daySessions.length > 0 ? (
                  daySessions.map((session, sessionIndex) => {
                    const sessionKey =
                      `${item.day ?? index + 1}-${sessionIndex}`

                    const isSaving = savingSession === sessionKey

                    return (
                      <div
                        className="study-plan-session"
                        key={session._id || sessionKey}
                      >
                        <p>
                          <strong>Subject:</strong> {session.subject}
                        </p>

                        <p>
                          <strong>Topic:</strong> {session.topic}
                        </p>

                        <p>
                          <strong>Duration:</strong>{' '}
                          {session.durationMinutes} minutes
                        </p>

                        <p>
                          <strong>Activity:</strong> {session.activity}
                        </p>

                        <label className="session-completion">
                          <input
                            type="checkbox"
                            checked={Boolean(session.completed)}
                            disabled={Boolean(savingSession)}
                            onChange={() =>
                              toggleSessionCompletion(
                                item.day ?? index + 1,
                                sessionIndex,
                                Boolean(session.completed)
                              )
                            }
                          />

                          {isSaving
                            ? 'Saving progress...'
                            : session.completed
                              ? 'Completed'
                              : 'Mark as completed'}
                        </label>

                        {session.completedAt && (
                          <p className="session-completed-date">
                            Completed on:{' '}
                            {new Date(
                              session.completedAt
                            ).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <p>No study sessions were provided for this day.</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default StudyPlanner
