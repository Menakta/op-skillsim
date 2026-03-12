'use client'

/**
 * InterlucientStream - React Wrapper for <pixel-stream> Web Component
 *
 * This component wraps the Interlucent pixel-stream web component for use in React.
 * It handles:
 * - Loading the CDN script
 * - Managing the component lifecycle
 * - Exposing events as React callbacks
 * - TypeScript type safety
 *
 * CDN: https://cdn.interlucent.ai/dev/pixel-stream/0.0.66/pixel-stream.iife.min.js
 */

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react'
import Script from 'next/script'
import type {
  PixelStreamElement,
  InterlucientStatus,
  ReconnectMode,
  ReconnectStrategy,
  StatusChangeDetail,
} from '@/app/types/interlucent.types'

// =============================================================================
// Constants
// =============================================================================

const CDN_URL = 'https://cdn.interlucent.ai/dev/pixel-stream/0.0.66/pixel-stream.iife.min.js'

// =============================================================================
// Props Interface
// =============================================================================

export interface InterlucientStreamProps {
  /** Admission token from backend */
  admissionToken?: string

  /** Show built-in controls overlay */
  controls?: boolean

  /** API endpoint (defaults to api.interlucent.ai) */
  apiEndpoint?: string

  /** Application ID */
  appId?: string

  /** Application version */
  appVersion?: string

  /** Reconnection mode */
  reconnectMode?: ReconnectMode

  /** Number of reconnection attempts (-1 = unlimited) */
  reconnectAttempts?: number

  /** Reconnection strategy */
  reconnectStrategy?: ReconnectStrategy

  /** Queue wait tolerance in seconds */
  queueWaitTolerance?: number

  /** WebRTC negotiation tolerance in seconds */
  webrtcNegotiationTolerance?: number

  /** Enable swift job request for faster startup */
  swiftJobRequest?: boolean

  /** Force TURN relay mode */
  forceTurn?: boolean

  /** Flexible presence allowance in seconds */
  flexiblePresenceAllowance?: number

  /** Linger tolerance in seconds */
  lingerTolerance?: number

  /** Rendezvous tolerance in seconds */
  rendezvousTolerance?: number

  // =========================================================================
  // Event Callbacks
  // =========================================================================

  /** Called when status changes */
  onStatusChange?: (newStatus: InterlucientStatus, oldStatus: InterlucientStatus) => void

  /** Called when data channel opens (ready to send messages) */
  onDataChannelOpen?: () => void

  /** Called when a message is received from UE5 */
  onMessage?: (data: unknown) => void

  /** Called when session is ready */
  onSessionReady?: (sessionId: string, agentId: string) => void

  /** Called when session ends */
  onSessionEnded?: (reason: string) => void

  /** Called when stream starts playing */
  onStreamStart?: () => void

  /** Called when connection fails */
  onError?: (error: string) => void

  // =========================================================================
  // Styling
  // =========================================================================

  /** Additional class names */
  className?: string

  /** Inline styles */
  style?: React.CSSProperties

  /** Children (for custom overlay) */
  children?: React.ReactNode
}

// =============================================================================
// Ref Interface (exposed methods)
// =============================================================================

export interface InterlucientStreamRef {
  /** Start or resume streaming */
  play: () => Promise<void>

  /** Cancel pending connection */
  cancel: () => void

  /** Stop the session */
  stop: (reason?: string) => void

  /** Send UI interaction to UE5 (JSON format) */
  sendUIInteraction: (payload: Record<string, unknown>) => void

  /** Send command to UE5 (UE 5.4+) */
  sendCommand: (command: Record<string, unknown>) => void

  /** Send message in string format (backward compatible with PureWeb) */
  sendStringMessage: (message: string) => void

  /** Get current status */
  getStatus: () => InterlucientStatus | null

  /** Get session ID */
  getSessionId: () => string | null

  /** Check if data channel is open */
  isDataChannelOpen: () => boolean

  /** Get the raw pixel-stream element */
  getElement: () => PixelStreamElement | null
}

// =============================================================================
// Component Implementation
// =============================================================================

export const InterlucientStream = forwardRef<InterlucientStreamRef, InterlucientStreamProps>(
  function InterlucientStream(props, ref) {
    const {
      admissionToken,
      controls = false,
      apiEndpoint,
      appId,
      appVersion,
      reconnectMode = 'recover',
      reconnectAttempts = 3,
      reconnectStrategy = 'exponential-backoff',
      queueWaitTolerance = 45,
      webrtcNegotiationTolerance = 10,
      swiftJobRequest = true,
      forceTurn = false,
      flexiblePresenceAllowance = 120,
      lingerTolerance,
      rendezvousTolerance,
      onStatusChange,
      onDataChannelOpen,
      onMessage,
      onSessionReady,
      onSessionEnded,
      onStreamStart,
      onError,
      className = '',
      style,
      children,
    } = props

    // =========================================================================
    // State
    // =========================================================================

    const [scriptLoaded, setScriptLoaded] = useState(false)
    const [scriptError, setScriptError] = useState<string | null>(null)
    const [dataChannelOpen, setDataChannelOpen] = useState(false)

    // =========================================================================
    // Refs
    // =========================================================================

    const elementRef = useRef<PixelStreamElement | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    // Store callbacks in refs to avoid re-attaching listeners
    const onStatusChangeRef = useRef(onStatusChange)
    const onDataChannelOpenRef = useRef(onDataChannelOpen)
    const onMessageRef = useRef(onMessage)
    const onSessionReadyRef = useRef(onSessionReady)
    const onSessionEndedRef = useRef(onSessionEnded)
    const onStreamStartRef = useRef(onStreamStart)
    const onErrorRef = useRef(onError)

    // Update refs when callbacks change
    useEffect(() => { onStatusChangeRef.current = onStatusChange }, [onStatusChange])
    useEffect(() => { onDataChannelOpenRef.current = onDataChannelOpen }, [onDataChannelOpen])
    useEffect(() => { onMessageRef.current = onMessage }, [onMessage])
    useEffect(() => { onSessionReadyRef.current = onSessionReady }, [onSessionReady])
    useEffect(() => { onSessionEndedRef.current = onSessionEnded }, [onSessionEnded])
    useEffect(() => { onStreamStartRef.current = onStreamStart }, [onStreamStart])
    useEffect(() => { onErrorRef.current = onError }, [onError])

    // =========================================================================
    // Script Load Handlers
    // =========================================================================

    const handleScriptLoad = useCallback(() => {
      console.log('✅ Interlucent pixel-stream script loaded')
      setScriptLoaded(true)
    }, [])

    const handleScriptError = useCallback(() => {
      console.error('❌ Failed to load Interlucent pixel-stream script')
      setScriptError('Failed to load streaming component')
      onErrorRef.current?.('Failed to load streaming component')
    }, [])

    // =========================================================================
    // Initialize Component After Script Loads
    // =========================================================================

    useEffect(() => {
      if (!scriptLoaded || !containerRef.current) return

      // Check if element already exists
      let ps = containerRef.current.querySelector('pixel-stream') as PixelStreamElement | null

      if (!ps) {
        // Create the pixel-stream element
        ps = document.createElement('pixel-stream') as PixelStreamElement
        containerRef.current.appendChild(ps)
      }

      elementRef.current = ps

      // -----------------------------------------------------------------------
      // Set attributes/properties
      // -----------------------------------------------------------------------

      if (controls) {
        ps.setAttribute('controls', '')
      } else {
        ps.removeAttribute('controls')
      }

      if (swiftJobRequest) {
        ps.setAttribute('swift-job-request', '')
      }

      if (forceTurn) {
        ps.setAttribute('force-turn', '')
      }

      if (apiEndpoint) ps.apiEndpoint = apiEndpoint
      if (appId) ps.appId = appId
      if (appVersion) ps.appVersion = appVersion

      ps.reconnectMode = reconnectMode
      ps.reconnectAttempts = reconnectAttempts
      ps.reconnectStrategy = reconnectStrategy
      ps.queueWaitTolerance = queueWaitTolerance
      ps.webrtcNegotiationTolerance = webrtcNegotiationTolerance
      ps.flexiblePresenceAllowance = flexiblePresenceAllowance

      if (lingerTolerance !== undefined) ps.lingerTolerance = lingerTolerance
      if (rendezvousTolerance !== undefined) ps.rendezvousTolerance = rendezvousTolerance

      // -----------------------------------------------------------------------
      // Attach Event Listeners
      // -----------------------------------------------------------------------

      const handleStatusChange = (event: CustomEvent<StatusChangeDetail>) => {
        const { newStatus, oldStatus } = event.detail
        console.log(`📡 Status: ${oldStatus} → ${newStatus}`)

        // Log additional debug info
        if (ps) {
          const debugInfo = {
            status: ps.status,
            sessionId: ps.sessionId,
            agentId: ps.agentId,
            isAdmitted: ps.isAdmitted,
            failureReason: ps.failureReason,
            streamStartedAt: ps.streamStartedAt,
            lastUserInteraction: ps.lastUserInteraction,
          }
          console.log('📡 Debug info:', debugInfo)

          // Warn if streaming but not admitted (unusual)
          if (newStatus === 'streaming' && !ps.isAdmitted) {
            console.warn('⚠️ Streaming but isAdmitted is false - token may not be fully validated')
          }

          // Log time spent streaming before interruption
          if (newStatus === 'interrupted' && ps.streamStartedAt) {
            const streamDuration = Date.now() - ps.streamStartedAt
            console.log(`⏱️ Stream was active for ${streamDuration}ms before interruption`)
          }
        }

        onStatusChangeRef.current?.(newStatus, oldStatus)

        // Handle specific status transitions
        if (newStatus === 'streaming') {
          onStreamStartRef.current?.()
        } else if (newStatus === 'failed') {
          const reason = ps?.failureReason || 'Stream connection failed'
          console.error('❌ Stream failed:', reason)
          onErrorRef.current?.(reason)
        }
      }

      const handleDataChannelOpen = () => {
        console.log('📡 Data channel open - ready to send messages')
        setDataChannelOpen(true)
        onDataChannelOpenRef.current?.()
      }

      const handleMessage = (event: CustomEvent<unknown>) => {
        console.log('📥 Message from UE5:', event.detail)
        onMessageRef.current?.(event.detail)
      }

      const handleSessionReady = (event: CustomEvent<{ sessionId: string; agentId: string } | null>) => {
        const sessionId = event.detail?.sessionId || 'unknown'
        const agentId = event.detail?.agentId || 'unknown'
        console.log('✅ Session ready:', sessionId)
        onSessionReadyRef.current?.(sessionId, agentId)
      }

      const handleSessionEnded = (event: CustomEvent<{ reason: string } | null>) => {
        const reason = event.detail?.reason || 'unknown'
        console.log('🔌 Session ended:', reason)
        setDataChannelOpen(false)
        onSessionEndedRef.current?.(reason)
      }

      ps.addEventListener('status-change', handleStatusChange as EventListener)
      ps.addEventListener('data-channel-open', handleDataChannelOpen as EventListener)
      ps.addEventListener('ue-command-response', handleMessage as EventListener)
      ps.addEventListener('session-ready', handleSessionReady as EventListener)
      ps.addEventListener('session-ended', handleSessionEnded as EventListener)

      // Cleanup
      return () => {
        ps?.removeEventListener('status-change', handleStatusChange as EventListener)
        ps?.removeEventListener('data-channel-open', handleDataChannelOpen as EventListener)
        ps?.removeEventListener('ue-command-response', handleMessage as EventListener)
        ps?.removeEventListener('session-ready', handleSessionReady as EventListener)
        ps?.removeEventListener('session-ended', handleSessionEnded as EventListener)
      }
    }, [
      scriptLoaded,
      controls,
      apiEndpoint,
      appId,
      appVersion,
      reconnectMode,
      reconnectAttempts,
      reconnectStrategy,
      queueWaitTolerance,
      webrtcNegotiationTolerance,
      swiftJobRequest,
      forceTurn,
      flexiblePresenceAllowance,
      lingerTolerance,
      rendezvousTolerance,
    ])

    // =========================================================================
    // Set Admission Token
    // =========================================================================

    useEffect(() => {
      if (!elementRef.current || !admissionToken) return

      console.log('🔑 Setting admission token:', admissionToken.substring(0, 50) + '...')
      elementRef.current.admissionToken = admissionToken

      // The component auto-connects when admissionToken is set
      // play() will be called from user gesture or we can call it here
      // Note: play() must be called from user gesture for autoplay policy
      console.log('📡 Token set, component will auto-connect')
    }, [admissionToken])

    // =========================================================================
    // Imperative Handle (exposed methods)
    // =========================================================================

    useImperativeHandle(ref, () => ({
      play: async () => {
        if (!elementRef.current) {
          throw new Error('pixel-stream element not initialized')
        }
        await elementRef.current.play()
      },

      cancel: () => {
        elementRef.current?.cancel()
      },

      stop: (reason?: string) => {
        elementRef.current?.stop(reason)
      },

      sendUIInteraction: (payload: Record<string, unknown>) => {
        if (!elementRef.current) {
          console.warn('Cannot send message: pixel-stream not initialized')
          return
        }
        if (!dataChannelOpen) {
          console.warn('Cannot send message: data channel not open')
          return
        }
        elementRef.current.sendUIInteraction(payload)
      },

      sendCommand: (command: Record<string, unknown>) => {
        if (!elementRef.current) {
          console.warn('Cannot send command: pixel-stream not initialized')
          return
        }
        if (!dataChannelOpen) {
          console.warn('Cannot send command: data channel not open')
          return
        }
        elementRef.current.sendCommand(command)
      },

      /**
       * Send message in string format (backward compatible with PureWeb)
       * Converts "type:data" string format to JSON for Interlucent
       */
      sendStringMessage: (message: string) => {
        if (!elementRef.current) {
          console.warn('Cannot send message: pixel-stream not initialized')
          return
        }
        if (!dataChannelOpen) {
          console.warn('Cannot send message: data channel not open')
          return
        }

        // Convert string format to JSON
        // We include the raw message so UE5 can use either format
        const colonIndex = message.indexOf(':')
        const type = colonIndex > -1 ? message.substring(0, colonIndex) : message
        const data = colonIndex > -1 ? message.substring(colonIndex + 1) : ''

        elementRef.current.sendUIInteraction({
          type,
          data,
          _rawMessage: message, // For backward compatibility
        })
      },

      getStatus: () => {
        return elementRef.current?.status || null
      },

      getSessionId: () => {
        return elementRef.current?.sessionId || null
      },

      isDataChannelOpen: () => {
        return dataChannelOpen
      },

      getElement: () => {
        return elementRef.current
      },
    }), [dataChannelOpen])

    // =========================================================================
    // Render
    // =========================================================================

    return (
      <>
        {/* Load CDN Script */}
        <Script
          src={CDN_URL}
          strategy="afterInteractive"
          onLoad={handleScriptLoad}
          onError={handleScriptError}
        />

        {/* Container for pixel-stream element */}
        <div
          ref={containerRef}
          className={`interlucent-stream-container ${className}`}
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            ...style,
          }}
        >
          {/* Script loading error */}
          {scriptError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black text-white">
              <div className="text-center">
                <p className="text-red-500 mb-2">⚠️ {scriptError}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Loading state */}
          {!scriptLoaded && !scriptError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black text-white">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
                <p>Loading streaming component...</p>
              </div>
            </div>
          )}

          {/* Custom overlay (children) */}
          {children}
        </div>

        {/* Styles for pixel-stream element */}
        <style jsx global>{`
          pixel-stream {
            display: block;
            width: 100%;
            height: 100%;
          }

          .interlucent-stream-container pixel-stream video {
            width: 100% !important;
            height: 100% !important;
            object-fit: contain;
          }
        `}</style>
      </>
    )
  }
)

export default InterlucientStream
