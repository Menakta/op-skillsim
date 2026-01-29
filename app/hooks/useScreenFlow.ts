'use client'

/**
 * Screen Flow Hook
 *
 * State machine for managing screen transitions in StreamingApp.
 * Replaces multiple boolean flags with a single, explicit state.
 *
 * Flow:
 * starter -> sessionSelection (if has active sessions)
 *         -> loading -> cinematic -> training
 *         -> loading -> training (if resuming)
 */

import { useState, useCallback, useMemo } from 'react'

// =============================================================================
// Types
// =============================================================================

export type ScreenState =
  | 'starter'           // Initial screen with Start button
  | 'sessionSelection'  // Choose to resume or start new session
  | 'loading'           // Connecting to stream
  | 'cinematic'         // Cinematic exploration mode
  | 'training'          // Active training mode

export interface UseScreenFlowReturn {
  // Current screen
  screen: ScreenState

  // Query helpers (for backward compatibility)
  showStarterScreen: boolean
  showSessionSelection: boolean
  showLoadingScreen: boolean
  isCinematicMode: boolean
  isTrainingMode: boolean
  streamStarted: boolean

  // Transitions
  goToSessionSelection: () => void
  goToLoading: () => void
  goToLoadingForCinematic: () => void
  goToLoadingForTraining: () => void
  goToCinematic: () => void
  goToTraining: () => void

  // For connection status
  setConnected: (isConnected: boolean) => void

  // Track intended destination after loading
  intendedDestination: 'cinematic' | 'training'
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useScreenFlow(): UseScreenFlowReturn {
  const [screen, setScreen] = useState<ScreenState>('starter')
  const [isConnected, setIsConnected] = useState(false)
  const [intendedDestination, setIntendedDestination] = useState<'cinematic' | 'training'>('cinematic')

  // ==========================================================================
  // Transitions
  // ==========================================================================

  const goToSessionSelection = useCallback(() => {
    setScreen('sessionSelection')
  }, [])

  const goToLoading = useCallback(() => {
    setScreen('loading')
  }, [])

  const goToLoadingForCinematic = useCallback(() => {
    setIntendedDestination('cinematic')
    setScreen('loading')
  }, [])

  const goToLoadingForTraining = useCallback(() => {
    setIntendedDestination('training')
    setScreen('loading')
  }, [])

  const goToCinematic = useCallback(() => {
    setScreen('cinematic')
  }, [])

  const goToTraining = useCallback(() => {
    setScreen('training')
  }, [])

  const setConnected = useCallback((connected: boolean) => {
    setIsConnected(connected)
    // Auto-transition from loading when connected
    if (connected && screen === 'loading') {
      setScreen(intendedDestination)
    }
  }, [screen, intendedDestination])

  // ==========================================================================
  // Computed values for backward compatibility
  // ==========================================================================

  const showStarterScreen = screen === 'starter'
  const showSessionSelection = screen === 'sessionSelection'
  const isCinematicMode = screen === 'cinematic'
  const isTrainingMode = screen === 'training'

  // streamStarted = user has initiated the connection (not on starter/sessionSelection)
  const streamStarted = screen === 'loading' || screen === 'cinematic' || screen === 'training'

  // showLoadingScreen = in loading state and not yet connected
  const showLoadingScreen = screen === 'loading' && !isConnected

  // ==========================================================================
  // Return
  // ==========================================================================

  return useMemo(() => ({
    screen,
    showStarterScreen,
    showSessionSelection,
    showLoadingScreen,
    isCinematicMode,
    isTrainingMode,
    streamStarted,
    intendedDestination,

    goToSessionSelection,
    goToLoading,
    goToLoadingForCinematic,
    goToLoadingForTraining,
    goToCinematic,
    goToTraining,
    setConnected,
  }), [
    screen,
    showStarterScreen,
    showSessionSelection,
    showLoadingScreen,
    isCinematicMode,
    isTrainingMode,
    streamStarted,
    intendedDestination,
    goToSessionSelection,
    goToLoading,
    goToLoadingForCinematic,
    goToLoadingForTraining,
    goToCinematic,
    goToTraining,
    setConnected,
  ])
}

export default useScreenFlow
