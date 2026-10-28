import { useEffect, useState } from 'react'
import './App.css'
import Dashboard from './Dashboard'

function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [student, setStudent] = useState(null)
  useEffect(() => {
    const restoreSession = async () => {
      const token = sessionStorage.getItem('gradwiseToken')

      if (!token) return

      try {
        const response = await fetch('http://localhost:5000/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const data = await response.json()

        if (!response.ok) {
          sessionStorage.removeItem('gradwiseToken')
          return
        }

        setStudent(data.student)
      } catch (error) {
        console.error('Session restoration failed:', error)
      }
    }

    restoreSession()
  }, [])
  
  const handleLogin = async (event) => {
    event.preventDefault()

    setError('')
    setLoading(true)

    try {
      const response = await fetch(
        'http://localhost:5000/api/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Login failed.')
      }

      sessionStorage.setItem('gradwiseToken', data.token)
      setStudent(data.student)
      setPassword('')
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

  const handleLogout = () => {
    sessionStorage.removeItem('gradwiseToken')
    setStudent(null)
    setEmail('')
    setPassword('')
    setError('')
  }

  // Show the dashboard after successful login
  if (student) {
    return (
      <Dashboard
        student={student}
        onLogout={handleLogout}
      />
    )
  }

  // Show the login page when no student is logged in
  return (
    <div className="login-page">
      <div className="login-container">

        <div className="login-brand">
          <div className="brand-icon">✦</div>

          <h1>
            Grad<span>Wise</span>
          </h1>

          <p>Your personal AI learning companion</p>

          <div className="brand-message">
            <span className="eyebrow">
              LEARN SMARTER, EVERY DAY
            </span>

            <h2>
              Your journey.<br />
              Your pace.<br />
              Your success.
            </h2>

            <p>
              Discover your strengths, improve your weak subjects,
              and achieve your academic goals with personalized AI support.
            </p>

            <div className="feature-list">
              <div>✓ Personalized study plans</div>
              <div>✓ AI-powered explanations</div>
              <div>✓ Track your academic progress</div>
            </div>
          </div>

          <div className="brand-footer">
            ADAPTIVE AI LEARNING ASSISTANT
          </div>
        </div>

        <div className="login-form-section">
          <div className="form-content">
            <div className="mobile-brand">
              ✦ GradWise
            </div>

            <span className="welcome-label">
              WELCOME BACK
            </span>

            <h2>Sign in to your account</h2>

            <p className="form-description">
              Continue your learning journey where you left off.
            </p>

            <form onSubmit={handleLogin}>
              <label htmlFor="email">
                Student email
              </label>

              <input
                id="email"
                type="email"
                placeholder="Enter your student email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                required
              />

              <div className="password-label">
                <label htmlFor="password">
                  Password
                </label>
              </div>

              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />

              <button
                type="submit"
                className="login-button"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign in'}
                {!loading && <span> →</span>}
              </button>
            </form>

            {error && (
              <div className="login-error" role="alert">
                {error}
              </div>
            )}

            <div className="security-note">
              <span>🔒</span>
              Your personal learning space
            </div>

            <p className="demo-note">
              AI-powered learning designed around you.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}

export default App
