'use client'

/**
 * State Persistence Hook
 *
 * Saves training state to the database periodically and on significant changes.
 * Restores state on session reconnection for seamless resume.
 */

import { useCallback, useEffect, useRef } from 'react'
import { trainingSessionService } from '@/app/services'
import type { PersistedTrainingState } from '@/app/types'

// =============================================================================
// Types
// =============================================================================

export interface StatePersistenceState {
  // Mode state
  mode: 'cinematic' | 'training'
  uiMode: 'normal' | 'waypoint' | 'task'

  // Training progress
  currentTaskIndex: number
  taskName: string
  phase: string
  progress: number

  // Tool selections
  selectedTool: string | null
  selectedPipe: string | null
  airPlugSelected: boolean

  // Camera state
  cameraMode: string
  cameraPerspective: string

  // Explosion state
  explosionLevel: number

  // Cinematic timer (remaining seconds)
  cinematicTimeRemaining: number | null
}

export interface UseStatePersistenceOptions {
  /** Whether state persistence is enabled (LTI sessions only) */
  enabled?: boolean
  /** Debounce interval for saving state (ms) */
  saveInterval?: number
  /** Callback when state is restored */
  onStateRestored?: (state: PersistedTrainingState) => void
}

export interface UseStatePersistenceReturn {
  /** Save current state to database */
  saveState: (state: StatePersistenceState) => Promise<void>
  /** Restore state from database */
  restoreState: () => Promise<PersistedTrainingState | null>
  /** Whether state has been restored */
  isRestored: boolean
}

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_SAVE_INTERVAL = 5000 // 5 seconds debounce

// =============================================================================
// Hook Implementation
// =============================================================================

export function useStatePersistence(
  options: UseStatePersistenceOptions = {}
): UseStatePersistenceReturn {
  const {
    enabled = true,
    saveInterval = DEFAULT_SAVE_INTERVAL,
    onStateRestored
  } = options

  const lastSaveTimeRef = useRef<number>(0)
  const lastStateHashRef = useRef<string>('')
  const isRestoredRef = useRef(false)
  const pendingSaveRef = useRef<NodeJS.Timeout | null>(null)

  // ==========================================================================
  // Save State to Database
  // ==========================================================================

  const saveState = useCallback(async (state: StatePersistenceState) => {
    if (!enabled) return

    // Create a hash of the state to detect changes
    const stateHash = JSON.stringify({
      mode: state.mode,
      currentTaskIndex: state.currentTaskIndex,
      phase: state.phase,
      progress: state.progress,
      selectedTool: state.selectedTool,
      selectedPipe: state.selectedPipe,
      cinematicTimeRemaining: state.cinematicTimeRemaining
    })

    // Skip if state hasn't changed
    if (stateHash === lastStateHashRef.current) {
      return
    }

    // Debounce saves
    const now = Date.now()
    const timeSinceLastSave = now - lastSaveTimeRef.current

    if (timeSinceLastSave < saveInterval) {
      // Schedule a save after the debounce interval
      if (pendingSaveRef.current) {
        clearTimeout(pendingSaveRef.current)
      }
      pendingSaveRef.current = setTimeout(() => {
        saveState(state)
      }, saveInterval - timeSinceLastSave)
      return
    }

    // Clear any pending save
    if (pendingSaveRef.current) {
      clearTimeout(pendingSaveRef.current)
      pendingSaveRef.current = null
    }

    // Update tracking
    lastSaveTimeRef.current = now
    lastStateHashRef.current = stateHash

    // Convert to persisted format
    const persistedState: PersistedTrainingState = {
      mode: state.mode,
      uiMode: state.uiMode,
      currentTaskIndex: state.currentTaskIndex,
      taskName: state.taskName || null,
      phase: state.phase || null,
      progress: state.progress,
      selectedTool: state.selectedTool,
      selectedPipe: state.selectedPipe,
      airPlugSelected: state.airPlugSelected,
      cameraMode: state.cameraMode || null,
      cameraPerspective: state.cameraPerspective || null,
      explosionLevel: state.explosionLevel,
      cinematicTimeRemaining: state.cinematicTimeRemaining,
      lastUpdated: new Date().toISOString()
    }

    // Save to database
    const result = await trainingSessionService.saveState(persistedState)
    if (!result.success) {
      console.warn('Failed to save training state:', result.error)
    } else {
      console.log('📝 Training state saved:', {
        mode: state.mode,
        phase: state.phase,
        taskIndex: state.currentTaskIndex,
        progress: state.progress
      })
    }
  }, [enabled, saveInterval])

  // ==========================================================================
  // Restore State from Database
  // ==========================================================================

  const restoreState = useCallback(async (): Promise<PersistedTrainingState | null> => {
    if (!enabled) return null

    try {
      const result = await trainingSessionService.getState()

      if (!result.success) {
        console.warn('Failed to get training state:', result.error)
        return null
      }

      const { trainingState } = result.data

      if (trainingState) {
        console.log('📂 Restored training state:', {
          mode: trainingState.mode,
          phase: trainingState.phase,
          taskIndex: trainingState.currentTaskIndex,
          progress: trainingState.progress,
          lastUpdated: trainingState.lastUpdated
        })

        isRestoredRef.current = true
        onStateRestored?.(trainingState)
        return trainingState
      }

      return null
    } catch (error) {
      console.error('Error restoring training state:', error)
      return null
    }
  }, [enabled, onStateRestored])

  // ==========================================================================
  // Cleanup pending saves on unmount
  // ==========================================================================

  useEffect(() => {
    return () => {
      if (pendingSaveRef.current) {
        clearTimeout(pendingSaveRef.current)
      }
    }
  }, [])

  return {
    saveState,
    restoreState,
    isRestored: isRestoredRef.current
  }
}

export default useStatePersistence
