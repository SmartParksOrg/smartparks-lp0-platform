import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import type { AdminUser } from './types'

type UserFormState = {
  email: string
  password: string
  role: 'admin' | 'editor' | 'viewer'
  is_active: boolean
}

type UserEditState = {
  role: 'admin' | 'editor' | 'viewer'
  is_active: boolean
  password: string
}

const defaultForm: UserFormState = {
  email: '',
  password: '',
  role: 'viewer',
  is_active: true,
}

function AdminPage() {
  const apiBase = import.meta.env.VITE_API_BASE ?? ''
  const { token: authToken } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formState, setFormState] = useState<UserFormState>(defaultForm)
  const [edits, setEdits] = useState<Record<string, UserEditState>>({})

  const loadUsers = useCallback(async () => {
    if (!authToken) {
      setUsers([])
      return
    }
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`${apiBase}/api/v1/admin/users`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || `Users list failed: ${response.status}`)
      }
      const data = (await response.json()) as AdminUser[]
      setUsers(data)
      setEdits(
        data.reduce<Record<string, UserEditState>>((acc, user) => {
          acc[user.id] = {
            role: user.role as UserEditState['role'],
            is_active: user.is_active,
            password: '',
          }
          return acc
        }, {}),
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Users list failed'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [apiBase, authToken])

  useEffect(() => {
    loadUsers().catch(() => undefined)
  }, [loadUsers])

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!authToken) {
      setError('Admin token required.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`${apiBase}/api/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          email: formState.email,
          password: formState.password,
          role: formState.role,
          is_active: formState.is_active,
        }),
      })
      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || `Create failed: ${response.status}`)
      }
      setFormState(defaultForm)
      await loadUsers()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Create failed'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const updateEdit = (userId: string, changes: Partial<UserEditState>) => {
    setEdits((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        ...changes,
      },
    }))
  }

  const handleSave = async (userId: string) => {
    const payload = edits[userId]
    if (!payload || !authToken) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`${apiBase}/api/v1/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          role: payload.role,
          is_active: payload.is_active,
          password: payload.password || null,
        }),
      })
      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || `Update failed: ${response.status}`)
      }
      updateEdit(userId, { password: '' })
      await loadUsers()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Update failed'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (userId: string) => {
    if (!authToken) {
      setError('Admin token required.')
      return
    }
    if (!window.confirm('Delete this user? This cannot be undone.')) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`${apiBase}/api/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      })
      if (!response.ok && response.status !== 204) {
        const message = await response.text()
        throw new Error(message || `Delete failed: ${response.status}`)
      }
      setUsers((prev) => prev.filter((user) => user.id !== userId))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const rows = useMemo(() => users.filter((user) => edits[user.id]), [users, edits])

  return (
    <div className="page">
      <section className="app__card app__card--form">
        <div className="card__header">
          <div>
            <h2>Admin</h2>
            <p>Manage user access, roles, and activation status.</p>
          </div>
          <div className="card__pill">Users</div>
        </div>

        <form className="form" onSubmit={handleCreate}>
          <div className="form__grid">
            <label>
              Email
              <input
                type="email"
                value={formState.email}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, email: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Temp password
              <input
                type="password"
                value={formState.password}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, password: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Role
              <select
                value={formState.role}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    role: event.target.value as UserFormState['role'],
                  }))
                }
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <label>
              Active
              <input
                type="checkbox"
                checked={formState.is_active}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, is_active: event.target.checked }))
                }
              />
            </label>
          </div>
          <div className="form__actions">
            <button type="submit" disabled={loading}>
              {loading ? 'Saving…' : 'Create user'}
            </button>
            <button type="button" className="ghost" onClick={loadUsers} disabled={loading}>
              Refresh list
            </button>
          </div>
        </form>

        {error && <p className="status status--error">{error}</p>}

        <div className="admin-table">
          <div className="admin-table__header">
            <span>Email</span>
            <span>Role</span>
            <span>Active</span>
            <span>Reset password</span>
            <span>Actions</span>
          </div>
          {loading && users.length === 0 && <p className="status">Loading...</p>}
          {rows.map((user) => {
            const edit = edits[user.id]
            return (
              <div className="admin-table__row" key={user.id}>
                <span className="mono">{user.email}</span>
                <select
                  value={edit.role}
                  onChange={(event) =>
                    updateEdit(user.id, {
                      role: event.target.value as UserEditState['role'],
                    })
                  }
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
                <input
                  type="checkbox"
                  checked={edit.is_active}
                  onChange={(event) =>
                    updateEdit(user.id, { is_active: event.target.checked })
                  }
                />
                <input
                  type="password"
                  placeholder="New password"
                  value={edit.password}
                  onChange={(event) =>
                    updateEdit(user.id, { password: event.target.value })
                  }
                />
                <div className="admin-table__actions">
                  <button type="button" className="ghost" onClick={() => handleSave(user.id)}>
                    Save
                  </button>
                  <button type="button" className="ghost" onClick={() => handleDelete(user.id)}>
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
          {!loading && rows.length === 0 && <p className="status">No users found.</p>}
        </div>
      </section>
    </div>
  )
}

export default AdminPage
