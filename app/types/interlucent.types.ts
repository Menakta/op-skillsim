/**
 * Interlucent Pixel Streaming Type Definitions
 *
 * TypeScript declarations for the <pixel-stream> web component
 * CDN: https://cdn.interlucent.ai/dev/pixel-stream/0.0.73/pixel-stream.iife.min.js
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
 * Transport selected event detail
 */
export interface TransportSelectedDetail {
  turnUsed: boolean
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
  'transport-selected': CustomEvent<TransportSelectedDetail>
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

  /** Force relay mode - routes all traffic through TURN over TLS (port 443) to bypass DPI */
  forceRelay: boolean

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
          'force-relay'?: boolean

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

  /** Force relay mode - routes all traffic through TURN over TLS (port 443) to bypass DPI */
  forceRelay?: boolean

  /** Flexible presence allowance in seconds */
  flexiblePresenceAllowance?: number
}

// =============================================================================
// Message Format Documentation
// =============================================================================

/**
 * MESSAGE FORMAT FOR INTERLUCENT ↔ UE5 COMMUNICATION
 *
 * Interlucent uses native JSON format for all messages (not wrapped strings).
 *
 * ============================================================================
 * SENDING (Web → UE5):
 * ============================================================================
 *
 * Messages are sent as structured JSON objects:
 *
 *   // Tool Selection
 *   { "type": "tool_select", "tool": "XRay" }
 *
 *   // Training Control
 *   { "type": "training_control", "action": "start" }
 *
 *   // Camera Control
 *   { "type": "camera_control", "preset": "IsometricNE" }
 *
 *   // Explosion Control
 *   { "type": "explosion_control", "level": 50 }
 *   { "type": "explosion_control", "action": "explode" }
 *
 *   // Question Answer
 *   { "type": "question_answer", "questionId": "Q1", "tryCount": 2, "isCorrect": true }
 *
 *   // Pipe Selection
 *   { "type": "pipe_select", "pipeType": "100mm" }
 *
 *   // Task Start
 *   { "type": "task_start", "tool": "PipeConnection", "pipeType": "100mm" }
 *
 *   // Settings
 *   { "type": "settings_control", "setting": "resolution", "width": 1920, "height": 1080 }
 *   { "type": "settings_control", "setting": "audio_volume", "group": "Master", "volume": 0.8 }
 *
 * UE5 should:
 * 1. Receive JSON via UIInteraction handler
 * 2. Parse the JSON object directly
 * 3. Read the "type" field to determine message type
 * 4. Read other fields based on the type
 *
 *
 * ============================================================================
 * RECEIVING (UE5 → Web):
 * ============================================================================
 *
 * UE5 can send in any of these formats (we handle all):
 *
 * 1. Structured JSON (preferred - matches what we send):
 *    { "type": "training_progress", "progress": 50, "taskName": "Task1", ... }
 *
 * 2. Raw string (same as PureWeb):
 *    "training_progress:50:TaskName:phase1:3:8:true"
 *
 * 3. JSON with type + data fields:
 *    { "type": "training_progress", "data": "50:TaskName:phase1:3:8:true" }
 *
 *
 * ============================================================================
 * UE5 IMPLEMENTATION:
 * ============================================================================
 *
 * RECEIVING MESSAGES (in UIInteraction handler):
 *
 *   void HandleUIInteraction(const FString& JsonString)
 *   {
 *       TSharedPtr<FJsonObject> JsonObject;
 *       TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(JsonString);
 *
 *       if (FJsonSerializer::Deserialize(Reader, JsonObject))
 *       {
 *           FString Type;
 *           if (JsonObject->TryGetStringField(TEXT("type"), Type))
 *           {
 *               if (Type == "tool_select")
 *               {
 *                   FString Tool;
 *                   JsonObject->TryGetStringField(TEXT("tool"), Tool);
 *                   // Handle: Tool = "XRay"
 *               }
 *               else if (Type == "training_control")
 *               {
 *                   FString Action;
 *                   JsonObject->TryGetStringField(TEXT("action"), Action);
 *                   // Handle: Action = "start", "pause", "reset"
 *               }
 *               else if (Type == "explosion_control")
 *               {
 *                   double Level;
 *                   if (JsonObject->TryGetNumberField(TEXT("level"), Level))
 *                   {
 *                       // Handle: Level = 50.0
 *                   }
 *                   else
 *                   {
 *                       FString Action;
 *                       JsonObject->TryGetStringField(TEXT("action"), Action);
 *                       // Handle: Action = "explode" or "assemble"
 *                   }
 *               }
 *               // ... etc
 *           }
 *       }
 *   }
 *
 *
 * SENDING MESSAGES (to Web):
 *
 *   // Option 1: Structured JSON (preferred)
 *   FString Json = TEXT("{\"type\":\"training_progress\",\"progress\":50,\"taskName\":\"Task1\"}");
 *   PixelStreamingModule->SendResponse(Json);
 *
 *   // Option 2: Raw string (still supported)
 *   FString Message = TEXT("training_progress:50:Task1:phase1:3:8:true");
 *   PixelStreamingModule->SendResponse(Message);
 */

export {}
