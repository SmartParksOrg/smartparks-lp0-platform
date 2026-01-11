import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

import type { LogFileResponse } from './types'

type ScanResponse = {
  token: string
  expires_at: string
  summary: {
    record_count: number
    gateway_euis: string[]
    devaddrs: string[]
  }
}

function FilesPage() {
  const apiBase = import.meta.env.VITE_API_BASE ?? ''
  const { token: authToken } = useAuth()
  const [files, setFiles] = useState<LogFileResponse[]>([])
  const [fileError, setFileError] = useState('')
  const [fileLoading, setFileLoading] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [scanResults, setScanResults] = useState<Record<string, ScanResponse>>({})
  const [previewContent, setPreviewContent] = useState<Record<string, string>>({})
  const [previewError, setPreviewError] = useState('')
  const [quickScanToken, setQuickScanToken] = useState('')
  const [quickError, setQuickError] = useState('')
  const buildStartLink = (token: string, section: 'decode' | 'replay') =>
    `/?scan_token=${encodeURIComponent(token)}#${section}`

  const fetchFiles = useCallback(async () => {
    if (!authToken) {
      setFiles([])
      return
    }
    setFileLoading(true)
    setFileError('')
    try {
      const response = await fetch(`${apiBase}/api/v1/files`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      if (!response.ok) {
        throw new Error(`Files list failed: ${response.status}`)
      }
      const data = (await response.json()) as LogFileResponse[]
      setFiles(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Files list failed'
      setFileError(message)
    } finally {
      setFileLoading(false)
    }
  }, [apiBase, authToken])

  useEffect(() => {
    fetchFiles().catch(() => undefined)
  }, [authToken, fetchFiles])

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFileError('')
    if (!authToken) {
      setFileError('Auth token required to upload files.')
      return
    }
    if (!uploadFile) {
      setFileError('Select a .jsonl file to upload.')
      return
    }
    setFileLoading(true)
    try {
      const form = new FormData()
      form.append('upload', uploadFile)
      const response = await fetch(`${apiBase}/api/v1/files/upload`, {
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
      setUploadFile(null)
      await fetchFiles()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      setFileError(message)
    } finally {
      setFileLoading(false)
    }
  }

  const handleDownload = async (fileId: string, filename: string) => {
    setFileError('')
    if (!authToken) {
      setFileError('Auth token required to download files.')
      return
    }
    try {
      const response = await fetch(`${apiBase}/api/v1/files/${fileId}/download`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`)
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Download failed'
      setFileError(message)
    }
  }

  const handleDelete = async (fileId: string) => {
    setFileError('')
    if (!authToken) {
      setFileError('Auth token required to delete files.')
      return
    }
    setFileLoading(true)
    try {
      const response = await fetch(`${apiBase}/api/v1/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      })
      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || `Delete failed: ${response.status}`)
      }
      setFiles((prev) => prev.filter((file) => file.id !== fileId))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed'
      setFileError(message)
    } finally {
      setFileLoading(false)
    }
  }

  const handlePreview = async (fileId: string) => {
    setPreviewError('')
    if (!authToken) {
      setPreviewError('Auth token required to preview files.')
      return
    }
    try {
      const response = await fetch(`${apiBase}/api/v1/files/${fileId}/preview`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      if (!response.ok) {
        throw new Error(`Preview failed: ${response.status}`)
      }
      const data = (await response.json()) as { content: string; truncated: boolean }
      setPreviewContent((prev) => ({
        ...prev,
        [fileId]: data.truncated ? `${data.content}\n…truncated…` : data.content,
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Preview failed'
      setPreviewError(message)
    }
  }

  const handleScan = async (fileId: string) => {
    setFileError('')
    if (!authToken) {
      setFileError('Auth token required to scan files.')
      return
    }
    setFileLoading(true)
    try {
      const response = await fetch(`${apiBase}/api/v1/files/${fileId}/scan`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      })
      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || `Scan failed: ${response.status}`)
      }
      const data = (await response.json()) as ScanResponse
      setScanResults((prev) => ({ ...prev, [fileId]: data }))
      setQuickScanToken(data.token)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Scan failed'
      setFileError(message)
    } finally {
      setFileLoading(false)
    }
  }

  const handleQuickCopy = async () => {
    if (!quickScanToken) return
    try {
      await navigator.clipboard.writeText(quickScanToken)
      setQuickError('')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Clipboard failed'
      setQuickError(message)
    }
  }

  return (
    <div className="page">
      <section className="app__card app__card--form">
        <div className="card__header">
          <div>
            <h2>Files</h2>
            <p>Upload, preview, scan, decode, and replay stored JSONL logs.</p>
          </div>
          <div className="card__pill">JSONL</div>
        </div>

        <form className="form" onSubmit={handleUpload}>
          <div className="form__grid">
            <label>
              Upload .jsonl
              <input
                type="file"
                accept=".jsonl"
                onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <div className="form__actions">
            <button type="submit" disabled={fileLoading}>
              {fileLoading ? 'Uploading…' : 'Upload file'}
            </button>
            <button type="button" className="ghost" onClick={fetchFiles}>
              Refresh list
            </button>
          </div>
        </form>

        {fileError && <p className="status status--error">{fileError}</p>}
        {previewError && <p className="status status--error">{previewError}</p>}

        {quickScanToken && (
          <div className="files-quick">
            <p className="result__meta">
              Latest scan token: <span className="mono">{quickScanToken}</span>
            </p>
            <div className="files-quick__actions">
              <button type="button" className="ghost" onClick={handleQuickCopy}>
                Copy token
              </button>
              <Link className="ghost" to={buildStartLink(quickScanToken, 'decode')}>
                Open Decode
              </Link>
              <Link className="ghost" to={buildStartLink(quickScanToken, 'replay')}>
                Open Replay
              </Link>
              <span className="files-quick__note">Paste into Decode or Replay forms on Start.</span>
            </div>
            {quickError && <p className="status status--error">{quickError}</p>}
          </div>
        )}

        <div className="files-table">
          <div className="files-table__header">
            <span>Name</span>
            <span>Size</span>
            <span>Source</span>
            <span>Actions</span>
          </div>
          {fileLoading && files.length === 0 && <p className="status">Loading...</p>}
          {files.map((file) => (
            <div className="files-table__row" key={file.id}>
              <span className="mono">{file.original_filename}</span>
              <span>{file.size_bytes} B</span>
              <span>{file.source_type}</span>
              <span className="files-table__actions">
                <button
                  type="button"
                  className="ghost"
                  onClick={() => handlePreview(file.id)}
                >
                  Preview
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => handleDownload(file.id, file.original_filename)}
                >
                  Download
                </button>
                <button type="button" className="ghost" onClick={() => handleScan(file.id)}>
                  Scan
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => handleDelete(file.id)}
                >
                  Delete
                </button>
              </span>
            </div>
          ))}
          {!fileLoading && files.length === 0 && <p className="status">No files yet.</p>}
        </div>

        {files.map((file) => {
          const scan = scanResults[file.id]
          return (
            <div className="files-detail" key={`${file.id}-detail`}>
              {previewContent[file.id] && (
                <div className="files-preview">
                  <h3>Preview: {file.original_filename}</h3>
                  <pre>{previewContent[file.id]}</pre>
                </div>
              )}
              {scan && (
                <div className="files-scan">
                  <h3>Scan Results</h3>
                  <p className="result__meta">Token: {scan.token}</p>
                  <div className="result__actions">
                    <Link className="ghost" to={buildStartLink(scan.token, 'decode')}>
                      Open Decode
                    </Link>
                    <Link className="ghost" to={buildStartLink(scan.token, 'replay')}>
                      Open Replay
                    </Link>
                  </div>
                  <p className="result__meta">Records: {scan.summary.record_count}</p>
                  <p className="result__meta">
                    Gateways: {scan.summary.gateway_euis.join(', ') || 'None'}
                  </p>
                  <p className="result__meta">
                    DevAddrs: {scan.summary.devaddrs.join(', ') || 'None'}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </section>
    </div>
  )
}

export default FilesPage
