'use client'

/**
 * Performance Hooks
 *
 * Throttled callback for preventing rapid function calls.
 */

import { useRef, useCallback } from 'react'

// =============================================================================
// Throttled Callback Hook
// =============================================================================

/**
 * Throttle a callback function.
 * Useful for preventing rapid clicking on buttons.
 *
 * @example
 * const handleClick = useThrottledCallback(() => {
 *   doSomething()
 * }, 300)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef(Date.now())
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  return useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((...args: any[]) => {
      const now = Date.now()

      if (now - lastRun.current >= delay) {
        lastRun.current = now
        callback(...args)
      } else {
        // Schedule trailing call
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
        timeoutRef.current = setTimeout(() => {
          lastRun.current = Date.now()
          callback(...args)
        }, delay - (now - lastRun.current))
      }
    }) as T,
    [callback, delay]
  )
}
