/**
 * Session Service
 *
 * Handles session validation, login status, and user session management.
 */

// =============================================================================
// Types
// =============================================================================

export interface SessionInfo {
  isValid: boolean
  userId?: string
  role?: string
  expiresAt?: number
}

export interface LoginResult {
  success: boolean
  redirectUrl?: string
  error?: string
}

export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

// =============================================================================
// Session Service
// =============================================================================

export const sessionService = {
  /**
   * Validate current session
   */
  async validateSession(): Promise<ServiceResult<SessionInfo>> {
    try {
      const response = await fetch('/api/auth/validate', {
        method: 'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        return {
          success: false,
          error: 'Session validation failed',
        }
      }

      const data = await response.json()
      return {
        success: true,
        data: {
          isValid: data.valid,
          userId: data.userId,
          role: data.role,
          expiresAt: data.expiresAt,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: 'Network error: Failed to validate session',
      }
    }
  },

  /**
   * Request a new session (used for demo/test flows)
   */
  async requestSession(): Promise<ServiceResult<{ sessionId: string }>> {
    try {
      const response = await fetch('/api/auth/session-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }))
        return {
          success: false,
          error: error.error || 'Failed to request session',
        }
      }

      const data = await response.json()
      return { success: true, data: { sessionId: data.sessionId } }
    } catch (error) {
      return {
        success: false,
        error: 'Network error: Failed to request session',
      }
    }
  },

  /**
   * Logout and clear session
   */
  async logout(): Promise<ServiceResult<void>> {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        return {
          success: false,
          error: 'Logout failed',
        }
      }

      return { success: true, data: undefined }
    } catch (error) {
      return {
        success: false,
        error: 'Network error: Failed to logout',
      }
    }
  },

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<ServiceResult<LoginResult>> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Login failed' }))
        return {
          success: false,
          error: error.error || 'Login failed',
        }
      }

      const data = await response.json()
      return {
        success: true,
        data: {
          success: true,
          redirectUrl: data.redirectUrl,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: 'Network error: Failed to login',
      }
    }
  },
}

export default sessionService
