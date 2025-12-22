'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import type { ParsedMessage, CameraPerspective, CameraMode } from '@/app/lib/messageTypes'
import { WEB_TO_UE_MESSAGES } from '@/app/lib/messageTypes'
import type { UseMessageBusReturn } from '@/app/features/messaging/hooks/useMessageBus'
import { eventBus } from '@/app/lib/events'
import { useThrottledCallback } from '@/app/lib/performance'

// =============================================================================
// Camera State Type
// =============================================================================

export interface CameraStateData {
  cameraMode: CameraMode
  cameraPerspective: string
  cameraDistance: number
}

// =============================================================================
// Callbacks
// =============================================================================

export interface CameraControlCallbacks {
  onCameraUpdate?: (data: {
    mode: CameraMode
    perspective: string
    distance: number
    isTransitioning: boolean
  }) => void
}

// =============================================================================
// Initial State
// =============================================================================

const initialState: CameraStateData = {
  cameraMode: 'Manual',
  cameraPerspective: 'IsometricNE',
  cameraDistance: 1500
}

// =============================================================================
// Hook Return Type
// =============================================================================

export interface UseCameraControlReturn {
  state: CameraStateData
  setCameraPerspective: (perspective: CameraPerspective) => void
  toggleAutoOrbit: () => void
  resetCamera: () => void
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useCameraControl(
  messageBus: UseMessageBusReturn,
  callbacks: CameraControlCallbacks = {}
): UseCameraControlReturn {
  const [state, setState] = useState<CameraStateData>(initialState)
  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks

  // ==========================================================================
  // Message Handler
  // ==========================================================================

  useEffect(() => {
    const unsubscribe = messageBus.onMessage((message: ParsedMessage) => {
      const { type, dataString } = message
      const parts = dataString.split(':')

      if (type === 'camera_update') {
        const mode = (parts[0] as CameraMode) || 'Manual'
        const perspective = parts[1] || 'IsometricNE'
        const distance = parseFloat(parts[2]) || 1500

        setState({
          cameraMode: mode,
          cameraPerspective: perspective,
          cameraDistance: distance
        })

        callbacksRef.current.onCameraUpdate?.({
          mode,
          perspective,
          distance,
          isTransitioning: parts[3] === 'true'
        })
      }
    })

    return unsubscribe
  }, [messageBus])

  // ==========================================================================
  // Actions (throttled to prevent rapid clicking)
  // ==========================================================================

  const setCameraPerspectiveInternal = useCallback((perspective: CameraPerspective) => {
    messageBus.sendMessage(WEB_TO_UE_MESSAGES.CAMERA_CONTROL, perspective)
    eventBus.emit('camera:perspectiveChanged', { perspective })
  }, [messageBus])

  // Throttle camera perspective changes to 300ms to prevent rapid clicking
  const setCameraPerspective = useThrottledCallback(setCameraPerspectiveInternal, 300)

  const toggleAutoOrbitInternal = useCallback(() => {
    const newMode = state.cameraMode === 'Orbit' ? 'Manual' : 'Orbit'
    if (state.cameraMode === 'Orbit') {
      messageBus.sendMessage(WEB_TO_UE_MESSAGES.CAMERA_CONTROL, 'orbit_stop')
    } else {
      messageBus.sendMessage(WEB_TO_UE_MESSAGES.CAMERA_CONTROL, 'orbit_start')
    }
    eventBus.emit('camera:modeChanged', { mode: newMode })
  }, [state.cameraMode, messageBus])

  // Throttle orbit toggle to 500ms
  const toggleAutoOrbit = useThrottledCallback(toggleAutoOrbitInternal, 500)

  const resetCameraInternal = useCallback(() => {
    messageBus.sendMessage(WEB_TO_UE_MESSAGES.CAMERA_CONTROL, 'reset')
    eventBus.emit('camera:reset', undefined)
  }, [messageBus])

  // Throttle reset to 500ms
  const resetCamera = useThrottledCallback(resetCameraInternal, 500)

  return {
    state,
    setCameraPerspective,
    toggleAutoOrbit,
    resetCamera
  }
}

export default useCameraControl
