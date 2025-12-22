'use client'

/**
 * ErrorBoundary Component
 *
 * Catches JavaScript errors in child component tree and displays fallback UI.
 * Prevents the entire app from crashing due to component errors.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { ErrorFallback } from './ErrorFallback'

// =============================================================================
// Types
// =============================================================================

interface ErrorBoundaryProps {
  children: ReactNode
  /** Custom fallback component */
  fallback?: ReactNode
  /** Called when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  /** Called when reset is triggered */
  onReset?: () => void
  /** Feature name for error reporting */
  featureName?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

// =============================================================================
// Component
// =============================================================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error)
      console.error('Component stack:', errorInfo.componentStack)
    }

    // Update state with error info
    this.setState({ errorInfo })

    // Call optional error handler
    this.props.onError?.(error, errorInfo)
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
    this.props.onReset?.()
  }

  render(): ReactNode {
    const { hasError, error } = this.state
    const { children, fallback, featureName } = this.props

    if (hasError) {
      // Custom fallback provided
      if (fallback) {
        return fallback
      }

      // Default fallback
      return (
        <ErrorFallback
          error={error}
          onReset={this.handleReset}
          featureName={featureName}
        />
      )
    }

    return children
  }
}

export default ErrorBoundary
