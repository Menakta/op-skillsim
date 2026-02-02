'use client'

/**
 * Session Selection Hook
 *
 * Manages session selection flow for StreamingApp:
 * - Checks for active sessions on start
 * - Handles session resume vs new session
 * - Manages session selection state
 * - Handles session resume after stream connects
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { StreamerStatus } from '@pureweb/platform-sdk'
import { trainingSessionService } from '../services'
import type { ActiveSession } from '../features'
import type { RestoredStateData } from '../features/training'

// =============================================================================
// Types
// =============================================================================

export interface SessionSelectionConfig {
  isLtiSession: boolean
  userRole: 'student' | 'teacher' | 'admin'
  streamerStatus: StreamerStatus
}

export interface SessionSelectionCallbacks {
  // Screen flow transitions
  goToLoadingForCinematic: () => void
  goToLoadingForTraining: () => void
  goToSessionSelection: () => void
  goToTraining: () => void
  goToCinematic: () => void

  // Modal interactions
  openResumeConfirmation: (phaseIndex: number) => void
  closeNavigationWalkthrough: () => void

  // Training control
  setTrainingPhase: (phase: string) => void
  setCurrentTaskIndex: (index: number) => void
  startTraining: () => void
  startFromTask: (phaseIndex: number) => void

  // State persistence
  restoreState: () => Promise<RestoredStateData | null>
  /** Restore quiz answers from database when resuming session */
  restoreQuizAnswers: () => Promise<boolean>

  // External state setters
  onEnterTrainingMode: () => void
  onEnterCinematicMode: (timeRemaining?: number | null) => void
  onStateRestoreAttempted: () => void
}

export interface UseSessionSelectionReturn {
  // State
  activeSessions: ActiveSession[]
  sessionsLoading: boolean
  selectedSession: ActiveSession | null
  startNewSessionAfterStream: boolean

  // Actions
  handleStartStream: () => Promise<void>
  actions: {
    resume: (session: ActiveSession) => Promise<void>
    startNew: () => void
    confirmResume: (phaseIndex: number) => void
    /** Skip to training mode. If delayTrainingStart is true, don't send start command to UE5 */
    skipToTraining: (options?: { delayTrainingStart?: boolean }) => Promise<void>
  }

  // For session resume effect - marks session as handled
  markSessionHandled: (sessionId: string) => void
  isSessionHandled: (sessionId: string) => boolean
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useSessionSelection(
  config: SessionSelectionConfig,
  callbacks: SessionSelectionCallbacks
): UseSessionSelectionReturn {
  const { isLtiSession, userRole, streamerStatus } = config
  const {
    goToLoadingForCinematic,
    goToLoadingForTraining,
    goToSessionSelection,
    goToTraining,
    goToCinematic,
    openResumeConfirmation,
    closeNavigationWalkthrough,
    setTrainingPhase,
    setCurrentTaskIndex,
    startTraining,
    startFromTask,
    restoreState,
    restoreQuizAnswers,
    onEnterTrainingMode,
    onEnterCinematicMode,
    onStateRestoreAttempted,
  } = callbacks

  // ==========================================================================
  // State
  // ==========================================================================

  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [selectedSession, setSelectedSession] = useState<ActiveSession | null>(null)
  const [startNewSessionAfterStream, setStartNewSessionAfterStream] = useState(false)

  // Track if we've handled resume for a specific session
  const hasResumedSessionRef = useRef<string | null>(null)
  // Track if state restore has been attempted
  const hasAttemptedRestoreRef = useRef(false)

  // ==========================================================================
  // Handle Start Stream - Check for active sessions
  // ==========================================================================

  const handleStartStream = useCallback(async () => {
    // For non-LTI or non-student users, skip session selection
    if (!isLtiSession || userRole !== 'student') {
      goToLoadingForCinematic()
      return
    }

    // Check for active sessions
    setSessionsLoading(true)
    try {
      const result = await trainingSessionService.getActiveSessions()
      if (result.success && result.data.length > 0) {
        // Has active sessions - show session selection screen
        setActiveSessions(result.data as ActiveSession[])
        goToSessionSelection()
      } else {
        // No active sessions - proceed to cinematic mode
        console.log('🆕 No active sessions found - proceeding to cinematic mode')
        setStartNewSessionAfterStream(true)
        goToLoadingForCinematic()
      }
    } catch (error) {
      console.error('Failed to check active sessions:', error)
      // On error, proceed to cinematic mode
      goToLoadingForCinematic()
    }
    setSessionsLoading(false)
  }, [isLtiSession, userRole, goToLoadingForCinematic, goToSessionSelection])

  // ==========================================================================
  // Session Resume Effect - Handles what happens after stream connects
  // ==========================================================================

  useEffect(() => {
    if (streamerStatus !== StreamerStatus.Connected) return

    // Case 1: User selected a session to resume
    if (selectedSession) {
      if (hasResumedSessionRef.current === selectedSession.id) {
        console.log('📂 Already showed resume modal for this session, skipping')
        return
      }

      const phaseIndex = parseInt(selectedSession.current_training_phase, 10) || 0
      console.log(`📂 Stream connected - showing resume confirmation for phase ${phaseIndex}`)
      console.log(`📂 Session ID: ${selectedSession.id}`)

      // Mark this session as handled
      hasResumedSessionRef.current = selectedSession.id
      onStateRestoreAttempted()

      // Restore quiz answers from database
      console.log('📂 Restoring quiz answers from database...')
      restoreQuizAnswers().then(restored => {
        if (restored) {
          console.log('✅ Quiz answers restored successfully')
        } else {
          console.warn('⚠️ Failed to restore quiz answers')
        }
      })

      // Set training state
      setTrainingPhase(selectedSession.current_training_phase)
      setCurrentTaskIndex(phaseIndex)
      goToTraining()
      onEnterTrainingMode()

      // Show the resume confirmation modal
      openResumeConfirmation(phaseIndex)
      closeNavigationWalkthrough()
      return
    }

    // Case 2: Starting a new session (cinematic mode)
    if (startNewSessionAfterStream) {
      console.log('🆕 New session - cinematic mode active, waiting for user to skip to training')
      onStateRestoreAttempted()
      closeNavigationWalkthrough()
      return
    }

    // Case 3: Non-student or non-LTI users
    if (!isLtiSession || userRole !== 'student') {
      onStateRestoreAttempted()
      return
    }

    // Case 4: Legacy behavior - Check for saved training state
    if (hasAttemptedRestoreRef.current) return

    const restoreSession = async () => {
      console.log('📂 Checking for saved training state (legacy)...')
      hasAttemptedRestoreRef.current = true
      onStateRestoreAttempted()

      const restoredData = await restoreState()
      if (restoredData) {
        const { trainingState, currentTrainingPhase, overallProgress } = restoredData
        console.log('📂 Restoring training session (legacy):', {
          currentTrainingPhase,
          overallProgress,
          hasTrainingState: !!trainingState,
        })

        const phaseToRestore = currentTrainingPhase || trainingState?.phase
        const taskIndexToRestore = trainingState?.currentTaskIndex
        const modeToRestore = trainingState?.mode || 'training'

        const shouldResumeTraining = modeToRestore === 'training' ||
          (phaseToRestore && phaseToRestore !== '0') ||
          (overallProgress && overallProgress > 0)

        if (shouldResumeTraining) {
          goToTraining()
          onEnterTrainingMode()

          const phaseIndex = parseInt(phaseToRestore || '0', 10)
          if (phaseToRestore) {
            setTrainingPhase(phaseToRestore)
          }
          if (taskIndexToRestore !== undefined && taskIndexToRestore > 0) {
            setCurrentTaskIndex(taskIndexToRestore)
          }
          if (phaseIndex > 0) {
            console.log(`🔄 Resuming training from phase ${phaseIndex}`)
            startFromTask(phaseIndex)
          } else {
            startTraining()
          }
          console.log('📂 Training resumed:', {
            phase: phaseToRestore,
            phaseIndex,
            taskIndex: taskIndexToRestore,
            progress: overallProgress
          })
        } else if (trainingState?.mode === 'cinematic') {
          goToCinematic()
          onEnterCinematicMode(trainingState.cinematicTimeRemaining)
        }

        closeNavigationWalkthrough()
      }
    }

    // Give a small delay for connection to stabilize
    const timer = setTimeout(restoreSession, 2000)
    return () => clearTimeout(timer)
  }, [
    streamerStatus,
    isLtiSession,
    userRole,
    selectedSession,
    startNewSessionAfterStream,
    goToTraining,
    goToCinematic,
    openResumeConfirmation,
    closeNavigationWalkthrough,
    setTrainingPhase,
    setCurrentTaskIndex,
    startTraining,
    startFromTask,
    restoreState,
    restoreQuizAnswers,
    onEnterTrainingMode,
    onEnterCinematicMode,
    onStateRestoreAttempted,
  ])

  // ==========================================================================
  // Session Actions
  // ==========================================================================

  const actions = useMemo(() => ({
    resume: async (session: ActiveSession) => {
      console.log('📂 Resuming session:', session.id, 'at phase:', session.current_training_phase)
      setSessionsLoading(true)
      try {
        const result = await trainingSessionService.resumeSession(session.id)
        if (!result.success) console.error('Failed to resume session:', result.error)
      } catch (error) {
        console.error('Error resuming session:', error)
      }
      setSelectedSession(session)
      goToLoadingForTraining()
      setSessionsLoading(false)
    },

    startNew: () => {
      console.log('🆕 Starting new training session - cinematic mode first')
      setSelectedSession(null)
      setStartNewSessionAfterStream(true)
      goToLoadingForCinematic()
    },

    confirmResume: (phaseIndex: number) => {
      console.log(`🚀 User clicked resume - sending start_from_task:${phaseIndex} to UE5`)
      phaseIndex > 0 ? startFromTask(phaseIndex) : startTraining()
    },

    skipToTraining: async (options?: { delayTrainingStart?: boolean }) => {
      const { delayTrainingStart = false } = options || {}
      console.log('⏭️ Skipping to training mode', delayTrainingStart ? '(delaying training start for walkthrough)' : '- starting from phase 0')
      goToTraining()
      onEnterTrainingMode()

      if (isLtiSession && userRole === 'student' && startNewSessionAfterStream) {
        console.log('🆕 Creating new training session before starting training')
        try {
          const result = await trainingSessionService.createNewSession()
          if (result.success) console.log('✅ Training session created:', result.data?.id)
          else console.error('Failed to create training session:', result.error)
        } catch (error) {
          console.error('Error creating training session:', error)
        }
      }

      // Only start training immediately if not delayed (for walkthrough)
      if (!delayTrainingStart) {
        startTraining()
      }
    },
  }), [
    goToLoadingForTraining,
    goToLoadingForCinematic,
    goToTraining,
    startTraining,
    startFromTask,
    onEnterTrainingMode,
    isLtiSession,
    userRole,
    startNewSessionAfterStream,
  ])

  // ==========================================================================
  // Utility functions for external tracking
  // ==========================================================================

  const markSessionHandled = useCallback((sessionId: string) => {
    hasResumedSessionRef.current = sessionId
  }, [])

  const isSessionHandled = useCallback((sessionId: string) => {
    return hasResumedSessionRef.current === sessionId
  }, [])

  // ==========================================================================
  // Return
  // ==========================================================================

  return useMemo(() => ({
    // State
    activeSessions,
    sessionsLoading,
    selectedSession,
    startNewSessionAfterStream,

    // Actions
    handleStartStream,
    actions,

    // Utility
    markSessionHandled,
    isSessionHandled,
  }), [
    activeSessions,
    sessionsLoading,
    selectedSession,
    startNewSessionAfterStream,
    handleStartStream,
    actions,
    markSessionHandled,
    isSessionHandled,
  ])
}

export default useSessionSelection
