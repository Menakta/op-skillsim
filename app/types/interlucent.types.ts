/**
 * Interlucent Pixel Streaming Type Definitions
 *
 * TypeScript declarations for the <pixel-stream> web component
 * CDN: https://cdn.interlucent.ai/dev/pixel-stream/0.0.66/pixel-stream.iife.min.js
 */

// =============================================================================
// Status Types
// =============================================================================

/**
 * Session lifecycle status values
 * The typical happy-path progression is:
 * idle → connecting → authenticating → connected → queued → rendezvoused → negotiating → streaming
 */
export type InterlucientStatus =
  | 'idle'           // Initial state, ready to start
  | 'connecting'     // Establishing connection
  | 'authenticating' // Validating admission token
  | 'connected'      // Connected to server
  | 'queued'         // Waiting for GPU worker
  | 'rendezvoused'   // Matched with GPU worker
  | 'negotiating'    // WebRTC negotiation in progress
  | 'streaming'      // Stream is active and playing
  | 'ready'          // Stream ready but autoplay blocked
  | 'interrupted'    // Media pipeline stalled
  | 'recovering'     // Active media recovery in progress
  | 'failed'         // Terminal state - session failed
  | 'ended'          // Terminal state - session ended gracefully

/**
 * Reconnect mode options
 */
export type ReconnectMode = 'none' | 'recover' | 'always'

/**
 * Reconnect strategy options
 */
export type ReconnectStrategy = 'immediate' | 'exponential-backoff'

// =============================================================================
// Event Types
// =============================================================================

/**
 * Status change event detail
 */
export interface StatusChangeDetail {
  newStatus: InterlucientStatus
  oldStatus: InterlucientStatus
}

/**
 * Session ready event detail
 */
export interface SessionReadyDetail {
  sessionId: string
  agentId: string
  participants: unknown[]
}

/**
 * Session ended event detail
 */
export interface SessionEndedDetail {
  reason: string
}

/**
 * Custom event types for pixel-stream
 */
export interface PixelStreamEventMap {
  'status-change': CustomEvent<StatusChangeDetail>
  'data-channel-open': CustomEvent<void>
  'ue-command-response': CustomEvent<unknown>
  'session-ready': CustomEvent<SessionReadyDetail>
  'session-ended': CustomEvent<SessionEndedDetail>
}

// =============================================================================
// Pixel Stream Element Interface
// =============================================================================

/**
 * PixelStreamElement - Interface for the <pixel-stream> web component
 */
export interface PixelStreamElement extends HTMLElement {
  // =========================================================================
  // Writable Properties (map to HTML attributes)
  // =========================================================================

  /** Server-generated admission token (JWT) */
  admissionToken: string

  /** Reconnection behavior: 'none' | 'recover' | 'always' */
  reconnectMode: ReconnectMode

  /** Number of retry attempts (-1 = unlimited) */
  reconnectAttempts: number

  /** Retry timing strategy */
  reconnectStrategy: ReconnectStrategy

  /** Seconds to wait for GPU availability */
  queueWaitTolerance: number

  /** Seconds for WebRTC negotiation */
  webrtcNegotiationTolerance: number

  /** API host (default: api.interlucent.ai) */
  apiEndpoint: string

  /** Application identifier */
  appId: string

  /** Specific application version to stream */
  appVersion: string

  /** Send GPU request during token exchange for faster startup */
  swiftJobRequest: boolean

  /** Enable built-in overlay controls */
  controls: boolean

  /** Force TURN relay mode */
  forceTurn: boolean

  /** Reconnection grace period in seconds */
  flexiblePresenceAllowance: number

  /** How long to keep session alive when alone */
  lingerTolerance: number

  /** How long to wait for GPU worker connection */
  rendezvousTolerance: number

  // =========================================================================
  // Read-Only Properties
  // =========================================================================

  /** Current session status */
  readonly status: InterlucientStatus

  /** Current session identifier */
  readonly sessionId: string

  /** Your agent ID in this session */
  readonly agentId: string

  /** True once token exchange succeeds */
  readonly isAdmitted: boolean

  /** Description of failure, or null */
  readonly failureReason: string | null

  /** Timestamp (ms) when streaming began, or 0 */
  readonly streamStartedAt: number

  /** Timestamp of last user input */
  readonly lastUserInteraction: number

  // =========================================================================
  // Methods
  // =========================================================================

  /** Begin the connection flow */
  startSession(): void

  /** Start or resume streaming (must be called from user gesture) */
  play(): Promise<void>

  /** Cancel a pending job request while still queued */
  cancel(): void

  /** Stop the session gracefully */
  stop(reason?: string): void

  /** Send a JSON object to UE as a UIInteraction message */
  sendUIInteraction(descriptor: Record<string, unknown>): void

  /** Send a JSON object to UE as a Command message (UE 5.4+) */
  sendCommand(command: Record<string, unknown>): void

  // =========================================================================
  // Event Methods (inherited from HTMLElement but typed for our events)
  // =========================================================================

  addEventListener<K extends keyof PixelStreamEventMap>(
    type: K,
    listener: (this: PixelStreamElement, ev: PixelStreamEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void

  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void

  removeEventListener<K extends keyof PixelStreamEventMap>(
    type: K,
    listener: (this: PixelStreamElement, ev: PixelStreamEventMap[K]) => void,
    options?: boolean | EventListenerOptions
  ): void

  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ): void
}

// =============================================================================
// JSX Intrinsic Elements Declaration
// =============================================================================

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'pixel-stream': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          // Boolean attributes
          controls?: boolean
          'swift-job-request'?: boolean
          'force-turn'?: boolean

          // String attributes
          'api-endpoint'?: string
          'app-id'?: string
          'app-version'?: string
          'reconnect-mode'?: ReconnectMode
          'reconnect-strategy'?: ReconnectStrategy

          // Number attributes (as strings in HTML)
          'reconnect-attempts'?: number | string
          'queue-wait-tolerance'?: number | string
          'webrtc-negotiation-tolerance'?: number | string
          'flexible-presence-allowance'?: number | string
          'linger-tolerance'?: number | string
          'rendezvous-tolerance'?: number | string

          // React ref
          ref?: React.Ref<PixelStreamElement>
        },
        HTMLElement
      >
    }
  }
}

// =============================================================================
// Token Types
// =============================================================================

/**
 * Admission token request (sent to our backend)
 */
export interface AdmissionTokenRequest {
  userId?: string
  sessionType?: 'training' | 'cinematic'
  metadata?: Record<string, unknown>
}

/**
 * Admission token response (from our backend)
 */
export interface AdmissionTokenResponse {
  token: string
  expiresIn: number
  appId: string
  appVersion?: string
}

/**
 * Mock token configuration (for development without SDK access)
 */
export interface MockTokenConfig {
  /** App ID to use in mock token */
  appId: string
  /** App version to use in mock token */
  appVersion?: string
  /** Token expiration in seconds */
  expiresIn?: number
  /** Queue wait tolerance in seconds */
  queueWaitTolerance?: number
  /** Enable swift job request */
  swiftJobRequest?: boolean
}

// =============================================================================
// Connection Config
// =============================================================================

/**
 * Configuration for Interlucent connection
 */
export interface InterlucientConnectionConfig {
  /** API endpoint (defaults to api.interlucent.ai) */
  apiEndpoint?: string

  /** Application ID */
  appId?: string

  /** Application version (optional, uses latest if not specified) */
  appVersion?: string

  /** Reconnection mode */
  reconnectMode?: ReconnectMode

  /** Number of reconnection attempts (-1 for unlimited) */
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
}

// =============================================================================
// Backward Compatibility - String Message Format
// =============================================================================

/**
 * Converts a string-format message (PureWeb style) to JSON object (Interlucent style)
 * Example: "camera_control:Front" → { type: "camera_control", data: "Front" }
 *
 * This maintains backward compatibility with existing UE5 message handlers
 */
export function stringToJsonMessage(message: string): Record<string, unknown> {
  const colonIndex = message.indexOf(':')
  if (colonIndex === -1) {
    return { type: message }
  }

  const type = message.substring(0, colonIndex)
  const data = message.substring(colonIndex + 1)

  // Handle complex data formats
  const dataParts = data.split(':')

  // Return structured message that UE5 can parse
  // We send both the structured format AND the raw string for backward compatibility
  return {
    type,
    data,
    _rawMessage: message, // UE5 can use this if it prefers the original format
    _dataParts: dataParts  // Pre-split for convenience
  }
}

/**
 * Converts a JSON message back to string format
 * This is used when UE5 sends JSON but we need string format internally
 */
export function jsonToStringMessage(json: Record<string, unknown>): string {
  const type = json.type as string
  const data = json.data as string | undefined

  // If _rawMessage is present, use it (backward compatibility)
  if (json._rawMessage) {
    return json._rawMessage as string
  }

  if (!data) {
    return type
  }

  return `${type}:${data}`
}

export {}
