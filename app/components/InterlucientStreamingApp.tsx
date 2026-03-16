'use client'

/**
 * InterlucientStreamingApp - Parallel Implementation for Interlucent Pixel Streaming
 *
 * This component uses Interlucent for pixel streaming.
 * Simplified version without message passing hooks.
 */

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'

// Interlucent-specific imports
import { InterlucientStream } from '@/app/features/streaming/components/InterlucientStream'
import type { InterlucientStreamRef } from '@/app/features/streaming/components/InterlucientStream'
import { useInterlucientConnection } from '@/app/hooks/useInterlucientConnection'
import type { InterlucientStatus } from '@/app/types/interlucent.types'

// Shared imports
import {
  LoadingScreen,
  StarterScreen,
  type LoadingStep,
} from '../features'
import { useIdleDetection } from '../features/idle'
import { RETRY_CONFIG } from '../config'
import { useTheme } from '../context/ThemeContext'

// =============================================================================
// Configuration
// =============================================================================

const INTERLUCENT_APP_ID = process.env.NEXT_PUBLIC_INTERLUCENT_APP_ID
const INTERLUCENT_APP_VERSION = process.env.NEXT_PUBLIC_INTERLUCENT_APP_VERSION

// =============================================================================
// Helper Functions
// =============================================================================

interface LoadingStatusParams {
  interlucientStatus: InterlucientStatus | null
  connectionStatus: 'initializing' | 'connecting' | 'connected' | 'failed' | 'retrying'
  isTokenLoading: boolean
}

function getLoadingStatus(params: LoadingStatusParams): {
  message: string
  step: LoadingStep
} {
  const { interlucientStatus, connectionStatus, isTokenLoading } = params

  if (isTokenLoading) {
    return { message: 'Authenticating...', step: 'initializing' }
  }

  switch (interlucientStatus) {
    case 'idle':
      return { message: 'Ready to connect', step: 'initializing' }
    case 'connecting':
      return { message: 'Connecting to server', step: 'connecting' }
    case 'authenticating':
      return { message: 'Authenticating session', step: 'connecting' }
    case 'connected':
      return { message: 'Requesting GPU worker', step: 'launching' }
    case 'queued':
      return { message: 'Waiting for available GPU', step: 'launching' }
    case 'rendezvoused':
      return { message: 'GPU worker assigned', step: 'launching' }
    case 'negotiating':
      return { message: 'Establishing video stream', step: 'streaming' }
    case 'streaming':
      return { message: 'Stream active', step: 'streaming' }
    case 'ready':
      return { message: 'Click to resume stream', step: 'streaming' }
    case 'interrupted':
    case 'recovering':
      return { message: 'Reconnecting...', step: 'connecting' }
    case 'failed':
      return { message: 'Connection failed', step: 'initializing' }
    case 'ended':
      return { message: 'Session ended', step: 'initializing' }
    default:
      return { message: 'Loading...', step: 'initializing' }
  }
}

// =============================================================================
// Main Component
// =============================================================================

export default function InterlucientStreamingApp() {
  // =========================================================================
  // Refs
  // =========================================================================

  const streamRef = useRef<InterlucientStreamRef>(null)

  // =========================================================================
  // Theme
  // =========================================================================

  const { theme } = useTheme()
  const isDark = theme === 'dark'

  // =========================================================================
  // Screen Flow State
  // =========================================================================

  const [showStarterScreen, setShowStarterScreen] = useState(true)
  const [showLoadingScreen, setShowLoadingScreen] = useState(false)
  const [streamStarted, setStreamStarted] = useState(false)
  const [transportType, setTransportType] = useState<'relay' | 'direct' | null>(null)

  // =========================================================================
  // Interlucent Connection
  // =========================================================================

  const [connectionError, setConnectionError] = useState<string | null>(null)

  const connection = useInterlucientConnection({
    streamStarted,
    connectionConfig: {
      appId: INTERLUCENT_APP_ID,
      appVersion: INTERLUCENT_APP_VERSION,
      reconnectMode: 'recover',
      reconnectAttempts: 3,
      queueWaitTolerance: 45,
      swiftJobRequest: true,
    },
    onError: (error) => {
      console.error('❌ Connection error:', error)
      setConnectionError(error)
      setShowLoadingScreen(false)
    },
    onConnected: (isFirstConnection) => {
      console.log('✅ Connected!', isFirstConnection ? '(first)' : '(reconnect)')
      setShowLoadingScreen(false)
      setConnectionError(null)
    },
    onSessionEnd: (reason) => {
      console.log('🔌 Session ended:', reason)
    },
    onDataChannelOpen: () => {
      console.log('📡 Data channel open')
    },
  })

  // =========================================================================
  // Start Stream Handler
  // =========================================================================

  const handleStartStream = useCallback(async () => {
    console.log('🚀 Starting Interlucent stream')
    setShowStarterScreen(false)
    setShowLoadingScreen(true)
    setStreamStarted(true)
  }, [])

  // Track if we've already called play()
  const hasCalledPlayRef = useRef(false)

  // Call play() when token is ready
  useEffect(() => {
    const status = connection.interlucientStatus
    const shouldCallPlay =
      streamStarted &&
      connection.admissionToken &&
      connection.streamRef.current &&
      !hasCalledPlayRef.current &&
      (status === 'idle' || status === 'connected' || status === null)

    if (shouldCallPlay) {
      console.log('🎮 Calling play() after token ready')
      hasCalledPlayRef.current = true
      connection.play().catch((err) => {
        console.error('Play failed:', err)
        hasCalledPlayRef.current = false
      })
    }
  }, [streamStarted, connection.admissionToken, connection.interlucientStatus, connection])

  // Reset play flag when stream stops
  useEffect(() => {
    if (!streamStarted) {
      hasCalledPlayRef.current = false
    }
  }, [streamStarted])

  // =========================================================================
  // Loading Status
  // =========================================================================

  const loadingStatus = useMemo(() => getLoadingStatus({
    interlucientStatus: connection.interlucientStatus,
    connectionStatus: connection.connectionStatus,
    isTokenLoading: connection.isTokenLoading,
  }), [connection.interlucientStatus, connection.connectionStatus, connection.isTokenLoading])

  // =========================================================================
  // Idle Detection
  // =========================================================================

  const { isIdle, resetIdle } = useIdleDetection({
    idleTimeout: 5 * 60 * 1000,
    enabled: connection.isConnected,
  })

  // =========================================================================
  // Force dark background
  // =========================================================================

  const forcesDarkBg = showStarterScreen || showLoadingScreen

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div
      className={`h-screen w-screen relative overflow-hidden ${
        forcesDarkBg ? 'bg-[#1E1E1E]' : isDark ? 'bg-[#1E1E1E]' : 'bg-gray-100'
      }`}
    >
      {/* Interlucent Stream Component */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
      >
        <InterlucientStream
          ref={connection.streamRef}
          admissionToken={connection.admissionToken || undefined}
          controls={false}
          reconnectMode="recover"
          reconnectAttempts={-1}
          reconnectStrategy="exponential-backoff"
          queueWaitTolerance={120}
          webrtcNegotiationTolerance={30}
          swiftJobRequest={true}
          flexiblePresenceAllowance={300}
          rendezvousTolerance={60}
          lingerTolerance={60}
          forceRelay={false}
          onStatusChange={connection.handleStatusChange}
          onDataChannelOpen={connection.handleDataChannelOpen}
          onSessionEnded={connection.handleSessionEnded}
          onError={connection.handleError}
          onTransportSelected={(turnUsed) => {
            console.log(turnUsed ? '🔄 Transport: RELAY' : '🔗 Transport: DIRECT')
            setTransportType(turnUsed ? 'relay' : 'direct')
          }}
        />
      </div>

      {/* Starter Screen */}
      <StarterScreen
        isOpen={showStarterScreen}
        title="Interlucent Streaming"
        subtitle="Click the button below to begin"
        onStart={handleStartStream}
        buttonText="Start"
      />

      {/* Loading Screen */}
      <LoadingScreen
        isOpen={showLoadingScreen && !connection.isConnected}
        title="Please Wait!"
        subtitle="Session is loading"
        statusMessage={loadingStatus.message}
        currentStep={loadingStatus.step}
        retryCount={0}
        maxRetries={RETRY_CONFIG.maxRetries}
        showRetryInfo={false}
      />

      {/* Transport Type Indicator */}
      {connection.isConnected && transportType && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className={`px-4 py-2 rounded-lg text-white text-sm text-center ${
            transportType === 'relay' ? 'bg-orange-600/90' : 'bg-blue-600/90'
          }`}>
            {transportType === 'relay' ? '🔄 RELAY' : '🔗 DIRECT'}
          </div>
        </div>
      )}

      {/* Connection Error Modal */}
      {connectionError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-gray-900 border border-red-500 rounded-lg p-6 max-w-md mx-4">
            <h2 className="text-xl font-bold text-red-500 mb-4">Connection Failed</h2>
            <p className="text-gray-300 mb-4">{connectionError}</p>
            <div className="text-sm text-gray-400 mb-4">
              <p className="mb-2">This usually means:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>The admission token is invalid or expired</li>
                <li>Missing App ID configuration</li>
                <li>SDK access not yet available</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setConnectionError(null)
                  setShowStarterScreen(true)
                  setStreamStarted(false)
                }}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                Back
              </button>
              <button
                onClick={() => {
                  setConnectionError(null)
                  connection.reconnect()
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 left-4 z-50 p-4 bg-black/80 text-white text-xs font-mono rounded-lg max-w-xs">
          <div className="mb-2 font-bold text-green-400">Interlucent Debug</div>
          <div>Status: {connection.interlucientStatus || 'null'}</div>
          <div>Connected: {connection.isConnected ? '✅' : '❌'}</div>
          <div>Data Channel: {connection.isDataChannelOpen ? '✅' : '❌'}</div>
          <div>Token: {connection.admissionToken ? '✅' : '❌'}</div>
          <div>Session: {connection.sessionId || 'none'}</div>
          {connection.failureReason && (
            <div className="text-red-400 mt-2">Error: {connection.failureReason}</div>
          )}
        </div>
      )}
    </div>
  )
}
