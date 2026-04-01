'use client'

/**
 * Interlucent Connection Hook
 *
 * Parallel to useStreamConnection.ts but for Interlucent pixel streaming.
 * Manages:
 * - Token fetching from backend
 * - Connection lifecycle
 * - Status tracking
 * - Reconnection (built into Interlucent)
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import type {
  InterlucientStatus,
  InterlucientConnectionConfig,
} from '@/app/types/interlucent.types'
import type { InterlucientStreamRef } from '@/app/features/streaming/components/InterlucientStream'

// =============================================================================
// Types
// =============================================================================

/** Maps Interlucent status to simplified connection status */
export type ConnectionStatus = 'initializing' | 'connecting' | 'connected' | 'failed' | 'retrying'

export interface UseInterlucientConnectionConfig {
  /** Whether user has started the stream */
  streamStarted: boolean

  /** Connection configuration */
  connectionConfig?: InterlucientConnectionConfig

  /** Error callback */
  onError?: (error: string) => void

  /** Connected callback */
  onConnected?: (isFirstConnection: boolean) => void

  /** Session end callback */
  onSessionEnd?: (reason: 'expired' | 'logged_out' | 'inactive' | 'kicked' | 'disconnected' | 'other') => void

  /** Data channel open callback */
  onDataChannelOpen?: () => void
}

export interface UseInterlucientConnectionReturn {
  // Connection state
  connectionStatus: ConnectionStatus
  interlucientStatus: InterlucientStatus | null
  isConnected: boolean
  isRetrying: boolean
  isDataChannelOpen: boolean

  // Token state
  admissionToken: string | null
  tokenError: string | null
  isTokenLoading: boolean

  // Session info
  sessionId: string | null
  failureReason: string | null

  // Transport info
  isUsingRelay: boolean | null

  // Stream ref (to be attached to InterlucientStream component)
  streamRef: React.RefObject<InterlucientStreamRef | null>

  // Actions
  fetchToken: () => Promise<void>
  play: () => Promise<void>
  stop: (reason?: string) => void
  reconnect: () => Promise<void>

  // Event handlers (to be passed to InterlucientStream)
  handleStatusChange: (newStatus: InterlucientStatus, oldStatus: InterlucientStatus) => void
  handleDataChannelOpen: () => void
  handleSessionEnded: (reason: string) => void
  handleError: (error: string) => void
  handleTransportSelected: (turnUsed: boolean) => void
}

// =============================================================================
// Status Mapping
// =============================================================================

/**
 * Maps Interlucent status to simplified connection status
 */
function mapToConnectionStatus(status: InterlucientStatus | null): ConnectionStatus {
  if (!status) return 'initializing'

  switch (status) {
    case 'idle':
      return 'initializing'
    case 'connecting':
    case 'authenticating':
    case 'connected':
    case 'queued':
    case 'rendezvoused':
    case 'negotiating':
      return 'connecting'
    case 'streaming':
    case 'ready':
      return 'connected'
    case 'interrupted':
    case 'recovering':
      return 'retrying'
    case 'failed':
    case 'ended':
      return 'failed'
    default:
      return 'initializing'
  }
}

/**
 * Maps Interlucent session end reason to our reason types
 */
function mapSessionEndReason(reason: string): 'expired' | 'logged_out' | 'inactive' | 'kicked' | 'disconnected' | 'other' {
  const lowerReason = reason.toLowerCase()

  if (lowerReason.includes('expire')) return 'expired'
  if (lowerReason.includes('logout') || lowerReason.includes('logged_out')) return 'logged_out'
  if (lowerReason.includes('idle') || lowerReason.includes('inactive')) return 'inactive'
  if (lowerReason.includes('kick') || lowerReason.includes('withdraw')) return 'kicked'
  // Connection issues should be treated as disconnected, not logged_out
  if (lowerReason.includes('disconnect') || lowerReason.includes('connection') || lowerReason.includes('network')) return 'disconnected'

  // Default to disconnected for unknown reasons (better UX than "other")
  return 'disconnected'
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useInterlucientConnection(
  config: UseInterlucientConnectionConfig
): UseInterlucientConnectionReturn {
  const {
    streamStarted,
    connectionConfig = {},
    onError,
    onConnected,
    onSessionEnd,
    onDataChannelOpen,
  } = config

  // =========================================================================
  // State
  // =========================================================================

  const [interlucientStatus, setInterlucientStatus] = useState<InterlucientStatus | null>(null)
  const [isDataChannelOpen, setIsDataChannelOpen] = useState(false)
  const [admissionToken, setAdmissionToken] = useState<string | null>(null)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [isTokenLoading, setIsTokenLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [failureReason, setFailureReason] = useState<string | null>(null)
  const [isUsingRelay, setIsUsingRelay] = useState<boolean | null>(null)

  // =========================================================================
  // Refs
  // =========================================================================

  const streamRef = useRef<InterlucientStreamRef>(null)
  const wasConnectedRef = useRef(false)
  const tokenFetchedRef = useRef(false)
  const disconnectRetryCountRef = useRef(0)
  const MAX_DISCONNECT_RETRIES = 2 // Try to reconnect up to 2 times before ending session

  // =========================================================================
  // Derived State
  // =========================================================================

  const connectionStatus = useMemo(
    () => mapToConnectionStatus(interlucientStatus),
    [interlucientStatus]
  )

  const isConnected = interlucientStatus === 'streaming'
  const isRetrying = interlucientStatus === 'recovering' || interlucientStatus === 'interrupted'

  // =========================================================================
  // Token Fetching
  // =========================================================================

  const fetchToken = useCallback(async () => {
    if (isTokenLoading) return

    setIsTokenLoading(true)
    setTokenError(null)

    try {
      console.log('🔑 Fetching Interlucent admission token...')

      const response = await fetch('/api/stream/interlucent-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Pass any config needed for token generation
          appId: connectionConfig.appId,
          appVersion: connectionConfig.appVersion,
          queueWaitTolerance: connectionConfig.queueWaitTolerance,
          swiftJobRequest: connectionConfig.swiftJobRequest,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Token request failed: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ Admission token received')
      setAdmissionToken(data.token)
      tokenFetchedRef.current = true

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch token'
      console.error('❌ Token fetch error:', errorMessage)
      setTokenError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsTokenLoading(false)
    }
  }, [connectionConfig, isTokenLoading, onError])

  // =========================================================================
  // Auto-fetch token when stream starts
  // =========================================================================

  useEffect(() => {
    if (streamStarted && !tokenFetchedRef.current && !isTokenLoading) {
      fetchToken()
    }
  }, [streamStarted, fetchToken, isTokenLoading])

  // =========================================================================
  // Play/Stop Actions
  // =========================================================================

  const play = useCallback(async () => {
    if (!streamRef.current) {
      console.warn('Cannot play: stream ref not available')
      return
    }

    try {
      await streamRef.current.play()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start stream'
      console.error('❌ Play error:', errorMessage)
      onError?.(errorMessage)
    }
  }, [onError])

  const stop = useCallback((reason?: string) => {
    streamRef.current?.stop(reason)
  }, [])

  const reconnect = useCallback(async () => {
    console.log('🔄 Manual reconnection requested')

    // Reset state
    setFailureReason(null)
    tokenFetchedRef.current = false

    // Fetch new token
    await fetchToken()

    // Play will be triggered automatically when token is set
  }, [fetchToken])

  // Ref to reconnect for use in handleSessionEnded
  const reconnectRef = useRef(reconnect)
  reconnectRef.current = reconnect

  // =========================================================================
  // Event Handlers (to be passed to InterlucientStream)
  // =========================================================================

  const handleStatusChange = useCallback(
    (newStatus: InterlucientStatus, oldStatus: InterlucientStatus) => {
      console.log(`📡 Interlucent status: ${oldStatus} → ${newStatus}`)
      setInterlucientStatus(newStatus)

      // Handle connected state
      if (newStatus === 'streaming') {
        const isFirstConnection = !wasConnectedRef.current
        wasConnectedRef.current = true
        disconnectRetryCountRef.current = 0 // Reset disconnect retry counter on successful connection
        onConnected?.(isFirstConnection)

        // Get session ID from stream ref
        const sid = streamRef.current?.getSessionId()
        if (sid) setSessionId(sid)
      }

      // Handle failure
      if (newStatus === 'failed') {
        const reason = streamRef.current?.getElement()?.failureReason || null
        setFailureReason(reason)
      }
    },
    [onConnected]
  )

  const handleDataChannelOpen = useCallback(() => {
    console.log('📡 Data channel open')
    setIsDataChannelOpen(true)
    onDataChannelOpen?.()
  }, [onDataChannelOpen])

  const handleSessionEnded = useCallback(
    (reason: string) => {
      console.log('🔌 Session ended:', reason)
      setIsDataChannelOpen(false)

      const mappedReason = mapSessionEndReason(reason)

      // For kicked/withdrawn status, don't retry - end session immediately
      if (mappedReason === 'kicked') {
        console.log('👢 User was kicked/withdrawn - ending session')
        disconnectRetryCountRef.current = 0
        onSessionEnd?.(mappedReason)
        return
      }

      // For disconnection types, attempt automatic reconnection first
      // This fixes P0-01: Temporary network issues shouldn't end the session
      if (mappedReason === 'disconnected' && disconnectRetryCountRef.current < MAX_DISCONNECT_RETRIES) {
        disconnectRetryCountRef.current += 1
        console.log(`🔄 Attempting automatic reconnection (${disconnectRetryCountRef.current}/${MAX_DISCONNECT_RETRIES})...`)

        // Small delay before reconnection attempt
        setTimeout(() => {
          reconnectRef.current()
        }, 2000) // 2 second delay before retry
        return
      }

      // Max retries exceeded or non-recoverable reason - end session
      if (disconnectRetryCountRef.current >= MAX_DISCONNECT_RETRIES) {
        console.log('❌ Max reconnection attempts exceeded - ending session')
      }
      disconnectRetryCountRef.current = 0 // Reset for next time
      onSessionEnd?.(mappedReason)
    },
    [onSessionEnd]
  )

  const handleError = useCallback(
    (error: string) => {
      console.error('❌ Stream error:', error)
      setFailureReason(error)
      onError?.(error)
    },
    [onError]
  )

  const handleTransportSelected = useCallback(
    (turnUsed: boolean) => {
      console.log(`🔗 Transport selected: ${turnUsed ? 'RELAY (TURN)' : 'DIRECT (P2P)'}`)
      setIsUsingRelay(turnUsed)
    },
    []
  )

  // =========================================================================
  // Note: play() is called from InterlucientStreamingApp.tsx after token is set
  // We don't auto-play here to avoid duplicate calls and to ensure it's triggered
  // from user gesture context for browser autoplay policy
  // =========================================================================

  // =========================================================================
  // Return
  // =========================================================================

  return useMemo(() => ({
    // Connection state
    connectionStatus,
    interlucientStatus,
    isConnected,
    isRetrying,
    isDataChannelOpen,

    // Token state
    admissionToken,
    tokenError,
    isTokenLoading,

    // Session info
    sessionId,
    failureReason,

    // Transport info
    isUsingRelay,

    // Stream ref
    streamRef,

    // Actions
    fetchToken,
    play,
    stop,
    reconnect,

    // Event handlers
    handleStatusChange,
    handleDataChannelOpen,
    handleSessionEnded,
    handleError,
    handleTransportSelected,
  }), [
    connectionStatus,
    interlucientStatus,
    isConnected,
    isRetrying,
    isDataChannelOpen,
    admissionToken,
    tokenError,
    isTokenLoading,
    sessionId,
    failureReason,
    isUsingRelay,
    fetchToken,
    play,
    stop,
    reconnect,
    handleStatusChange,
    handleDataChannelOpen,
    handleSessionEnded,
    handleError,
    handleTransportSelected,
  ])
}

export default useInterlucientConnection
