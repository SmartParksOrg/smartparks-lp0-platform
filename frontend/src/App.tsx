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

type DecoderSummary = {
  id: string
  name: string
  kind: string
  size_bytes: number
  uploaded_at: string | null
}

const defaultDecoderUpload = {
  file: null as File | null,
}

type DecodeRow = {
  status: string
  devaddr: string | null
  fcnt: number | null
  fport: number | null
  time: string | null
  payload_hex: string | null
  decoded_json: unknown | null
  error: string | null
}

type ReplayRow = {
  status: string
  gateway_eui: string | null
  frequency: number | null
  size: number | null
  message: string
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

const defaultDecodeForm = {
  scan_token: '',
  decoder_id: 'raw',
  devaddrs: '',
}

type DeviceCredential = {
  id: string
  devaddr: string
  device_name: string | null
  nwkskey: string
  appskey: string
}

const defaultDeviceForm = {
  devaddr: '',
  device_name: '',
  nwkskey: '',
  appskey: '',
}

const defaultReplayForm = {
  scan_token: '',
  udp_host: '127.0.0.1',
  udp_port: 1700,
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
  const [decoders, setDecoders] = useState<DecoderSummary[]>([])
  const [decodeForm, setDecodeForm] = useState(defaultDecodeForm)
  const [decodeRows, setDecodeRows] = useState<DecodeRow[]>([])
  const [decodeToken, setDecodeToken] = useState('')
  const [decodeError, setDecodeError] = useState('')
  const [decodeLoading, setDecodeLoading] = useState(false)
  const [devices, setDevices] = useState<DeviceCredential[]>([])
  const [deviceForm, setDeviceForm] = useState(defaultDeviceForm)
  const [deviceError, setDeviceError] = useState('')
  const [deviceLoading, setDeviceLoading] = useState(false)
  const [decoderUpload, setDecoderUpload] = useState(defaultDecoderUpload)
  const [decoderSourceId, setDecoderSourceId] = useState('')
  const [decoderSource, setDecoderSource] = useState('')
  const [decoderError, setDecoderError] = useState('')
  const [decoderLoading, setDecoderLoading] = useState(false)
  const [replayForm, setReplayForm] = useState(defaultReplayForm)
  const [replayRows, setReplayRows] = useState<ReplayRow[]>([])
  const [replayJobId, setReplayJobId] = useState('')
  const [replayError, setReplayError] = useState('')
  const [replayLoading, setReplayLoading] = useState(false)

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

  useEffect(() => {
    if (!authToken) {
      setDecoders([])
      return
    }
    const controller = new AbortController()
    fetch(`${apiBase}/api/v1/decoders`, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Decoder list failed: ${response.status}`)
        }
        return response.json() as Promise<DecoderSummary[]>
      })
      .then((data) => setDecoders(data))
      .catch(() => setDecoders([]))

    return () => controller.abort()
  }, [apiBase, authToken])

  useEffect(() => {
    if (!authToken) {
      setDevices([])
      return
    }
    const controller = new AbortController()
    setDeviceLoading(true)
    setDeviceError('')
    fetch(`${apiBase}/api/v1/devices`, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Device list failed: ${response.status}`)
        }
        return response.json() as Promise<DeviceCredential[]>
      })
      .then((data) => setDevices(data))
      .catch((err: Error) => {
        if (err.name !== 'AbortError') {
          setDeviceError(err.message)
        }
      })
      .finally(() => setDeviceLoading(false))

    return () => controller.abort()
  }, [apiBase, authToken])

  const refreshDecoders = async () => {
    if (!authToken) {
      setDecoders([])
      return
    }
    setDecoderLoading(true)
    setDecoderError('')
    try {
      const response = await fetch(`${apiBase}/api/v1/decoders`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      if (!response.ok) {
        throw new Error(`Decoder list failed: ${response.status}`)
      }
      const data = (await response.json()) as DecoderSummary[]
      setDecoders(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Decoder list failed'
      setDecoderError(message)
    } finally {
      setDecoderLoading(false)
    }
  }

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

  const handleDecodeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setDecodeLoading(true)
    setDecodeError('')
    setDecodeRows([])
    setDecodeToken('')

    const devaddrs = decodeForm.devaddrs
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)

    try {
      const response = await fetch(`${apiBase}/api/v1/decode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          scan_token: decodeForm.scan_token || null,
          decoder_id: decodeForm.decoder_id || 'raw',
          devaddrs: devaddrs.length ? devaddrs : null,
        }),
      })

      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || `Decode failed: ${response.status}`)
      }

      const data = (await response.json()) as { token: string; rows: DecodeRow[] }
      setDecodeToken(data.token)
      setDecodeRows(data.rows)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Decode failed'
      setDecodeError(message)
    } finally {
      setDecodeLoading(false)
    }
  }

  const handleExport = async (format: 'csv' | 'json') => {
    if (!decodeToken) return
    setDecodeError('')
    try {
      const response = await fetch(`${apiBase}/api/v1/decode/${decodeToken}/export/${format}`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      })
      if (!response.ok) {
        throw new Error(`Export failed: ${response.status}`)
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `decode-results.${format}`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed'
      setDecodeError(message)
    }
  }

  const handleReplaySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setReplayLoading(true)
    setReplayError('')
    setReplayRows([])
    setReplayJobId('')

    try {
      const response = await fetch(`${apiBase}/api/v1/replay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          scan_token: replayForm.scan_token || null,
          udp_host: replayForm.udp_host,
          udp_port: Number(replayForm.udp_port),
        }),
      })

      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || `Replay failed: ${response.status}`)
      }

      const data = (await response.json()) as { id: string; rows: ReplayRow[] }
      setReplayJobId(data.id)
      setReplayRows(data.rows)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Replay failed'
      setReplayError(message)
    } finally {
      setReplayLoading(false)
    }
  }

  const handleDeviceSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setDeviceError('')
    if (!authToken) {
      setDeviceError('Auth token required to manage devices.')
      return
    }
    setDeviceLoading(true)
    try {
      const response = await fetch(`${apiBase}/api/v1/devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          devaddr: deviceForm.devaddr,
          device_name: deviceForm.device_name || null,
          nwkskey: deviceForm.nwkskey,
          appskey: deviceForm.appskey,
        }),
      })
      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || `Create failed: ${response.status}`)
      }
      const created = (await response.json()) as DeviceCredential
      setDevices((prev) => [created, ...prev])
      setDeviceForm(defaultDeviceForm)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Create failed'
      setDeviceError(message)
    } finally {
      setDeviceLoading(false)
    }
  }

  const handleDeviceDelete = async (deviceId: string) => {
    setDeviceError('')
    if (!authToken) {
      setDeviceError('Auth token required to manage devices.')
      return
    }
    setDeviceLoading(true)
    try {
      const response = await fetch(`${apiBase}/api/v1/devices/${deviceId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })
      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || `Delete failed: ${response.status}`)
      }
      setDevices((prev) => prev.filter((device) => device.id !== deviceId))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed'
      setDeviceError(message)
    } finally {
      setDeviceLoading(false)
    }
  }

  const handleDecoderUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setDecoderError('')
    if (!authToken) {
      setDecoderError('Auth token required to manage decoders.')
      return
    }
    if (!decoderUpload.file) {
      setDecoderError('Select a .js decoder file first.')
      return
    }
    setDecoderLoading(true)
    try {
      const form = new FormData()
      form.append('upload', decoderUpload.file)
      const response = await fetch(`${apiBase}/api/v1/decoders/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: form,
      })
      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || `Upload failed: ${response.status}`)
      }
      setDecoderUpload(defaultDecoderUpload)
      await refreshDecoders()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      setDecoderError(message)
    } finally {
      setDecoderLoading(false)
    }
  }

  const handleDecoderDelete = async (decoderId: string) => {
    setDecoderError('')
    if (!authToken) {
      setDecoderError('Auth token required to manage decoders.')
      return
    }
    setDecoderLoading(true)
    try {
      const response = await fetch(`${apiBase}/api/v1/decoders/${decoderId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })
      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || `Delete failed: ${response.status}`)
      }
      await refreshDecoders()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed'
      setDecoderError(message)
    } finally {
      setDecoderLoading(false)
    }
  }

  const handleDecoderSource = async (decoderId: string) => {
    setDecoderError('')
    setDecoderSource('')
    setDecoderSourceId(decoderId)
    if (!authToken) {
      setDecoderError('Auth token required to view decoder source.')
      return
    }
    setDecoderLoading(true)
    try {
      const response = await fetch(`${apiBase}/api/v1/decoders/${decoderId}/source`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })
      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || `Source failed: ${response.status}`)
      }
      const text = await response.text()
      setDecoderSource(text)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Source failed'
      setDecoderError(message)
    } finally {
      setDecoderLoading(false)
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

      <section className="app__card app__card--form">
        <div className="card__header">
          <div>
            <h2>Decoders</h2>
            <p>Manage built-in and uploaded JavaScript decoders.</p>
          </div>
          <div className="card__pill">JS</div>
        </div>

        <form className="form" onSubmit={handleDecoderUpload}>
          <div className="form__grid">
            <label>
              Upload decoder (.js)
              <input
                type="file"
                accept=".js"
                onChange={(event) =>
                  setDecoderUpload({ file: event.target.files?.[0] ?? null })
                }
              />
            </label>
          </div>
          <div className="form__actions">
            <button type="submit" disabled={decoderLoading}>
              {decoderLoading ? 'Uploading…' : 'Upload decoder'}
            </button>
            <button
              type="button"
              className="ghost"
              disabled={decoderLoading}
              onClick={refreshDecoders}
            >
              Refresh list
            </button>
          </div>
        </form>

        {decoderError && <p className="status status--error">{decoderError}</p>}

        <div className="decoder-table">
          <div className="decoder-table__header">
            <span>Name</span>
            <span>Kind</span>
            <span>Size</span>
            <span>Actions</span>
          </div>
          {decoderLoading && decoders.length === 0 && <p className="status">Loading...</p>}
          {decoders.map((decoder) => (
            <div className="decoder-table__row" key={decoder.id}>
              <span className="mono">{decoder.name}</span>
              <span>{decoder.kind}</span>
              <span>{decoder.size_bytes} B</span>
              <span className="decoder-table__actions">
                <button
                  type="button"
                  className="ghost"
                  onClick={() => handleDecoderSource(decoder.id)}
                  disabled={decoderLoading}
                >
                  View source
                </button>
                {decoder.kind === 'uploaded' && (
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => handleDecoderDelete(decoder.id)}
                    disabled={decoderLoading}
                  >
                    Delete
                  </button>
                )}
              </span>
            </div>
          ))}
          {!decoderLoading && decoders.length === 0 && (
            <p className="status">No decoders found.</p>
          )}
        </div>

        {decoderSource && (
          <div className="decoder-source">
            <div className="decoder-source__header">
              <h3>Decoder Source</h3>
              {decoderSourceId && <span className="mono">{decoderSourceId}</span>}
            </div>
            <pre>{decoderSource}</pre>
          </div>
        )}
      </section>

      <section className="app__card app__card--form">
        <div className="card__header">
          <div>
            <h2>Devices</h2>
            <p>Manage ABP session keys tied to DevAddr.</p>
          </div>
          <div className="card__pill">Keys</div>
        </div>

        <form className="form" onSubmit={handleDeviceSubmit}>
          <div className="form__grid">
            <label>
              DevAddr
              <input
                value={deviceForm.devaddr}
                onChange={(event) =>
                  setDeviceForm((prev) => ({ ...prev, devaddr: event.target.value }))
                }
                placeholder="26011BDA"
                required
              />
            </label>
            <label>
              Device name (optional)
              <input
                value={deviceForm.device_name}
                onChange={(event) =>
                  setDeviceForm((prev) => ({ ...prev, device_name: event.target.value }))
                }
                placeholder="Field sensor 12"
              />
            </label>
            <label>
              NwkSKey
              <input
                value={deviceForm.nwkskey}
                onChange={(event) =>
                  setDeviceForm((prev) => ({ ...prev, nwkskey: event.target.value }))
                }
                placeholder="32 hex characters"
                required
              />
            </label>
            <label>
              AppSKey
              <input
                value={deviceForm.appskey}
                onChange={(event) =>
                  setDeviceForm((prev) => ({ ...prev, appskey: event.target.value }))
                }
                placeholder="32 hex characters"
                required
              />
            </label>
          </div>

          <div className="form__actions">
            <button type="submit" disabled={deviceLoading}>
              {deviceLoading ? 'Saving…' : 'Add device'}
            </button>
          </div>
        </form>

        {deviceError && <p className="status status--error">{deviceError}</p>}

        <div className="device-table">
          <div className="device-table__header">
            <span>DevAddr</span>
            <span>Name</span>
            <span>NwkSKey</span>
            <span>AppSKey</span>
            <span>Actions</span>
          </div>
          {deviceLoading && devices.length === 0 && (
            <p className="status">Loading devices...</p>
          )}
          {devices.map((device) => (
            <div className="device-table__row" key={device.id}>
              <span className="mono">{device.devaddr}</span>
              <span>{device.device_name || '-'}</span>
              <span className="mono">{device.nwkskey}</span>
              <span className="mono">{device.appskey}</span>
              <span>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => handleDeviceDelete(device.id)}
                  disabled={deviceLoading}
                >
                  Delete
                </button>
              </span>
            </div>
          ))}
          {!deviceLoading && devices.length === 0 && (
            <p className="status">No devices yet.</p>
          )}
        </div>
      </section>

      <section className="app__card app__card--form">
        <div className="card__header">
          <div>
            <h2>Replay</h2>
            <p>Send Semtech UDP PUSH_DATA packets to a target host and port.</p>
          </div>
          <div className="card__pill">UDP</div>
        </div>

        <form className="form" onSubmit={handleReplaySubmit}>
          <div className="form__grid">
            <label>
              Scan token
              <input
                value={replayForm.scan_token}
                onChange={(event) =>
                  setReplayForm((prev) => ({ ...prev, scan_token: event.target.value }))
                }
                placeholder="Paste scan token"
                required
              />
            </label>
            <label>
              UDP host
              <input
                value={replayForm.udp_host}
                onChange={(event) =>
                  setReplayForm((prev) => ({ ...prev, udp_host: event.target.value }))
                }
                required
              />
            </label>
            <label>
              UDP port
              <input
                type="number"
                min={1}
                max={65535}
                value={replayForm.udp_port}
                onChange={(event) =>
                  setReplayForm((prev) => ({ ...prev, udp_port: Number(event.target.value) }))
                }
                required
              />
            </label>
          </div>

          <div className="form__actions">
            <button type="submit" disabled={replayLoading}>
              {replayLoading ? 'Replaying…' : 'Start replay'}
            </button>
          </div>
        </form>

        {replayError && <p className="status status--error">{replayError}</p>}

        {replayRows.length > 0 && (
          <div className="replay-table">
            <div className="replay-table__header">
              <span>Status</span>
              <span>Gateway EUI</span>
              <span>Frequency</span>
              <span>Size</span>
              <span>Message</span>
            </div>
            {replayRows.map((row, index) => (
              <div className="replay-table__row" key={`${row.gateway_eui ?? 'row'}-${index}`}>
                <span className={row.status === 'sent' ? 'ok' : 'error'}>
                  {row.status}
                </span>
                <span>{row.gateway_eui ?? '-'}</span>
                <span>{row.frequency ?? '-'}</span>
                <span>{row.size ?? '-'}</span>
                <span>{row.message}</span>
              </div>
            ))}
            {replayJobId && (
              <p className="result__meta">Replay job: {replayJobId}</p>
            )}
          </div>
        )}
      </section>

      <section className="app__card app__card--form">
        <div className="card__header">
          <div>
            <h2>Decrypt &amp; Decode</h2>
            <p>Use a scan token to decrypt uplinks and run a decoder.</p>
          </div>
          <div className="card__pill">Decode</div>
        </div>

        <form className="form" onSubmit={handleDecodeSubmit}>
          <div className="form__grid">
            <label>
              Scan token
              <input
                value={decodeForm.scan_token}
                onChange={(event) =>
                  setDecodeForm((prev) => ({ ...prev, scan_token: event.target.value }))
                }
                placeholder="Paste scan token"
                required
              />
            </label>
            <label>
              Decoder
              <select
                value={decodeForm.decoder_id}
                onChange={(event) =>
                  setDecodeForm((prev) => ({ ...prev, decoder_id: event.target.value }))
                }
              >
                <option value="raw">Raw payload only</option>
                {decoders.map((decoder) => (
                  <option key={decoder.id} value={decoder.id}>
                    {decoder.name} ({decoder.kind})
                  </option>
                ))}
              </select>
            </label>
            <label>
              DevAddrs (optional)
              <input
                value={decodeForm.devaddrs}
                onChange={(event) =>
                  setDecodeForm((prev) => ({ ...prev, devaddrs: event.target.value }))
                }
                placeholder="26011BDA,01020304"
              />
            </label>
          </div>

          <div className="form__actions">
            <button type="submit" disabled={decodeLoading}>
              {decodeLoading ? 'Decoding…' : 'Run decode'}
            </button>
            <button
              type="button"
              className="ghost"
              disabled={!decodeToken}
              onClick={() => handleExport('csv')}
            >
              Export CSV
            </button>
            <button
              type="button"
              className="ghost"
              disabled={!decodeToken}
              onClick={() => handleExport('json')}
            >
              Export JSON
            </button>
          </div>
        </form>

        {decodeError && <p className="status status--error">{decodeError}</p>}

        {decodeRows.length > 0 && (
          <div className="decode-table">
            <div className="decode-table__header">
              <span>Status</span>
              <span>DevAddr</span>
              <span>FCnt</span>
              <span>FPort</span>
              <span>Time</span>
              <span>Payload</span>
              <span>Decoded JSON</span>
            </div>
            {decodeRows.map((row, index) => (
              <div className="decode-table__row" key={`${row.devaddr ?? 'row'}-${index}`}>
                <span className={row.status === 'ok' ? 'ok' : 'error'}>
                  {row.status}
                </span>
                <span>{row.devaddr ?? '-'}</span>
                <span>{row.fcnt ?? '-'}</span>
                <span>{row.fport ?? '-'}</span>
                <span>{row.time ?? '-'}</span>
                <span className="mono">{row.payload_hex ?? ''}</span>
                <span className="mono">
                  {row.decoded_json ? JSON.stringify(row.decoded_json) : row.error ?? ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default App
