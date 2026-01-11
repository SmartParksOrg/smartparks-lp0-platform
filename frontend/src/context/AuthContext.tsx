import { createContext, useContext } from 'react'

type AuthUser = {
  id: string
  email: string
  role: string
  is_active: boolean
}

type AuthContextValue = {
  token: string
  setToken: (token: string) => void
  user: AuthUser | null
  setUser: (user: AuthUser | null) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const useAuth = () => {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return value
}

export { AuthContext, useAuth }
export type { AuthContextValue, AuthUser }
