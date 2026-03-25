'use client'

/**
 * DebugPanel - Streaming Provider Debug Info
 *
 * Shows current streaming provider (PureWeb/Interlucent) and connection details.
 * Positioned on the right side of the screen, opposite the MessageLog on the left.
 */

import { useState, memo, useMemo } from 'react'
import { getStreamingProvider, type StreamingProvider } from '../config/streaming.config'

// Accent color (matching MessageLog)
const ACCENT = '#39BEAE'

// =============================================================================
// Types
// =============================================================================

export interface DebugPanelProps {
  /** Connection status */
  connectionStatus: 'disconnected' | 'connecting' | 'connected'

  /** Whether using relay (TURN) or direct P2P connection - only for Interlucent */
  isUsingRelay?: boolean | null

  /** Force relay setting - only for Interlucent */
  forceRelay?: boolean

  /** Interlucent status (raw status from pixel-stream) */
  interlucientStatus?: string | null

  /** Session ID */
  sessionId?: string | null

  /** Data channel open state */
  isDataChannelOpen?: boolean

  /** Theme */
  isDark?: boolean
}

// =============================================================================
// Component
// =============================================================================

function DebugPanelComponent({
  connectionStatus,
  isUsingRelay = null,
  forceRelay = false,
  interlucientStatus = null,
  sessionId = null,
  isDataChannelOpen = false,
  isDark = true,
}: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)

  // Get current provider
  const provider = useMemo(() => getStreamingProvider(), [])
  const isInterlucent = provider === 'interlucent'

  // Theme colors
  const colors = {
    bg: isDark ? 'bg-gray-900/95' : 'bg-white/95',
    bgSecondary: isDark ? 'bg-gray-800' : 'bg-gray-100',
    border: isDark ? 'border-gray-700' : 'border-gray-200',
    text: isDark ? 'text-white' : 'text-gray-900',
    textSecondary: isDark ? 'text-gray-400' : 'text-gray-600',
  }

  const getConnectionColor = () => {
    switch (connectionStatus) {
      case 'connected': return ACCENT
      case 'connecting': return '#eab308'
      default: return '#ef4444'
    }
  }

  const getProviderColor = () => {
    return isInterlucent ? '#8b5cf6' : '#3b82f6' // Purple for Interlucent, Blue for PureWeb
  }

  const getTransportLabel = (): string => {
    if (!isInterlucent) return 'N/A (PureWeb)'
    if (forceRelay) return 'Forced RELAY'
    if (isUsingRelay === null) return 'Detecting...'
    return isUsingRelay ? 'RELAY (TURN)' : 'DIRECT (P2P)'
  }

  const getTransportColor = (): string => {
    if (!isInterlucent) return colors.textSecondary
    if (forceRelay) return '#f59e0b' // Amber for forced
    if (isUsingRelay === null) return '#eab308' // Yellow for detecting
    return isUsingRelay ? '#f59e0b' : '#22c55e' // Amber for relay, Green for direct
  }

  // Minimized view - just a small indicator
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 ${colors.bg} backdrop-blur-sm ${colors.border} border rounded-xl hover:scale-105 transition-all shadow-lg`}
      >
        <div
          className={`w-2 h-2 rounded-full ${connectionStatus === 'connecting' ? 'animate-pulse' : ''}`}
          style={{ backgroundColor: getConnectionColor() }}
        />
        <span className={`${colors.text} text-sm font-medium`}>Debug</span>
        <span
          className="px-2 py-0.5 text-white text-xs rounded-full"
          style={{ backgroundColor: getProviderColor() }}
        >
          {isInterlucent ? 'IL' : 'PW'}
        </span>
      </button>
    )
  }

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 ${colors.bg} backdrop-blur-md ${colors.border} border rounded-xl shadow-2xl transition-all duration-300 ${
        isMinimized ? 'w-80 h-12' : 'w-[350px]'
      }`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-2 ${colors.border} border-b`}>
        <div className="flex items-center gap-3">
          <div
            className={`w-2 h-2 rounded-full ${connectionStatus === 'connecting' ? 'animate-pulse' : ''}`}
            style={{ backgroundColor: getConnectionColor() }}
          />
          <span className={`${colors.text} font-medium text-sm`}>Debug Panel</span>
          <span
            className="px-2 py-0.5 text-white text-xs rounded-full"
            style={{ backgroundColor: getProviderColor() }}
          >
            {isInterlucent ? 'Interlucent' : 'PureWeb'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className={`p-1.5 ${colors.textSecondary} hover:${colors.text} rounded transition-colors`}
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={isMinimized ? 'M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4' : 'M20 12H4'}
              />
            </svg>
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className={`p-1.5 ${colors.textSecondary} hover:${colors.text} rounded transition-colors`}
            title="Close"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="p-4 space-y-3">
          {/* Provider Info */}
          <div className={`p-3 ${colors.bgSecondary} rounded-lg`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-semibold uppercase ${colors.textSecondary}`}>
                Streaming Provider
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getProviderColor() }}
              />
              <span className={`${colors.text} font-mono text-sm font-medium`}>
                {isInterlucent ? 'Interlucent' : 'PureWeb'}
              </span>
            </div>
            <p className={`mt-1 text-xs ${colors.textSecondary}`}>
              {isInterlucent
                ? 'WebRTC pixel streaming via Interlucent SDK'
                : 'WebRTC pixel streaming via PureWeb SDK'}
            </p>
          </div>

          {/* Connection Status */}
          <div className={`p-3 ${colors.bgSecondary} rounded-lg`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-semibold uppercase ${colors.textSecondary}`}>
                Connection Status
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${connectionStatus === 'connecting' ? 'animate-pulse' : ''}`}
                style={{ backgroundColor: getConnectionColor() }}
              />
              <span className={`${colors.text} font-mono text-sm font-medium capitalize`}>
                {connectionStatus}
              </span>
            </div>
            {interlucientStatus && isInterlucent && (
              <p className={`mt-1 text-xs ${colors.textSecondary}`}>
                Raw status: <span className="text-cyan-400 font-mono">{interlucientStatus}</span>
              </p>
            )}
          </div>

          {/* Transport Type (Interlucent only) */}
          {isInterlucent && (
            <div className={`p-3 ${colors.bgSecondary} rounded-lg`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold uppercase ${colors.textSecondary}`}>
                  Transport Type
                </span>
                {forceRelay && (
                  <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] rounded font-medium">
                    FORCED
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getTransportColor() }}
                />
                <span
                  className="font-mono text-sm font-medium"
                  style={{ color: getTransportColor() }}
                >
                  {getTransportLabel()}
                </span>
              </div>
              <p className={`mt-1 text-xs ${colors.textSecondary}`}>
                {forceRelay
                  ? 'All traffic routed through TURN (port 443) to bypass DPI'
                  : isUsingRelay
                    ? 'Connection via TURN relay server'
                    : isUsingRelay === false
                      ? 'Direct peer-to-peer connection'
                      : 'Waiting for transport negotiation...'}
              </p>
            </div>
          )}

          {/* Data Channel */}
          <div className={`p-3 ${colors.bgSecondary} rounded-lg`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-semibold uppercase ${colors.textSecondary}`}>
                Data Channel
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: isDataChannelOpen ? '#22c55e' : '#ef4444' }}
              />
              <span
                className="font-mono text-sm font-medium"
                style={{ color: isDataChannelOpen ? '#22c55e' : '#ef4444' }}
              >
                {isDataChannelOpen ? 'Open' : 'Closed'}
              </span>
            </div>
            <p className={`mt-1 text-xs ${colors.textSecondary}`}>
              {isDataChannelOpen
                ? 'Ready to send/receive messages'
                : 'Waiting for WebRTC data channel...'}
            </p>
          </div>

          {/* Session ID */}
          {sessionId && (
            <div className={`p-3 ${colors.bgSecondary} rounded-lg`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold uppercase ${colors.textSecondary}`}>
                  Session ID
                </span>
              </div>
              <span className={`${colors.text} font-mono text-xs break-all`}>
                {sessionId}
              </span>
            </div>
          )}

          {/* Footer */}
          <div className={`pt-2 border-t ${colors.border}`}>
            <p className={`text-[10px] ${colors.textSecondary} text-center`}>
              Use <span className="font-mono text-cyan-400">streamingConfig</span> in console to switch providers
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default memo(DebugPanelComponent)
