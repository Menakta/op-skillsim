'use client'

/**
 * ErrorFallback Component
 *
 * User-friendly error display with recovery options.
 */

import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '../shared'

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
  const displayMessage = message || (featureName
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
        {process.env.NODE_ENV === 'development' && error && (
          <div className="bg-gray-800/50 rounded-lg p-3 mb-4 overflow-auto max-h-32">
            <p className="text-xs text-red-400 font-mono">
              {error.message}
            </p>
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

          <Button
            variant="secondary"
            onClick={handleRefresh}
            leftIcon={<RefreshCw size={18} />}
            fullWidth
          >
            Refresh Page
          </Button>

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
