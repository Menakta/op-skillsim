'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import type { ParsedMessage } from '@/app/lib/messageTypes'
import { WEB_TO_UE_MESSAGES } from '@/app/lib/messageTypes'
import type { UseMessageBusReturn } from '@/app/features/messaging/hooks/useMessageBus'

// =============================================================================
// Explosion State Type
// =============================================================================

export interface ExplosionStateData {
  explosionValue: number
  isAnimating: boolean
}

// =============================================================================
// Callbacks
// =============================================================================

export interface ExplosionControlCallbacks {
  onExplosionUpdate?: (data: { value: number; isAnimating: boolean }) => void
}

// =============================================================================
// Initial State
// =============================================================================

const initialState: ExplosionStateData = {
  explosionValue: 0,
  isAnimating: false
}

// =============================================================================
// Hook Return Type
// =============================================================================

export interface UseExplosionControlReturn {
  state: ExplosionStateData
  setExplosionLevel: (level: number) => void
  explodeBuilding: () => void
  assembleBuilding: () => void
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useExplosionControl(
  messageBus: UseMessageBusReturn,
  callbacks: ExplosionControlCallbacks = {}
): UseExplosionControlReturn {
  const [state, setState] = useState<ExplosionStateData>(initialState)
  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks

  // ==========================================================================
  // Message Handler
  // ==========================================================================

  useEffect(() => {
    const unsubscribe = messageBus.onMessage((message: ParsedMessage) => {
      const { type, dataString } = message
      const parts = dataString.split(':')

      if (type === 'explosion_update') {
        const value = parseFloat(parts[0]) || 0
        const isAnimating = parts[1] === 'true'

        setState({ explosionValue: value, isAnimating })
        callbacksRef.current.onExplosionUpdate?.({ value, isAnimating })
      }
    })

    return unsubscribe
  }, [messageBus])

  // ==========================================================================
  // Actions
  // ==========================================================================

  const setExplosionLevel = useCallback((level: number) => {
    messageBus.sendMessage(WEB_TO_UE_MESSAGES.EXPLOSION_CONTROL, level.toString())
  }, [messageBus])

  const explodeBuilding = useCallback(() => {
    messageBus.sendMessage(WEB_TO_UE_MESSAGES.EXPLOSION_CONTROL, 'explode')
  }, [messageBus])

  const assembleBuilding = useCallback(() => {
    messageBus.sendMessage(WEB_TO_UE_MESSAGES.EXPLOSION_CONTROL, 'assemble')
  }, [messageBus])

  return {
    state,
    setExplosionLevel,
    explodeBuilding,
    assembleBuilding
  }
}

export default useExplosionControl
