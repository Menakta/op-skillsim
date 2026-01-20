/**
 * Session Complete Redirect Utility
 *
 * Builds URLs for redirecting to the session-complete page
 * with appropriate query parameters.
 */

// =============================================================================
// Types
// =============================================================================

export type SessionEndReason = 'completed' | 'expired' | 'idle' | 'quit' | 'logged_out' | 'other'
export type UserRole = 'student' | 'teacher' | 'admin'

export interface SessionCompleteParams {
  reason: SessionEndReason
  role?: UserRole
  progress?: number
  phasesCompleted?: number
  totalPhases?: number
  returnUrl?: string | null
  isLti?: boolean
}

// =============================================================================
// URL Builder
// =============================================================================

/**
 * Build the URL for the session-complete page
 */
export function buildSessionCompleteUrl(params: SessionCompleteParams): string {
  const url = new URL('/session-complete', window.location.origin)

  // Required param
  url.searchParams.set('reason', params.reason)

  // Optional params
  if (params.role) {
    url.searchParams.set('role', params.role)
  }

  if (params.progress !== undefined && params.progress > 0) {
    url.searchParams.set('progress', String(Math.round(params.progress)))
  }

  if (params.phasesCompleted !== undefined && params.phasesCompleted > 0) {
    url.searchParams.set('phases', String(params.phasesCompleted))
  }

  if (params.totalPhases !== undefined) {
    url.searchParams.set('total', String(params.totalPhases))
  }

  if (params.returnUrl) {
    url.searchParams.set('returnUrl', encodeURIComponent(params.returnUrl))
  }

  if (params.isLti !== undefined) {
    url.searchParams.set('isLti', String(params.isLti))
  }

  return url.toString()
}

/**
 * Redirect to the session-complete page
 */
export function redirectToSessionComplete(params: SessionCompleteParams): void {
  const url = buildSessionCompleteUrl(params)
  window.location.href = url
}
