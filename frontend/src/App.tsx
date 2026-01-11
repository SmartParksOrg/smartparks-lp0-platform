import { useEffect, useState } from 'react'
import './App.css'

type HealthStatus = {
  status: string
}

function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    const apiBase = import.meta.env.VITE_API_BASE ?? ''

    setLoading(true)
    setError('')

    fetch(`${apiBase}/api/v1/health`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`)
        }
        return response.json() as Promise<HealthStatus>
      })
      .then((data) => setHealth(data))
      .catch((err: Error) => {
        if (err.name !== 'AbortError') {
          setError(err.message)
        }
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [])

  return (
    <div className="app">
      <header className="app__header">
        <p className="app__eyebrow">Smart Parks</p>
        <h1>LP0 Platform</h1>
        <p className="app__subtitle">Frontend and API connectivity check.</p>
      </header>
      <section className="app__card">
        <h2>API Health</h2>
        {loading && <p className="status">Checking...</p>}
        {!loading && error && <p className="status status--error">{error}</p>}
        {!loading && !error && health && (
          <p className="status status--ok">Status: {health.status}</p>
        )}
        {!loading && !error && !health && (
          <p className="status status--error">No response payload.</p>
        )}
      </section>
    </div>
  )
}

export default App
