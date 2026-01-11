import { NavLink, Outlet } from 'react-router-dom'
import { AuthContext } from './context/AuthContext'
import './App.css'
import { useMemo, useState } from 'react'

function App() {
  const [authToken, setAuthToken] = useState('')
  const authValue = useMemo(() => ({ token: authToken, setToken: setAuthToken }), [authToken])

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
            <label htmlFor="token">Auth token (JWT)</label>
            <input
              id="token"
              type="password"
              placeholder="Paste token for editor/admin actions"
              value={authToken}
              onChange={(event) => setAuthToken(event.target.value)}
            />
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
          <NavLink
            to="/admin"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            Admin
          </NavLink>
        </nav>

        <main className="app__content">
          <Outlet />
        </main>
      </div>
    </AuthContext.Provider>
  )
}

export default App
