/**
 * Error Utilities
 *
 * Provides safe error handling for production environments.
 * - Sanitizes error messages to prevent leaking sensitive information
 * - Maps technical errors to user-friendly messages
 * - Preserves full error details in development mode
 */

// =============================================================================
// Configuration
// =============================================================================

const isDevelopment = process.env.NODE_ENV === 'development'

// =============================================================================
// Error Type Detection
// =============================================================================

interface ErrorCategory {
  pattern: RegExp | string
  userMessage: string
}

/**
 * Map of error patterns to user-friendly messages
 * Add new patterns as needed for common error scenarios
 */
const ERROR_CATEGORIES: ErrorCategory[] = [
  // Network/Connection errors
  { pattern: /network|fetch|ECONNREFUSED|ETIMEDOUT|socket/i, userMessage: 'Network connection error. Please check your internet connection and try again.' },
  { pattern: /timeout|timed out/i, userMessage: 'Request timed out. Please try again.' },
  { pattern: /CORS|cross-origin/i, userMessage: 'Connection blocked. Please try again or contact support.' },

  // Authentication errors
  { pattern: /unauthorized|401|authentication|auth/i, userMessage: 'Session expired. Please log in again.' },
  { pattern: /forbidden|403|permission/i, userMessage: 'You don\'t have permission to perform this action.' },

  // Stream/WebRTC errors
  { pattern: /stream|webrtc|ice|signaling|peer/i, userMessage: 'Stream connection error. Please try reconnecting.' },
  { pattern: /media|video|audio|codec/i, userMessage: 'Media playback error. Please refresh and try again.' },

  // Server errors
  { pattern: /500|internal server|server error/i, userMessage: 'Server error. Our team has been notified. Please try again later.' },
  { pattern: /502|bad gateway/i, userMessage: 'Service temporarily unavailable. Please try again in a moment.' },
  { pattern: /503|service unavailable/i, userMessage: 'Service is currently unavailable. Please try again later.' },
  { pattern: /504|gateway timeout/i, userMessage: 'Server is taking too long to respond. Please try again.' },

  // Database errors (should never leak to users in production)
  { pattern: /database|supabase|postgres|sql|query/i, userMessage: 'An error occurred while saving your data. Please try again.' },

  // Resource errors
  { pattern: /not found|404/i, userMessage: 'The requested resource was not found.' },
  { pattern: /rate limit|too many requests|429/i, userMessage: 'Too many requests. Please wait a moment and try again.' },

  // Generic browser/runtime errors
  { pattern: /undefined|null|TypeError|ReferenceError/i, userMessage: 'An unexpected error occurred. Please refresh the page.' },
]

// =============================================================================
// Error Sanitization
// =============================================================================

/**
 * Get a user-friendly error message
 *
 * In development: Returns the original error message for debugging
 * In production: Returns a sanitized, user-friendly message
 *
 * @param error - The error to sanitize (string, Error, or unknown)
 * @param fallbackMessage - Optional custom fallback message
 * @returns User-friendly error message
 */
export function getUserFriendlyError(
  error: unknown,
  fallbackMessage = 'An unexpected error occurred. Please try again.'
): string {
  // Get error message string
  const errorMessage = getErrorMessage(error)

  // In development, show the real error
  if (isDevelopment) {
    return errorMessage
  }

  // In production, map to user-friendly message
  for (const category of ERROR_CATEGORIES) {
    const pattern = typeof category.pattern === 'string'
      ? new RegExp(category.pattern, 'i')
      : category.pattern

    if (pattern.test(errorMessage)) {
      return category.userMessage
    }
  }

  // Default fallback
  return fallbackMessage
}

/**
 * Extract error message from any error type
 */
export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error
  }

  if (error instanceof Error) {
    return error.message
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }

  return String(error)
}

/**
 * Create a safe error for logging and display
 *
 * Returns an object with both the original error (for logging)
 * and a user-friendly message (for display)
 */
export function createSafeError(error: unknown, context?: string): {
  original: string
  userMessage: string
  context?: string
} {
  const original = getErrorMessage(error)
  const userMessage = getUserFriendlyError(error)

  return {
    original,
    userMessage,
    context,
  }
}

// =============================================================================
// Stream-specific Error Helpers
// =============================================================================

/**
 * Get user-friendly message for stream connection errors
 */
export function getStreamErrorMessage(error: unknown): string {
  return getUserFriendlyError(
    error,
    'Unable to connect to the stream. Please check your connection and try again.'
  )
}

/**
 * Get user-friendly message for API errors
 */
export function getApiErrorMessage(error: unknown): string {
  return getUserFriendlyError(
    error,
    'Failed to communicate with the server. Please try again.'
  )
}

// =============================================================================
// Development Helpers
// =============================================================================

/**
 * Log error details (full details in dev, sanitized in prod)
 */
export function logError(error: unknown, context?: string): void {
  const safeError = createSafeError(error, context)

  if (isDevelopment) {
    console.error(`[${context || 'Error'}]`, safeError.original)
  } else {
    // In production, only log sanitized info
    console.error(`[${context || 'Error'}]`, safeError.userMessage)
  }
}

export default {
  getUserFriendlyError,
  getErrorMessage,
  createSafeError,
  getStreamErrorMessage,
  getApiErrorMessage,
  logError,
}
