'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// =============================================================================
// Types
// =============================================================================

interface UseIdleDetectionOptions {
  /** Idle timeout in milliseconds (default: 300000 = 5 minutes) */
  idleTimeout?: number
  /** Whether idle detection is enabled */
  enabled?: boolean
  /** Events to track for activity */
  events?: string[]
}

interface UseIdleDetectionReturn {
  /** Whether the user is currently idle (warning modal should show) */
  isIdle: boolean
  /** Reset the idle state (user clicked "I'm still here") */
  resetIdle: () => void
  /** Time remaining until idle warning (for debugging) */
  timeUntilIdle: number
}

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_IDLE_TIMEOUT = 5 * 60 * 1000 // 5 minutes
const DEFAULT_EVENTS = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'click',
  'wheel',
  'pointermove',
  'pointerdown'
]

// =============================================================================
// Hook
// =============================================================================

export function useIdleDetection({
  idleTimeout = DEFAULT_IDLE_TIMEOUT,
  enabled = true,
  events = DEFAULT_EVENTS
}: UseIdleDetectionOptions = {}): UseIdleDetectionReturn {
  const [isIdle, setIsIdle] = useState(false)
  const [timeUntilIdle, setTimeUntilIdle] = useState(idleTimeout)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Clear existing timeout
  const clearIdleTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  // Start idle timeout
  const startIdleTimeout = useCallback(() => {
    clearIdleTimeout()
    lastActivityRef.current = Date.now()
    setTimeUntilIdle(idleTimeout)

    timeoutRef.current = setTimeout(() => {
      setIsIdle(true)
    }, idleTimeout)
  }, [idleTimeout, clearIdleTimeout])

  // Reset idle state (called when user interacts or clicks "I'm still here")
  const resetIdle = useCallback(() => {
    setIsIdle(false)
    startIdleTimeout()
  }, [startIdleTimeout])

  // Handle user activity
  const handleActivity = useCallback(() => {
    // Don't reset if already showing idle warning
    if (isIdle) return

    lastActivityRef.current = Date.now()
    setTimeUntilIdle(idleTimeout)

    // Debounce the timeout reset
    clearIdleTimeout()
    timeoutRef.current = setTimeout(() => {
      setIsIdle(true)
    }, idleTimeout)
  }, [isIdle, idleTimeout, clearIdleTimeout])

  // Update time until idle (for UI display)
  useEffect(() => {
    if (!enabled || isIdle) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current
      const remaining = Math.max(0, idleTimeout - elapsed)
      setTimeUntilIdle(remaining)
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, isIdle, idleTimeout])

  // Set up event listeners
  useEffect(() => {
    if (!enabled) {
      clearIdleTimeout()
      return
    }

    // Start initial timeout
    startIdleTimeout()

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true })
    })

    return () => {
      clearIdleTimeout()
      events.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
    }
  }, [enabled, events, handleActivity, startIdleTimeout, clearIdleTimeout])

  return {
    isIdle,
    resetIdle,
    timeUntilIdle
  }
}

export default useIdleDetection
