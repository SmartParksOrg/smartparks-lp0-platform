import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'

import type { DeviceCredential } from './types'

const defaultDeviceForm = {
  devaddr: '',
  device_name: '',
  nwkskey: '',
  appskey: '',
}

function DevicesPage() {
  const apiBase = import.meta.env.VITE_API_BASE ?? ''
  const { token: authToken } = useAuth()
  const [devices, setDevices] = useState<DeviceCredential[]>([])
  const [deviceForm, setDeviceForm] = useState(defaultDeviceForm)
  const [deviceError, setDeviceError] = useState('')
  const [deviceLoading, setDeviceLoading] = useState(false)

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

  return (
    <div className="page">
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
    </div>
  )
}

export default DevicesPage
