import { createContext, useContext } from 'react'

type AuthContextValue = {
  token: string
  setToken: (token: string) => void
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
export type { AuthContextValue }
