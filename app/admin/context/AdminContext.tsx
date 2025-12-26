'use client'

/**
 * Admin Context
 *
 * Provides admin session state across all admin pages.
 * Used to determine if user has full access (LTI) or read-only (demo) mode.
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

// =============================================================================
// Types
// =============================================================================

interface AdminContextType {
  isLti: boolean      // true = full access (LTI), false = read-only (demo)
  isLoading: boolean  // true while fetching session
  userRole: 'teacher' | 'admin' | null
}

const AdminContext = createContext<AdminContextType>({
  isLti: true,
  isLoading: true,
  userRole: null,
})

// =============================================================================
// Provider
// =============================================================================

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isLti, setIsLti] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [userRole, setUserRole] = useState<'teacher' | 'admin' | null>(null)

  useEffect(() => {
    async function fetchSession() {
      try {
        // First check localStorage for quick initial state
        const storedIsLti = localStorage.getItem('isLti')
        if (storedIsLti !== null) {
          setIsLti(storedIsLti === 'true')
        }

        // Then fetch from API for authoritative state
        const response = await fetch('/api/auth/session')
        const data = await response.json()

        if (data.session) {
          const sessionIsLti = data.session.isLti ?? true
          setIsLti(sessionIsLti)
          setUserRole(data.session.role)

          // Update localStorage
          localStorage.setItem('isLti', sessionIsLti.toString())
        }
      } catch (error) {
        console.error('Failed to fetch admin session:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSession()
  }, [])

  return (
    <AdminContext.Provider value={{ isLti, isLoading, userRole }}>
      {children}
    </AdminContext.Provider>
  )
}

// =============================================================================
// Hook
// =============================================================================

export function useAdmin() {
  const context = useContext(AdminContext)
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider')
  }
  return context
}

// =============================================================================
// Helper Components
// =============================================================================

/**
 * Wrapper that only renders children if user has LTI access
 * Shows optional fallback for demo users
 */
export function RequireLtiAccess({
  children,
  fallback,
}: {
  children: ReactNode
  fallback?: ReactNode
}) {
  const { isLti, isLoading } = useAdmin()

  if (isLoading) {
    return null
  }

  if (!isLti) {
    return fallback ?? null
  }

  return <>{children}</>
}

/**
 * Read-only notice banner for demo users
 */
export function DemoModeNotice() {
  const { isLti, isLoading } = useAdmin()

  if (isLoading || isLti) {
    return null
  }

  return (
    <div className="mb-4 p-3 rounded-lg border theme-bg-warning theme-border-warning">
      <p className="text-sm theme-text-warning">
        <strong>Demo Mode:</strong> You are viewing in read-only mode.
        Changes cannot be saved. For full access, please use your LMS.
      </p>
    </div>
  )
}
