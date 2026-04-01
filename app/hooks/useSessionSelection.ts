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
import { trainingSessionService } from '../services'
import type { ActiveSession } from '../features'
import type { RestoredStateData } from '../features/training'
import { TASK_SEQUENCE } from '../config'

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert a phase value to numeric index
 * Handles both numeric strings ("0", "3") and task IDs ("PIPE_CONNECTION_MAIN")
 */
function getPhaseIndex(phaseValue: string | number | undefined | null): number {
  if (phaseValue === undefined || phaseValue === null) return 0
  if (typeof phaseValue === 'number') return phaseValue

  // Try to parse as numeric string first
  const numericIndex = parseInt(phaseValue, 10)
  if (!isNaN(numericIndex)) return numericIndex

  // Otherwise, try to match by taskId
  const taskIndex = TASK_SEQUENCE.findIndex(task => task.taskId === phaseValue)
  return taskIndex >= 0 ? taskIndex : 0
}

// =============================================================================
// Types
// =============================================================================

export interface SessionSelectionConfig {
  isLtiSession: boolean
  userRole: 'student' | 'teacher' | 'admin'
  /** Whether stream is connected (works with both PureWeb and Interlucent) */
  isConnected: boolean
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
  const { isLtiSession, userRole, isConnected } = config
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
    // For non-student users (teachers/admins), skip session selection - they don't need to resume
    if (userRole !== 'student') {
      goToLoadingForCinematic()
      return
    }

    // Check for active sessions for ALL students (both LTI and standalone)
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
  }, [userRole, goToLoadingForCinematic, goToSessionSelection])

  // ==========================================================================
  // Session Resume Effect - Handles what happens after stream connects
  // ==========================================================================

  useEffect(() => {
    if (!isConnected) return

    // Case 1: User selected a session to resume
    if (selectedSession) {
      if (hasResumedSessionRef.current === selectedSession.id) {
        console.log('📂 Already showed resume modal for this session, skipping')
        return
      }

      // Use getPhaseIndex to handle both numeric strings ("3") and task IDs ("PIPE_CONNECTION_MAIN")
      const phaseIndex = getPhaseIndex(selectedSession.current_training_phase)
      console.log(`📂 Stream connected - showing resume confirmation for phase ${phaseIndex}`)
      console.log(`📂 Session data: phase="${selectedSession.current_training_phase}" -> index=${phaseIndex}`)
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

    // Case 3: Non-student users (teachers/admins don't have session resume)
    if (userRole !== 'student') {
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

        // Calculate phase index - prefer taskIndexToRestore, then parse phaseToRestore
        // phaseToRestore can be a numeric string ("3") or a task ID ("PIPE_CONNECTION_MAIN")
        const phaseIndex = taskIndexToRestore ?? getPhaseIndex(phaseToRestore)

        const shouldResumeTraining = modeToRestore === 'training' ||
          (phaseIndex > 0) ||
          (overallProgress && overallProgress > 0)

        if (shouldResumeTraining) {
          goToTraining()
          onEnterTrainingMode()

          if (phaseToRestore) {
            setTrainingPhase(phaseToRestore)
          }
          if (phaseIndex > 0) {
            setCurrentTaskIndex(phaseIndex)
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
    isConnected,
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
      console.log(`🚀 User clicked resume - phaseIndex=${phaseIndex}`)
      console.log(`🚀 Will call: ${phaseIndex > 0 ? `startFromTask(${phaseIndex})` : 'startTraining()'}`)
      phaseIndex > 0 ? startFromTask(phaseIndex) : startTraining()
    },

    skipToTraining: async (options?: { delayTrainingStart?: boolean }) => {
      const { delayTrainingStart = false } = options || {}
      console.log('⏭️ Skipping to training mode', delayTrainingStart ? '(delaying training start for walkthrough)' : '- starting from phase 0')
      goToTraining()
      onEnterTrainingMode()

      // Create new training session for all students (both LTI and standalone)
      if (userRole === 'student' && startNewSessionAfterStream) {
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
