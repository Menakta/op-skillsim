'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import type { ParsedMessage } from '@/app/lib/messageTypes'

// =============================================================================
// Types
// =============================================================================

export interface XRaySliderState {
  floorValue: number  // 0-1 range
  wallValue: number   // 0-1 range
}

export interface XRaySliderCallbacks {
  onXRaySliderUpdate?: (sliderName: 'Floor' | 'Wall', value: number) => void
}

// =============================================================================
// Message Bus Interface (matches both PureWeb and Interlucent)
// =============================================================================

interface MessageBus {
  sendJson: (payload: Record<string, unknown>) => void
  onMessage: (handler: (message: ParsedMessage) => void) => () => void
}

// =============================================================================
// Initial State
// =============================================================================

const initialState: XRaySliderState = {
  floorValue: 0,  // 0 = no X-ray (hidden), 1 = full X-ray (visible pipes)
  wallValue: 0,
}

// =============================================================================
// Hook Return Type
// =============================================================================

export interface UseXRaySliderControlReturn {
  state: XRaySliderState
  setFloorValue: (value: number) => void
  setWallValue: (value: number) => void
  resetSliders: () => void
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useXRaySliderControl(
  messageBus: MessageBus,
  callbacks: XRaySliderCallbacks = {}
): UseXRaySliderControlReturn {
  const [state, setState] = useState<XRaySliderState>(initialState)
  const callbacksRef = useRef(callbacks)

  // Update callbacks ref in effect to avoid lint warning
  useEffect(() => {
    callbacksRef.current = callbacks
  }, [callbacks])

  // ==========================================================================
  // Message Handler - Listen for xray_slider updates from UE5
  // ==========================================================================

  useEffect(() => {
    const unsubscribe = messageBus.onMessage((message: ParsedMessage) => {
      const { type, dataString } = message

      // Handle xray_slider_update messages from UE5
      if (type === 'xray_slider_update') {
        const parts = dataString.split(':')
        const sliderName = parts[0] as 'Floor' | 'Wall'
        const value = parseFloat(parts[1]) || 0

        if (sliderName === 'Floor') {
          setState(prev => ({ ...prev, floorValue: value }))
        } else if (sliderName === 'Wall') {
          setState(prev => ({ ...prev, wallValue: value }))
        }

        callbacksRef.current.onXRaySliderUpdate?.(sliderName, value)
      }
    })

    return unsubscribe
  }, [messageBus])

  // ==========================================================================
  // Actions - Send slider values to UE5 in JSON format for Interlucent
  // ==========================================================================

  const setFloorValue = useCallback((value: number) => {
    // Clamp value between 0 and 1
    const clampedValue = Math.max(0, Math.min(1, value))

    // Update local state immediately for responsive UI
    setState(prev => ({ ...prev, floorValue: clampedValue }))

    // Invert value for UE5: UI 0 (hidden) -> UE5 1, UI 1 (visible) -> UE5 0
    const invertedValue = 1 - clampedValue

    // Send JSON message to UE5 (Interlucent format)
    messageBus.sendJson({
      type: 'xray_slider',
      sliderName: 'Floor',
      value: invertedValue
    })
  }, [messageBus])

  const setWallValue = useCallback((value: number) => {
    // Clamp value between 0 and 1
    const clampedValue = Math.max(0, Math.min(1, value))

    // Update local state immediately for responsive UI
    setState(prev => ({ ...prev, wallValue: clampedValue }))

    // Invert value for UE5: UI 0 (hidden) -> UE5 1, UI 1 (visible) -> UE5 0
    const invertedValue = 1 - clampedValue

    // Send JSON message to UE5 (Interlucent format)
    messageBus.sendJson({
      type: 'xray_slider',
      sliderName: 'Wall',
      value: invertedValue
    })
  }, [messageBus])

  const resetSliders = useCallback(() => {
    // Reset to initial values
    setState(initialState)

    // Send reset values to UE5 (inverted: UI 0 -> UE5 1)
    messageBus.sendJson({
      type: 'xray_slider',
      sliderName: 'Floor',
      value: 1 - initialState.floorValue
    })
    messageBus.sendJson({
      type: 'xray_slider',
      sliderName: 'Wall',
      value: 1 - initialState.wallValue
    })
  }, [messageBus])

  return {
    state,
    setFloorValue,
    setWallValue,
    resetSliders
  }
}

export default useXRaySliderControl
