import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function LoginPage() {
  const apiBase = import.meta.env.VITE_API_BASE ?? ''
  const navigate = useNavigate()
  const { token, setToken } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (token) {
      navigate('/')
    }
  }, [navigate, token])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`${apiBase}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || `Login failed: ${response.status}`)
      }
      const data = (await response.json()) as { access_token: string }
      setToken(data.access_token)
      navigate('/')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <section className="app__card app__card--form">
        <div className="card__header">
          <div>
            <h2>Log in</h2>
            <p>Use the admin email and password configured for this instance.</p>
          </div>
          <div className="card__pill">Auth</div>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          <div className="form__grid">
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
          </div>
          <div className="form__actions">
            <button type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </div>
        </form>

        {error && <p className="status status--error">{error}</p>}
        <div className="placeholder">
          <p>
            If you do not have credentials yet, set <span className="mono">ADMIN_EMAIL</span>
            and <span className="mono">ADMIN_PASSWORD</span> in your local
            <span className="mono">.env</span> and restart the backend.
          </p>
        </div>
      </section>
    </div>
  )
}

export default LoginPage
