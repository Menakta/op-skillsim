'use client'

/**
 * Stream Health Monitor Hook
 *
 * Monitors video stream health to detect frozen/stuck streams.
 * Uses video frame callbacks to detect when frames stop arriving
 * while the connection status still shows "Connected".
 *
 * This is a non-invasive addition - it only monitors and reports,
 * doesn't modify any existing stream behavior.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { StreamerStatus } from '@pureweb/platform-sdk'

// =============================================================================
// Types
// =============================================================================

export type StreamHealthStatus = 'healthy' | 'degraded' | 'frozen' | 'disconnected' | 'idle'

export interface StreamHealthState {
  /** Current health status */
  status: StreamHealthStatus
  /** Seconds since last frame received */
  secondsSinceLastFrame: number
  /** Whether the stream appears to be frozen */
  isFrozen: boolean
  /** Whether we should show a warning to the user */
  shouldWarn: boolean
  /** Total frames received since monitoring started */
  framesReceived: number
  /** Last time a frame was received (timestamp) */
  lastFrameTime: number | null
}

export interface UseStreamHealthMonitorConfig {
  /** Video element ref to monitor */
  videoRef: React.RefObject<HTMLVideoElement | null>
  /** Current streamer status from PureWeb */
  streamerStatus: StreamerStatus
  /** Whether monitoring is enabled (only when connected) */
  enabled: boolean
  /** Seconds without frames before considering stream "degraded" (default: 3) */
  degradedThreshold?: number
  /** Seconds without frames before considering stream "frozen" (default: 8) */
  frozenThreshold?: number
  /** Callback when stream becomes frozen */
  onStreamFrozen?: () => void
  /** Callback when stream recovers from frozen state */
  onStreamRecovered?: () => void
}

export interface UseStreamHealthMonitorReturn {
  /** Current health state */
  health: StreamHealthState
  /** Manually reset the health monitor (e.g., after reconnection) */
  resetMonitor: () => void
}

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_DEGRADED_THRESHOLD = 3 // seconds
const DEFAULT_FROZEN_THRESHOLD = 8 // seconds
const CHECK_INTERVAL = 1000 // 1 second

// =============================================================================
// Initial State
// =============================================================================

const INITIAL_HEALTH_STATE: StreamHealthState = {
  status: 'idle',
  secondsSinceLastFrame: 0,
  isFrozen: false,
  shouldWarn: false,
  framesReceived: 0,
  lastFrameTime: null,
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useStreamHealthMonitor(
  config: UseStreamHealthMonitorConfig
): UseStreamHealthMonitorReturn {
  const {
    videoRef,
    streamerStatus,
    enabled,
    degradedThreshold = DEFAULT_DEGRADED_THRESHOLD,
    frozenThreshold = DEFAULT_FROZEN_THRESHOLD,
    onStreamFrozen,
    onStreamRecovered,
  } = config

  // State
  const [health, setHealth] = useState<StreamHealthState>(INITIAL_HEALTH_STATE)

  // Refs for tracking without causing re-renders
  const lastFrameTimeRef = useRef<number | null>(null)
  const framesReceivedRef = useRef(0)
  const wasFrozenRef = useRef(false)
  const frameCallbackIdRef = useRef<number | null>(null)

  // Refs for callbacks to avoid them being dependencies (prevents infinite loops)
  const onStreamFrozenRef = useRef(onStreamFrozen)
  const onStreamRecoveredRef = useRef(onStreamRecovered)

  // Keep callback refs updated (separate effect, no state changes)
  onStreamFrozenRef.current = onStreamFrozen
  onStreamRecoveredRef.current = onStreamRecovered

  // ==========================================================================
  // Frame Callback - Tracks when video frames are received
  // ==========================================================================

  const handleVideoFrame = useCallback(() => {
    lastFrameTimeRef.current = Date.now()
    framesReceivedRef.current += 1

    // If we were frozen and now receiving frames, we've recovered
    if (wasFrozenRef.current) {
      console.log('✅ Stream recovered - receiving frames again')
      wasFrozenRef.current = false
      onStreamRecoveredRef.current?.()
    }

    // Request next frame callback
    const video = videoRef.current
    if (video && 'requestVideoFrameCallback' in video) {
      frameCallbackIdRef.current = (video as any).requestVideoFrameCallback(handleVideoFrame)
    }
  }, [videoRef])

  // ==========================================================================
  // Setup Video Frame Monitoring
  // ==========================================================================

  useEffect(() => {
    const video = videoRef.current

    if (!enabled || !video || streamerStatus !== StreamerStatus.Connected) {
      // Clean up if disabled or not connected
      if (frameCallbackIdRef.current !== null && video && 'cancelVideoFrameCallback' in video) {
        (video as any).cancelVideoFrameCallback(frameCallbackIdRef.current)
        frameCallbackIdRef.current = null
      }
      return
    }

    // Cast to any to avoid TypeScript narrowing issues with requestVideoFrameCallback
    const videoElement = video as HTMLVideoElement

    // Check if browser supports requestVideoFrameCallback
    const supportsFrameCallback = typeof (videoElement as any).requestVideoFrameCallback === 'function'

    if (supportsFrameCallback) {
      // Modern browsers: use requestVideoFrameCallback for accurate frame tracking
      console.log('🔍 Starting stream health monitoring (requestVideoFrameCallback)')
      frameCallbackIdRef.current = (videoElement as any).requestVideoFrameCallback(handleVideoFrame)

      return () => {
        if (frameCallbackIdRef.current !== null) {
          (videoElement as any).cancelVideoFrameCallback(frameCallbackIdRef.current)
          frameCallbackIdRef.current = null
        }
      }
    } else {
      // Fallback: use timeupdate event for older browsers
      console.log('🔍 Starting stream health monitoring (timeupdate fallback)')
      const handleTimeUpdate = () => {
        lastFrameTimeRef.current = Date.now()
        framesReceivedRef.current += 1
      }
      videoElement.addEventListener('timeupdate', handleTimeUpdate)

      return () => {
        videoElement.removeEventListener('timeupdate', handleTimeUpdate)
      }
    }
  }, [enabled, streamerStatus, videoRef, handleVideoFrame])

  // ==========================================================================
  // Health Check Interval
  // ==========================================================================

  useEffect(() => {
    // Don't run health checks if not enabled or not connected
    if (!enabled || streamerStatus !== StreamerStatus.Connected) {
      return
    }

    const checkHealth = () => {
      const now = Date.now()
      const lastFrame = lastFrameTimeRef.current
      const secondsSinceLastFrame = lastFrame ? Math.floor((now - lastFrame) / 1000) : 0

      let status: StreamHealthStatus = 'healthy'
      let isFrozen = false
      let shouldWarn = false

      // Only check for frozen if we've received at least one frame
      if (lastFrame !== null) {
        if (secondsSinceLastFrame >= frozenThreshold) {
          status = 'frozen'
          isFrozen = true
          shouldWarn = true

          // Trigger callback only once when becoming frozen
          if (!wasFrozenRef.current) {
            console.log(`🥶 Stream appears frozen - no frames for ${secondsSinceLastFrame}s`)
            wasFrozenRef.current = true
            onStreamFrozenRef.current?.()
          }
        } else if (secondsSinceLastFrame >= degradedThreshold) {
          status = 'degraded'
          shouldWarn = true
        }
      }

      setHealth({
        status,
        secondsSinceLastFrame,
        isFrozen,
        shouldWarn,
        framesReceived: framesReceivedRef.current,
        lastFrameTime: lastFrame,
      })
    }

    // Initial check
    checkHealth()

    // Periodic checks
    const interval = setInterval(checkHealth, CHECK_INTERVAL)

    return () => clearInterval(interval)
  }, [enabled, streamerStatus, degradedThreshold, frozenThreshold])

  // ==========================================================================
  // Reset to idle when disabled or disconnected
  // ==========================================================================

  useEffect(() => {
    if (!enabled || streamerStatus !== StreamerStatus.Connected) {
      setHealth(INITIAL_HEALTH_STATE)
    }
  }, [enabled, streamerStatus])

  // ==========================================================================
  // Reset Monitor
  // ==========================================================================

  const resetMonitor = useCallback(() => {
    console.log('🔄 Resetting stream health monitor')
    lastFrameTimeRef.current = null
    framesReceivedRef.current = 0
    wasFrozenRef.current = false
    setHealth(INITIAL_HEALTH_STATE)
  }, [])

  return {
    health,
    resetMonitor,
  }
}

export default useStreamHealthMonitor
