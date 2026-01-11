import { useEffect, useMemo, useState, type FormEvent } from 'react'
import './App.css'

type HealthStatus = {
  status: string
}

type LogFileResponse = {
  id: string
  original_filename: string
  size_bytes: number
  uploaded_at: string
  source_type: string
}

type GenerateRequest = {
  gateway_eui: string
  devaddr: string
  frames: number
  interval_seconds: number
  start_time: string | null
  frequency_mhz: number
  datarate: string
  coding_rate: string
  payload_hex: string | null
  filename: string | null
}

const defaultForm: GenerateRequest = {
  gateway_eui: '0102030405060708',
  devaddr: '26011BDA',
  frames: 100,
  interval_seconds: 10,
  start_time: null,
  frequency_mhz: 868.3,
  datarate: 'SF7BW125',
  coding_rate: '4/5',
  payload_hex: null,
  filename: null,
}

function App() {
  const apiBase = import.meta.env.VITE_API_BASE ?? ''
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [healthError, setHealthError] = useState('')
  const [healthLoading, setHealthLoading] = useState(true)
  const [authToken, setAuthToken] = useState('')
  const [formState, setFormState] = useState<GenerateRequest>(defaultForm)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [generated, setGenerated] = useState<LogFileResponse | null>(null)

  const formattedSize = useMemo(() => {
    if (!generated) return ''
    if (generated.size_bytes > 1024 * 1024) {
      return `${(generated.size_bytes / (1024 * 1024)).toFixed(2)} MB`
    }
    if (generated.size_bytes > 1024) {
      return `${(generated.size_bytes / 1024).toFixed(1)} KB`
    }
    return `${generated.size_bytes} B`
  }, [generated])

  useEffect(() => {
    const controller = new AbortController()

    setHealthLoading(true)
    setHealthError('')

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
          setHealthError(err.message)
        }
      })
      .finally(() => setHealthLoading(false))

    return () => controller.abort()
  }, [apiBase])

  const updateField = <K extends keyof GenerateRequest>(
    key: K,
    value: GenerateRequest[K],
  ) => {
    setFormState((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setSubmitError('')
    setGenerated(null)

    const payload: GenerateRequest = {
      ...formState,
      start_time: formState.start_time,
      payload_hex: formState.payload_hex?.trim() || null,
      filename: formState.filename?.trim() || null,
    }

    try {
      const response = await fetch(`${apiBase}/api/v1/files/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || `Request failed: ${response.status}`)
      }
      const data = (await response.json()) as LogFileResponse
      setGenerated(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Request failed'
      setSubmitError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDownload = async () => {
    if (!generated) return
    setSubmitError('')
    try {
      const response = await fetch(`${apiBase}/api/v1/files/${generated.id}/download`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      })
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`)
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = generated.original_filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Download failed'
      setSubmitError(message)
    }
  }

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__badge">Smart Parks</div>
        <h1>LP0 Generator Studio</h1>
        <p className="app__subtitle">
          Create realistic JSONL uplink logs with EU868 defaults, then store them
          in Files for scan, decode, and replay workflows.
        </p>
      </header>

      <section className="app__card app__card--status">
        <div>
          <h2>API Health</h2>
          {healthLoading && <p className="status">Checking...</p>}
          {!healthLoading && healthError && (
            <p className="status status--error">{healthError}</p>
          )}
          {!healthLoading && !healthError && health && (
            <p className="status status--ok">Status: {health.status}</p>
          )}
          {!healthLoading && !healthError && !health && (
            <p className="status status--error">No response payload.</p>
          )}
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
      </section>

      <section className="app__card app__card--form">
        <div className="card__header">
          <div>
            <h2>Generate Test Logfile</h2>
            <p>Defaults match EU868 settings used in V1.</p>
          </div>
          <div className="card__pill">JSONL</div>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          <div className="form__grid">
            <label>
              Gateway EUI
              <input
                value={formState.gateway_eui}
                onChange={(event) => updateField('gateway_eui', event.target.value)}
                required
              />
            </label>
            <label>
              DevAddr
              <input
                value={formState.devaddr}
                onChange={(event) => updateField('devaddr', event.target.value)}
                required
              />
            </label>
            <label>
              Frames
              <input
                type="number"
                min={1}
                max={10000}
                value={formState.frames}
                onChange={(event) => updateField('frames', Number(event.target.value))}
                required
              />
            </label>
            <label>
              Interval (sec)
              <input
                type="number"
                min={1}
                max={3600}
                value={formState.interval_seconds}
                onChange={(event) =>
                  updateField('interval_seconds', Number(event.target.value))
                }
                required
              />
            </label>
            <label>
              Start time (local)
              <input
                type="datetime-local"
                onChange={(event) =>
                  updateField(
                    'start_time',
                    event.target.value ? new Date(event.target.value).toISOString() : null,
                  )
                }
              />
            </label>
            <label>
              Frequency (MHz)
              <input
                type="number"
                min={1}
                step={0.1}
                value={formState.frequency_mhz}
                onChange={(event) =>
                  updateField('frequency_mhz', Number(event.target.value))
                }
                required
              />
            </label>
            <label>
              Datarate
              <input
                value={formState.datarate}
                onChange={(event) => updateField('datarate', event.target.value)}
                required
              />
            </label>
            <label>
              Coding rate
              <input
                value={formState.coding_rate}
                onChange={(event) => updateField('coding_rate', event.target.value)}
                required
              />
            </label>
            <label>
              Payload hex
              <input
                placeholder="Optional hex payload"
                value={formState.payload_hex ?? ''}
                onChange={(event) =>
                  updateField('payload_hex', event.target.value || null)
                }
              />
            </label>
            <label>
              Filename
              <input
                placeholder="generated-log.jsonl"
                value={formState.filename ?? ''}
                onChange={(event) => updateField('filename', event.target.value || null)}
              />
            </label>
          </div>

          <div className="form__actions">
            <button type="submit" disabled={submitting}>
              {submitting ? 'Generating…' : 'Generate log file'}
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => setFormState(defaultForm)}
            >
              Reset defaults
            </button>
          </div>
        </form>

        {submitError && <p className="status status--error">{submitError}</p>}

        {generated && (
          <div className="result">
            <div>
              <h3>Stored in Files</h3>
              <p className="result__meta">
                {generated.original_filename} · {formattedSize}
              </p>
              <p className="result__meta">File ID: {generated.id}</p>
            </div>
            <div className="result__actions">
              <button type="button" onClick={handleDownload} className="ghost">
                Download JSONL
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

export default App
