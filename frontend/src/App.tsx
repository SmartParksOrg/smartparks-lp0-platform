import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AuthContext, type AuthUser } from './context/AuthContext'
import './App.css'
import { useEffect, useMemo, useState } from 'react'

function App() {
  const apiBase = import.meta.env.VITE_API_BASE ?? ''
  const navigate = useNavigate()
  const location = useLocation()
  const [authToken, setAuthToken] = useState('')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authError, setAuthError] = useState('')
  const authValue = useMemo(
    () => ({ token: authToken, setToken: setAuthToken, user, setUser }),
    [authToken, user],
  )

  useEffect(() => {
    const stored = window.localStorage.getItem('smartparks.jwt')
    if (stored) {
      setAuthToken(stored)
    }
  }, [])

  useEffect(() => {
    if (!authToken) {
      setUser(null)
      setAuthError('')
      window.localStorage.removeItem('smartparks.jwt')
      return
    }
    window.localStorage.setItem('smartparks.jwt', authToken)
    setAuthError('')
    fetch(`${apiBase}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then(async (response) => {
        if (!response.ok) {
          const message = await response.text()
          throw new Error(message || `Auth failed: ${response.status}`)
        }
        return response.json()
      })
      .then((data) => setUser(data))
      .catch((err: Error) => {
        setUser(null)
        setAuthToken('')
        setAuthError(err.message)
      })
  }, [apiBase, authToken])

  useEffect(() => {
    if (!authToken && location.pathname !== '/login') {
      navigate('/login', { replace: true })
    }
  }, [authToken, location.pathname, navigate])

  const handleLogout = () => {
    setAuthToken('')
    setUser(null)
    navigate('/login')
  }

  return (
    <AuthContext.Provider value={authValue}>
      <div className="app">
        <header className="app__header">
          <div>
            <div className="app__badge">Smart Parks</div>
            <h1>LP0 Platform</h1>
            <p className="app__subtitle">
              Inspect, decrypt, decode, and replay LoRaWAN uplinks from JSONL logs.
            </p>
          </div>
          <div className="auth">
            {user ? (
              <div className="auth__status">
                <div>
                  <p className="auth__label">Signed in</p>
                  <p className="auth__value">
                    {user.email} · {user.role}
                  </p>
                </div>
                <button type="button" className="ghost" onClick={handleLogout}>
                  Log out
                </button>
              </div>
            ) : (
              <div className="auth__status">
                <div>
                  <p className="auth__label">Not signed in</p>
                  <p className="auth__value">Use your admin credentials to continue.</p>
                </div>
                <button type="button" className="ghost" onClick={() => navigate('/login')}>
                  Log in
                </button>
              </div>
            )}
            {authError && <p className="status status--error">{authError}</p>}
          </div>
        </header>

        <nav className="app__nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            Start
          </NavLink>
          <NavLink
            to="/devices"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            Devices
          </NavLink>
          <NavLink
            to="/files"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            Files
          </NavLink>
          <NavLink
            to="/decoders"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            Decoders
          </NavLink>
          <NavLink
            to="/integrations"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            Integrations
          </NavLink>
          <NavLink
            to="/about"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            About
          </NavLink>
          {user?.role === 'admin' && (
            <NavLink
              to="/admin"
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              Admin
            </NavLink>
          )}
        </nav>

        <main className="app__content">
          <Outlet />
        </main>
      </div>
    </AuthContext.Provider>
  )
}

export default App
