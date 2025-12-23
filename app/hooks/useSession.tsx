'use client'

/**
 * Session Hook & Provider - Simplified
 *
 * No session management - provides empty context.
 */

import {
  createContext,
  useContext,
  type ReactNode,
} from 'react'

interface SessionContextType {
  session: null
  loading: boolean
  error: null
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

const SessionContext = createContext<SessionContextType | null>(null)

interface SessionProviderProps {
  children: ReactNode
}

export function SessionProvider({ children }: SessionProviderProps) {
  const value: SessionContextType = {
    session: null,
    loading: false,
    error: null,
    refresh: async () => {},
    logout: async () => {
      window.location.href = '/login'
    },
  }

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error('useSession must be used within SessionProvider')
  }
  return context
}

export function useStudentSession() {
  return { session: null, loading: false, error: null, refresh: async () => {}, logout: async () => {} }
}

export function useTeacherSession() {
  return { session: null, loading: false, error: null, refresh: async () => {}, logout: async () => {} }
}

export function useAdminSession() {
  return { session: null, loading: false, error: null, refresh: async () => {}, logout: async () => {} }
}

export function useStaffSession() {
  return { session: null, loading: false, error: null, refresh: async () => {}, logout: async () => {} }
}

export function useIsAuthenticated() {
  return false
}

export function useHasRole() {
  return false
}

export function useCanAccessAdmin() {
  return true // Allow access for now
}
