import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AuthContext, type AuthUser } from './context/AuthContext'
import './App.css'
import { useEffect, useMemo, useState } from 'react'

const navItems = [
  { to: '/', label: 'Start', icon: 'M12 3l8 6v10a2 2 0 0 1-2 2h-4v-6H10v6H6a2 2 0 0 1-2-2V9l8-6z' },
  { to: '/devices', label: 'Devices', icon: 'M7 7h10v10H7zM4 4h16v16H4z' },
  { to: '/files', label: 'Files', icon: 'M6 3h8l4 4v14H6V3zm8 1.5V8h3.5' },
  { to: '/decoders', label: 'Decoders', icon: 'M4 6h16M4 12h10M4 18h7' },
  { to: '/integrations', label: 'Integrations', icon: 'M7 7l5-4 5 4v10l-5 4-5-4V7z' },
  { to: '/about', label: 'About', icon: 'M12 8h.01M11 12h2v6h-2z' },
]

function App() {
  const apiBase = import.meta.env.VITE_API_BASE ?? ''
  const navigate = useNavigate()
  const location = useLocation()
  const [authToken, setAuthToken] = useState('')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authError, setAuthError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
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

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  const handleLogout = () => {
    setAuthToken('')
    setUser(null)
    navigate('/login')
  }

  return (
    <AuthContext.Provider value={authValue}>
      <div className="app">
        {sidebarOpen && (
          <button
            type="button"
            className="sidebar__backdrop"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          />
        )}
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar__brand">
            <div>
              <span className="app__badge">Smart Parks</span>
              <p className="sidebar__title">LP0 Platform</p>
            </div>
          </div>
          <nav className="sidebar__nav">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `sidebar__link ${isActive ? 'active' : ''}`
                }
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d={item.icon} />
                </svg>
                <span>{item.label}</span>
              </NavLink>
            ))}
            {user?.role === 'admin' && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `sidebar__link ${isActive ? 'active' : ''}`
                }
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2l7 4v6c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6l7-4z" />
                </svg>
                <span>Admin</span>
              </NavLink>
            )}
          </nav>
          <div className="sidebar__footer">
            {user ? (
              <div className="sidebar__user">
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
              <div className="sidebar__user">
                <div>
                  <p className="auth__label">Not signed in</p>
                  <p className="auth__value">Use your admin credentials.</p>
                </div>
                <button type="button" className="ghost" onClick={() => navigate('/login')}>
                  Log in
                </button>
              </div>
            )}
            {authError && <p className="status status--error">{authError}</p>}
          </div>
        </aside>
        <div className="app__main">
          <header className="topbar">
            <button
              type="button"
              className="sidebar__toggle"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <span />
              <span />
              <span />
            </button>
            <div>
              <h1>LP0 Platform</h1>
              <p className="app__subtitle">
                Inspect, decrypt, decode, and replay LoRaWAN uplinks from JSONL logs.
              </p>
            </div>
          </header>
          <main className="app__content">
            <Outlet />
          </main>
        </div>
      </div>
    </AuthContext.Provider>
  )
}

export default App
