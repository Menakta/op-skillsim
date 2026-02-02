'use client'

/**
 * Training Persistence Hook
 *
 * Manages training state persistence for StreamingApp:
 * - Auto-saves training state on changes (for LTI students)
 * - Submits quiz results when training completes
 * - Completes training session in database
 * - Tracks cinematic timer for persistence
 */

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { StreamerStatus } from '@pureweb/platform-sdk'
import { useStatePersistence } from '../features/training'
import { trainingSessionService } from '../services'
import { buildQuestionDataMap } from '../types'
import type { PersistedTrainingState, QuizAnswerState } from '../types'
import type { TrainingState } from './useTrainingMessagesComposite'

// =============================================================================
// Types
// =============================================================================

export interface TrainingPersistenceConfig {
  /** Whether persistence is enabled (LTI students only) */
  enabled: boolean
  /** User role */
  userRole: 'student' | 'teacher' | 'admin'
  /** Stream connection status */
  streamerStatus: StreamerStatus
  /** Whether training is complete (modal open) */
  isTrainingComplete: boolean
  /** Whether in cinematic mode */
  isCinematicMode: boolean
  /** Session start time for duration tracking */
  sessionStartTime: number
  /** Total question count */
  questionCount: number
}

export interface TrainingStateForPersistence {
  uiMode: TrainingState['uiMode']
  currentTaskIndex: number
  taskName: string
  phase: string
  progress: number
  selectedTool: string | null
  selectedPipe: string | null
  airPlugSelected: boolean
  cameraMode: string
  cameraPerspective: string
  explosionValue: number
  totalTasks: number
}

export interface QuizDataForPersistence {
  quizAnswers: QuizAnswerState[]
  submitQuizResults: (questionCount: number) => Promise<boolean>
}

export interface UseTrainingPersistenceReturn {
  /** Current cinematic time remaining (for UI display) */
  cinematicTimeRemaining: number | null
  /** Set cinematic time remaining */
  setCinematicTimeRemaining: (time: number | null) => void
  /** Whether state restore has been attempted */
  hasRestoredState: boolean
  /** Mark state as restored (called by session selection) */
  markStateRestored: () => void
  /** Restored state data (if any) */
  restoredState: PersistedTrainingState | null
  /** State persistence hook instance (for restoreState) */
  statePersistence: ReturnType<typeof useStatePersistence>
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useTrainingPersistence(
  config: TrainingPersistenceConfig,
  trainingState: TrainingStateForPersistence,
  quizData: QuizDataForPersistence
): UseTrainingPersistenceReturn {
  const {
    enabled,
    userRole,
    streamerStatus,
    isTrainingComplete,
    isCinematicMode,
    sessionStartTime,
    questionCount,
  } = config

  // ==========================================================================
  // State
  // ==========================================================================

  const [restoredState, setRestoredState] = useState<PersistedTrainingState | null>(null)
  const [cinematicTimeRemaining, setCinematicTimeRemaining] = useState<number | null>(null)
  const hasRestoredStateRef = useRef(false)

  // ==========================================================================
  // State Persistence Hook
  // ==========================================================================

  const statePersistence = useStatePersistence({
    enabled,
    saveInterval: 5000,
    onStateRestored: (state) => {
      console.log('📂 State restored callback:', state)
      setRestoredState(state)
    }
  })

  // ==========================================================================
  // Auto-Save State on Changes
  // ==========================================================================

  useEffect(() => {
    if (streamerStatus !== StreamerStatus.Connected) return
    if (!enabled) return
    // Don't auto-save until we've attempted to restore state
    // This prevents overwriting saved state with initial "Phase A" on mount
    if (!hasRestoredStateRef.current) return

    // Save current state
    statePersistence.saveState({
      mode: isCinematicMode ? 'cinematic' : 'training',
      uiMode: trainingState.uiMode,
      currentTaskIndex: trainingState.currentTaskIndex,
      taskName: trainingState.taskName,
      phase: trainingState.phase,
      progress: trainingState.progress,
      selectedTool: trainingState.selectedTool,
      selectedPipe: trainingState.selectedPipe,
      airPlugSelected: trainingState.airPlugSelected,
      cameraMode: trainingState.cameraMode,
      cameraPerspective: trainingState.cameraPerspective,
      explosionLevel: trainingState.explosionValue,
      cinematicTimeRemaining: cinematicTimeRemaining
    })
  }, [
    streamerStatus,
    enabled,
    isCinematicMode,
    trainingState.uiMode,
    trainingState.currentTaskIndex,
    trainingState.taskName,
    trainingState.phase,
    trainingState.progress,
    trainingState.selectedTool,
    trainingState.selectedPipe,
    trainingState.airPlugSelected,
    trainingState.cameraMode,
    trainingState.cameraPerspective,
    trainingState.explosionValue,
    cinematicTimeRemaining,
    statePersistence
  ])

  // ==========================================================================
  // Submit Quiz Results when training completes (students only)
  // ==========================================================================

  useEffect(() => {
    // Skip saving progress for admin/teacher - they are just testing
    if (userRole !== 'student') {
      if (isTrainingComplete) {
        console.log('📝 [useTrainingPersistence] Skipping progress save for', userRole, '(test mode)')
      }
      return
    }

    console.log('📝 [useTrainingPersistence] Quiz submit effect triggered:', {
      isTrainingComplete,
      quizAnswersLength: quizData.quizAnswers.length,
      questionCount
    })

    if (isTrainingComplete) {
      // Submit quiz results to quiz_responses table
      if (quizData.quizAnswers.length > 0) {
        console.log('📝 [useTrainingPersistence] Submitting quiz results...')
        quizData.submitQuizResults(questionCount).then(saved => {
          if (saved) {
            console.log('✅ [useTrainingPersistence] Quiz results saved to Supabase')
          } else {
            console.warn('⚠️ [useTrainingPersistence] Failed to save quiz results')
          }
        })
      }

      // Also complete training session with all data
      const quizDataMap = quizData.quizAnswers.length > 0
        ? buildQuestionDataMap(quizData.quizAnswers)
        : undefined

      // phasesCompleted = currentTaskIndex + 1 (since index is 0-based)
      // When training completes, currentTaskIndex should be at the last completed phase
      const phasesCompleted = trainingState.currentTaskIndex + 1

      console.log('📊 [useTrainingPersistence] Completing training with:', {
        phasesCompleted,
        currentTaskIndex: trainingState.currentTaskIndex,
        totalTasks: trainingState.totalTasks,
      })

      trainingSessionService.completeTraining({
        totalTimeMs: Date.now() - sessionStartTime,
        phasesCompleted,
        quizData: quizDataMap,
        totalQuestions: questionCount,
      }).then(result => {
        if (result.success) {
          console.log('✅ [useTrainingPersistence] Training session completed in database')
        } else {
          console.warn('⚠️ [useTrainingPersistence] Failed to complete training session:', result.error)
        }
      })
    }
  }, [isTrainingComplete, quizData.quizAnswers.length, questionCount, quizData, sessionStartTime, userRole, trainingState.currentTaskIndex, trainingState.totalTasks])

  // ==========================================================================
  // Utility functions
  // ==========================================================================

  const markStateRestored = useCallback(() => {
    hasRestoredStateRef.current = true
  }, [])

  // ==========================================================================
  // Return
  // ==========================================================================

  return useMemo(() => ({
    cinematicTimeRemaining,
    setCinematicTimeRemaining,
    hasRestoredState: hasRestoredStateRef.current,
    markStateRestored,
    restoredState,
    statePersistence,
  }), [
    cinematicTimeRemaining,
    markStateRestored,
    restoredState,
    statePersistence,
  ])
}

export default useTrainingPersistence
