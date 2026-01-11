import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

import type { DecoderSummary, DecodeRow, GenerateRequest, LogFileResponse, ReplayRow } from './types'

type GeneratorPreset = {
  id: string
  name: string
  description: string
  updates: Partial<GenerateRequest>
}

const generatorPresets: GeneratorPreset[] = [
  {
    id: 'heartbeat',
    name: 'Heartbeat',
    description: 'Short payload every minute for quick smoke tests.',
    updates: {
      frames: 60,
      interval_seconds: 60,
      payload_hex: '0101',
      datarate: 'SF7BW125',
      coding_rate: '4/5',
      frequency_mhz: 868.1,
    },
  },
  {
    id: 'gps',
    name: 'GPS Ping',
    description: 'Longer payload at a slower cadence for tracking.',
    updates: {
      frames: 30,
      interval_seconds: 120,
      payload_hex: '88E1F2C4010AF3B2',
      datarate: 'SF9BW125',
      coding_rate: '4/5',
      frequency_mhz: 868.5,
    },
  },
  {
    id: 'sensor',
    name: 'Sensor Burst',
    description: 'Dense bursts to test decode throughput.',
    updates: {
      frames: 200,
      interval_seconds: 5,
      payload_hex: '0A0B0C0D0E0F',
      datarate: 'SF7BW125',
      coding_rate: '4/5',
      frequency_mhz: 868.3,
    },
  },
  {
    id: 'empty',
    name: 'Empty Payload',
    description: 'No FRMPayload data, useful for edge cases.',
    updates: {
      frames: 20,
      interval_seconds: 30,
      payload_hex: null,
      datarate: 'SF8BW125',
      coding_rate: '4/5',
      frequency_mhz: 868.1,
    },
  },
]

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

const defaultReplayForm = {
  scan_token: '',
  udp_host: '127.0.0.1',
  udp_port: 1700,
}

function StartPage() {
  const apiBase = import.meta.env.VITE_API_BASE ?? ''
  const { token: authToken } = useAuth()
  const location = useLocation()
  const [health, setHealth] = useState<{ status: string } | null>(null)
  const [healthError, setHealthError] = useState('')
  const [healthLoading, setHealthLoading] = useState(true)
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
  const [selectedRow, setSelectedRow] = useState<DecodeRow | null>(null)
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
        return response.json() as Promise<{ status: string }>
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
    const params = new URLSearchParams(location.search)
    const scanToken = params.get('scan_token')?.trim()
    if (scanToken) {
      setDecodeForm((prev) => ({ ...prev, scan_token: scanToken }))
      setReplayForm((prev) => ({ ...prev, scan_token: scanToken }))
    }
    const hash = location.hash.replace('#', '')
    if (hash) {
      const target = document.getElementById(hash)
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }, [location.hash, location.search])

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

  const updateField = <K extends keyof GenerateRequest>(
    key: K,
    value: GenerateRequest[K],
  ) => {
    setFormState((prev) => ({ ...prev, [key]: value }))
  }

  const applyPreset = (preset: GeneratorPreset) => {
    setFormState((prev) => ({
      ...prev,
      ...preset.updates,
    }))
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

  return (
    <div className="page">
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
      </section>

      <section className="app__card app__card--form">
        <div className="card__header">
          <div>
            <h2>Generate Test Logfile</h2>
            <p>Defaults match EU868 settings used in V1.</p>
          </div>
          <div className="card__pill">JSONL</div>
        </div>

        <div className="preset-bar">
          <div>
            <p className="result__meta">Presets</p>
            <p className="preset-bar__hint">
              Quick-fill common payload patterns for testing.
            </p>
          </div>
          <div className="preset-bar__actions">
            {generatorPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className="ghost"
                onClick={() => applyPreset(preset)}
                title={preset.description}
              >
                {preset.name}
              </button>
            ))}
          </div>
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

      <section className="app__card app__card--form" id="replay">
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
            {replayJobId && <p className="result__meta">Replay job: {replayJobId}</p>}
          </div>
        )}
      </section>

      <section className="app__card app__card--form" id="decode">
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
              <button
                type="button"
                className="decode-table__row"
                key={`${row.devaddr ?? 'row'}-${index}`}
                onClick={() => setSelectedRow(row)}
              >
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
              </button>
            ))}
          </div>
        )}
        {selectedRow && (
          <div className="modal">
            <div className="modal__content">
              <div className="modal__header">
                <h3>Packet details</h3>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setSelectedRow(null)}
                >
                  Close
                </button>
              </div>
              <div className="modal__grid">
                <div>
                  <p className="result__meta">Status</p>
                  <p>{selectedRow.status}</p>
                </div>
                <div>
                  <p className="result__meta">DevAddr</p>
                  <p className="mono">{selectedRow.devaddr ?? '-'}</p>
                </div>
                <div>
                  <p className="result__meta">FCnt</p>
                  <p>{selectedRow.fcnt ?? '-'}</p>
                </div>
                <div>
                  <p className="result__meta">FPort</p>
                  <p>{selectedRow.fport ?? '-'}</p>
                </div>
                <div>
                  <p className="result__meta">Time</p>
                  <p>{selectedRow.time ?? '-'}</p>
                </div>
                <div>
                  <p className="result__meta">Payload (hex)</p>
                  <p className="mono">{selectedRow.payload_hex ?? '-'}</p>
                </div>
                <div className="modal__span">
                  <p className="result__meta">Decoded JSON</p>
                  <pre className="modal__code">
                    {selectedRow.decoded_json
                      ? JSON.stringify(selectedRow.decoded_json, null, 2)
                      : selectedRow.error ?? '—'}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

export default StartPage
