'use client'

/**
 * StreamErrorBoundary Component
 *
 * Specialized error boundary for streaming components.
 * Provides reconnection options for stream-related errors.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Wifi, WifiOff, RefreshCw, Play } from 'lucide-react'
import { Button } from '../shared'

// =============================================================================
// Types
// =============================================================================

interface StreamErrorBoundaryProps {
  children: ReactNode
  /** Called when reconnect is triggered */
  onReconnect?: () => void
  /** Called when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  /** Maximum reconnection attempts */
  maxReconnectAttempts?: number
}

interface StreamErrorBoundaryState {
  hasError: boolean
  error: Error | null
  reconnectAttempts: number
  isReconnecting: boolean
}

// =============================================================================
// Component
// =============================================================================

export class StreamErrorBoundary extends Component<StreamErrorBoundaryProps, StreamErrorBoundaryState> {
  private reconnectTimeout: NodeJS.Timeout | null = null

  constructor(props: StreamErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      reconnectAttempts: 0,
      isReconnecting: false,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<StreamErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (process.env.NODE_ENV === 'development') {
      console.error('StreamErrorBoundary caught an error:', error)
      console.error('Component stack:', errorInfo.componentStack)
    }

    this.props.onError?.(error, errorInfo)
  }

  componentWillUnmount(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }
  }

  handleReconnect = (): void => {
    const { maxReconnectAttempts = 3 } = this.props
    const { reconnectAttempts } = this.state

    if (reconnectAttempts >= maxReconnectAttempts) {
      return
    }

    this.setState({
      isReconnecting: true,
      reconnectAttempts: reconnectAttempts + 1,
    })

    // Simulate reconnection delay
    this.reconnectTimeout = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        isReconnecting: false,
      })
      this.props.onReconnect?.()
    }, 2000)
  }

  handleRefresh = (): void => {
    window.location.reload()
  }

  render(): ReactNode {
    const { hasError, error, reconnectAttempts, isReconnecting } = this.state
    const { children, maxReconnectAttempts = 3 } = this.props

    if (hasError) {
      const canReconnect = reconnectAttempts < maxReconnectAttempts

      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 p-6">
          <div className="bg-gray-800/80 backdrop-blur-md rounded-2xl p-8 max-w-lg w-full border border-gray-700/50 shadow-xl">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-orange-500/20 flex items-center justify-center">
                {isReconnecting ? (
                  <Wifi size={40} className="text-orange-500 animate-pulse" />
                ) : (
                  <WifiOff size={40} className="text-orange-500" />
                )}
              </div>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-white text-center mb-2">
              {isReconnecting ? 'Reconnecting...' : 'Stream Disconnected'}
            </h2>

            {/* Message */}
            <p className="text-gray-400 text-center mb-6">
              {isReconnecting
                ? 'Please wait while we restore your connection.'
                : 'The streaming connection was lost. This could be due to network issues.'}
            </p>

            {/* Reconnect attempts indicator */}
            {reconnectAttempts > 0 && (
              <div className="flex justify-center gap-2 mb-6">
                {Array.from({ length: maxReconnectAttempts }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full ${
                      i < reconnectAttempts
                        ? 'bg-orange-500'
                        : 'bg-gray-600'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Error details (development only) */}
            {process.env.NODE_ENV === 'development' && error && (
              <div className="bg-gray-900/50 rounded-lg p-3 mb-6 overflow-auto max-h-24">
                <p className="text-xs text-red-400 font-mono">
                  {error.message}
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-3">
              {canReconnect && (
                <Button
                  variant="primary"
                  onClick={this.handleReconnect}
                  leftIcon={isReconnecting ? undefined : <Play size={18} />}
                  isLoading={isReconnecting}
                  fullWidth
                  size="lg"
                >
                  {isReconnecting ? 'Reconnecting...' : 'Reconnect'}
                </Button>
              )}

              <Button
                variant="secondary"
                onClick={this.handleRefresh}
                leftIcon={<RefreshCw size={18} />}
                fullWidth
              >
                Refresh Page
              </Button>

              {!canReconnect && (
                <p className="text-sm text-gray-500 text-center mt-2">
                  Maximum reconnection attempts reached. Please refresh the page.
                </p>
              )}
            </div>
          </div>
        </div>
      )
    }

    return children
  }
}

export default StreamErrorBoundary
