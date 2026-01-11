import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'

import type { DecoderSummary } from './types'

const defaultDecoderUpload = {
  file: null as File | null,
}

function DecodersPage() {
  const apiBase = import.meta.env.VITE_API_BASE ?? ''
  const { token: authToken } = useAuth()
  const [decoders, setDecoders] = useState<DecoderSummary[]>([])
  const [decoderUpload, setDecoderUpload] = useState(defaultDecoderUpload)
  const [decoderSourceId, setDecoderSourceId] = useState('')
  const [decoderSource, setDecoderSource] = useState('')
  const [decoderError, setDecoderError] = useState('')
  const [decoderLoading, setDecoderLoading] = useState(false)

  const refreshDecoders = useCallback(async () => {
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
  }, [apiBase, authToken])

  useEffect(() => {
    if (authToken) {
      refreshDecoders().catch(() => undefined)
    } else {
      setDecoders([])
    }
  }, [authToken, refreshDecoders])

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
    <div className="page">
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
    </div>
  )
}

export default DecodersPage
