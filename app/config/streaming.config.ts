/**
 * Streaming Provider Configuration
 *
 * Feature flag to switch between PureWeb and Interlucent pixel streaming.
 * Can be controlled via environment variable or localStorage for testing.
 */

// =============================================================================
// Types
// =============================================================================

export type StreamingProvider = 'pureweb' | 'interlucent'

// =============================================================================
// Configuration
// =============================================================================

/**
 * Default streaming provider
 * Set via NEXT_PUBLIC_STREAMING_PROVIDER environment variable
 * Options: 'pureweb' | 'interlucent'
 */
export const DEFAULT_STREAMING_PROVIDER: StreamingProvider =
  (process.env.NEXT_PUBLIC_STREAMING_PROVIDER as StreamingProvider) || 'pureweb'

/**
 * Local storage key for provider override (for testing)
 */
const PROVIDER_STORAGE_KEY = 'op_skillsim_streaming_provider'

// =============================================================================
// Provider Detection
// =============================================================================

/**
 * Get the current streaming provider
 * Priority:
 * 1. localStorage override (for testing)
 * 2. Environment variable
 * 3. Default (pureweb)
 */
export function getStreamingProvider(): StreamingProvider {
  // Check localStorage for override (client-side only)
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(PROVIDER_STORAGE_KEY)
    if (stored === 'pureweb' || stored === 'interlucent') {
      return stored
    }
  }

  return DEFAULT_STREAMING_PROVIDER
}

/**
 * Set streaming provider override (for testing)
 * Persists to localStorage
 */
export function setStreamingProvider(provider: StreamingProvider): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(PROVIDER_STORAGE_KEY, provider)
    console.log(`📺 Streaming provider set to: ${provider}`)
    console.log('⚠️ Refresh the page to apply changes')
  }
}

/**
 * Clear streaming provider override
 * Returns to environment variable or default
 */
export function clearStreamingProvider(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(PROVIDER_STORAGE_KEY)
    console.log(`📺 Streaming provider reset to default: ${DEFAULT_STREAMING_PROVIDER}`)
    console.log('⚠️ Refresh the page to apply changes')
  }
}

/**
 * Check if using Interlucent
 */
export function isInterlucent(): boolean {
  return getStreamingProvider() === 'interlucent'
}

/**
 * Check if using PureWeb
 */
export function isPureWeb(): boolean {
  return getStreamingProvider() === 'pureweb'
}

// =============================================================================
// Interlucent Configuration
// =============================================================================

export interface InterlucientConfig {
  /** API endpoint (defaults to api.interlucent.ai) */
  apiEndpoint: string

  /** Application ID */
  appId: string

  /** Application version (optional, uses latest if not specified) */
  appVersion?: string

  /** CDN URL for pixel-stream script */
  cdnUrl: string

  /** Reconnection mode */
  reconnectMode: 'none' | 'recover' | 'always'

  /** Number of reconnection attempts (-1 for unlimited) */
  reconnectAttempts: number

  /** Queue wait tolerance in seconds */
  queueWaitTolerance: number

  /** WebRTC negotiation tolerance in seconds */
  webrtcNegotiationTolerance: number

  /** Enable swift job request for faster startup */
  swiftJobRequest: boolean

  /** Flexible presence allowance in seconds */
  flexiblePresenceAllowance: number
}

export const INTERLUCENT_CONFIG: InterlucientConfig = {
  apiEndpoint: process.env.NEXT_PUBLIC_INTERLUCENT_API_ENDPOINT || 'api.interlucent.ai',
  appId: process.env.NEXT_PUBLIC_INTERLUCENT_APP_ID || '',
  appVersion: process.env.NEXT_PUBLIC_INTERLUCENT_APP_VERSION,
  cdnUrl: 'https://cdn.interlucent.ai/dev/pixel-stream/0.0.66/pixel-stream.iife.min.js',
  reconnectMode: 'recover',
  reconnectAttempts: 3,
  queueWaitTolerance: 120,
  webrtcNegotiationTolerance: 90,
  swiftJobRequest: true,
  flexiblePresenceAllowance: 120,
}

// =============================================================================
// PureWeb Configuration (existing)
// =============================================================================

export interface PureWebConfig {
  /** Project ID */
  projectId: string

  /** Model ID */
  modelId: string

  /** API endpoint */
  endpoint: string
}

export const PUREWEB_CONFIG: PureWebConfig = {
  projectId: process.env.NEXT_PUBLIC_PUREWEB_PROJECT_ID || '',
  modelId: process.env.NEXT_PUBLIC_PUREWEB_MODEL_ID || '',
  endpoint: 'https://api.pureweb.io',
}

// =============================================================================
// Console Commands (for developer testing)
// =============================================================================

// Make these available in the browser console for easy testing
if (typeof window !== 'undefined') {
  (window as any).streamingConfig = {
    getProvider: getStreamingProvider,
    setProvider: setStreamingProvider,
    clearProvider: clearStreamingProvider,
    isInterlucent,
    isPureWeb,
    interlucent: INTERLUCENT_CONFIG,
    pureweb: PUREWEB_CONFIG,
  }

  console.log(`
📺 Streaming Provider: ${getStreamingProvider()}

To switch providers, use:
  streamingConfig.setProvider('interlucent')
  streamingConfig.setProvider('pureweb')
  streamingConfig.clearProvider() // reset to default

Then refresh the page.
  `)
}
