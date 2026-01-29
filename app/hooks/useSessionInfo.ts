'use client'

/**
 * Session Info Hook
 *
 * Manages user session information:
 * - Fetches session info on mount (LTI status, role, expiry)
 * - Tracks session expiry and triggers warning
 * - Provides session-related state
 */

import { useState, useEffect, useMemo } from 'react'

// =============================================================================
// Types
// =============================================================================

export type UserRole = 'student' | 'teacher' | 'admin'

export interface SessionInfo {
  isLtiSession: boolean
  isTestUser: boolean
  userRole: UserRole
  sessionExpiresAt: number | null
  sessionReturnUrl: string | null
}

export interface UseSessionInfoConfig {
  onSessionExpiring?: () => void
}

export interface UseSessionInfoReturn extends SessionInfo {
  // Session start time (for tracking duration)
  sessionStartTime: number
}

// =============================================================================
// Constants
// =============================================================================

const SESSION_WARNING_THRESHOLD = 5 * 60 * 1000 // 5 minutes in milliseconds

// =============================================================================
// Hook Implementation
// =============================================================================

export function useSessionInfo(config?: UseSessionInfoConfig): UseSessionInfoReturn {
  const { onSessionExpiring } = config || {}

  // Session tracking state
  const [isTestUser, setIsTestUser] = useState(false)
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null)
  const [sessionReturnUrl, setSessionReturnUrl] = useState<string | null>(null)
  const [isLtiSession, setIsLtiSession] = useState(true)
  const [userRole, setUserRole] = useState<UserRole>('student')

  // Session start time (constant for this session)
  const [sessionStartTime] = useState<number>(() => Date.now())

  // ==========================================================================
  // Fetch session info on mount
  // ==========================================================================

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/session')
        if (response.ok) {
          const data = await response.json()
          if (data.session) {
            // Test user = isLti is false (coming from direct login, not LTI)
            const isLti = data.session.isLti !== false
            setIsLtiSession(isLti)
            setIsTestUser(!isLti)

            // Store user role
            if (data.session.role) {
              setUserRole(data.session.role)
            }

            // Store session expiry info
            if (data.session.expiresAt) {
              setSessionExpiresAt(data.session.expiresAt)
            }
            if (data.session.returnUrl) {
              setSessionReturnUrl(data.session.returnUrl)
            }
          }
        }
      } catch (err) {
        console.log('Failed to check session:', err)
      }
    }
    checkSession()
  }, [])

  // ==========================================================================
  // Track session expiry and trigger warning
  // ==========================================================================

  useEffect(() => {
    if (!sessionExpiresAt || !onSessionExpiring) return

    const checkExpiry = () => {
      const now = Date.now()
      const timeRemaining = sessionExpiresAt - now

      // Trigger warning when 5 minutes or less remain
      if (timeRemaining <= SESSION_WARNING_THRESHOLD && timeRemaining > 0) {
        onSessionExpiring()
      }
    }

    // Check immediately
    checkExpiry()

    // Check every 30 seconds
    const interval = setInterval(checkExpiry, 30000)

    return () => clearInterval(interval)
  }, [sessionExpiresAt, onSessionExpiring])

  // ==========================================================================
  // Return
  // ==========================================================================

  return useMemo(() => ({
    isLtiSession,
    isTestUser,
    userRole,
    sessionExpiresAt,
    sessionReturnUrl,
    sessionStartTime,
  }), [
    isLtiSession,
    isTestUser,
    userRole,
    sessionExpiresAt,
    sessionReturnUrl,
    sessionStartTime,
  ])
}

export default useSessionInfo
