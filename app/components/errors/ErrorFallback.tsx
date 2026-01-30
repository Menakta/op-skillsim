'use client'

/**
 * ErrorFallback Component
 *
 * User-friendly error display with recovery options.
 * Shows sanitized error messages in production, full details in development.
 */

import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '../shared'
import { getUserFriendlyError } from '@/app/lib/errorUtils'

const isDevelopment = process.env.NODE_ENV === 'development'

// =============================================================================
// Types
// =============================================================================

interface ErrorFallbackProps {
  /** The error that was caught */
  error?: Error | null
  /** Called when user clicks retry */
  onReset?: () => void
  /** Feature name for context */
  featureName?: string
  /** Show home button */
  showHomeButton?: boolean
  /** Custom title */
  title?: string
  /** Custom message */
  message?: string
}

// =============================================================================
// Component
// =============================================================================

export function ErrorFallback({
  error,
  onReset,
  featureName,
  showHomeButton = false,
  title = 'Something went wrong',
  message,
}: ErrorFallbackProps) {
  // Use provided message, or generate user-friendly message from error
  const displayMessage = message || (error
    ? getUserFriendlyError(error)
    : featureName
      ? `An error occurred in the ${featureName} feature.`
      : 'An unexpected error occurred. Please try again.')

  const handleRefresh = () => {
    window.location.reload()
  }

  const handleGoHome = () => {
    window.location.href = '/'
  }

  return (
    <div className="flex items-center justify-center min-h-[200px] p-6">
      <div className="bg-gray-900/80 backdrop-blur-md rounded-2xl p-6 max-w-md w-full border border-gray-700/50 shadow-xl">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertTriangle size={32} className="text-red-500" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold text-white text-center mb-2">
          {title}
        </h2>

        {/* Message */}
        <p className="text-gray-400 text-center mb-4">
          {displayMessage}
        </p>

        {/* Error details (development only) */}
        {isDevelopment && error && (
          <div className="bg-gray-800/50 rounded-lg p-3 mb-4 overflow-auto max-h-32">
            <p className="text-xs text-red-400 font-mono break-words">
              {error.message}
            </p>
            {error.stack && (
              <p className="text-[10px] text-gray-500 font-mono mt-2 break-words">
                {error.stack.split('\n').slice(0, 3).join('\n')}
              </p>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          {onReset && (
            <Button
              variant="primary"
              onClick={onReset}
              leftIcon={<RefreshCw size={18} />}
              fullWidth
            >
              Try Again
            </Button>
          )}

          {showHomeButton && (
            <Button
              variant="ghost"
              onClick={handleGoHome}
              leftIcon={<Home size={18} />}
              fullWidth
            >
              Go to Home
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ErrorFallback
