'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import type { ParsedMessage, CameraPerspective, CameraMode } from '@/app/lib/messageTypes'
import { WEB_TO_UE_MESSAGES } from '@/app/lib/messageTypes'
import type { UseMessageBusReturn } from '@/app/features/messaging/hooks/useMessageBus'
import { eventBus } from '@/app/lib/events'

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

  // Track if we're ignoring UE5 updates (after user clicks)
  const ignoreUE5UpdateRef = useRef(false)
  const ignoreTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // ==========================================================================
  // Message Handler
  // ==========================================================================

  useEffect(() => {
    const unsubscribe = messageBus.onMessage((message: ParsedMessage) => {
      const { type, dataString } = message
      const parts = dataString.split(':')

      if (type === 'camera_update') {
        // Skip UE5 updates briefly after user clicks to prevent overwriting
        if (ignoreUE5UpdateRef.current) {
          return
        }

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

  // Helper to temporarily ignore UE5 updates
  const temporarilyIgnoreUE5 = useCallback(() => {
    ignoreUE5UpdateRef.current = true
    if (ignoreTimeoutRef.current) {
      clearTimeout(ignoreTimeoutRef.current)
    }
    ignoreTimeoutRef.current = setTimeout(() => {
      ignoreUE5UpdateRef.current = false
    }, 500) // Ignore UE5 updates for 500ms after click
  }, [])

  // ==========================================================================
  // Actions - State updates are immediate, ignore UE5 updates briefly
  // ==========================================================================

  const setCameraPerspective = useCallback((perspective: CameraPerspective) => {
    // Ignore UE5 updates briefly to prevent overwriting
    temporarilyIgnoreUE5()
    // Immediate UI update
    setState(prev => ({
      ...prev,
      cameraPerspective: perspective
    }))
    // Send message to UE5
    messageBus.sendMessage(WEB_TO_UE_MESSAGES.CAMERA_CONTROL, perspective)
    eventBus.emit('camera:perspectiveChanged', { perspective })
  }, [messageBus, temporarilyIgnoreUE5])

  const toggleAutoOrbit = useCallback(() => {
    // Ignore UE5 updates briefly to prevent overwriting
    temporarilyIgnoreUE5()
    // Immediate UI update
    setState(prev => {
      const newMode = prev.cameraMode === 'Orbit' ? 'Manual' : 'Orbit'
      return {
        ...prev,
        cameraMode: newMode
      }
    })
    // Send message to UE5
    if (state.cameraMode === 'Orbit') {
      messageBus.sendMessage(WEB_TO_UE_MESSAGES.CAMERA_CONTROL, 'orbit_stop')
      eventBus.emit('camera:modeChanged', { mode: 'Manual' })
    } else {
      messageBus.sendMessage(WEB_TO_UE_MESSAGES.CAMERA_CONTROL, 'orbit_start')
      eventBus.emit('camera:modeChanged', { mode: 'Orbit' })
    }
  }, [state.cameraMode, messageBus, temporarilyIgnoreUE5])

  const resetCamera = useCallback(() => {
    // Ignore UE5 updates briefly to prevent overwriting
    temporarilyIgnoreUE5()
    // Immediate UI update - reset to default, clear active perspective
    setState({
      cameraMode: 'Manual',
      cameraPerspective: '',
      cameraDistance: 1500
    })
    // Send message to UE5
    messageBus.sendMessage(WEB_TO_UE_MESSAGES.CAMERA_CONTROL, 'reset')
    eventBus.emit('camera:reset', undefined)
  }, [messageBus, temporarilyIgnoreUE5])

  return {
    state,
    setCameraPerspective,
    toggleAutoOrbit,
    resetCamera
  }
}

export default useCameraControl
