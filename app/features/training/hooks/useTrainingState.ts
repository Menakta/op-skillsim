'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import type { ParsedMessage } from '@/app/lib/messageTypes'
import { WEB_TO_UE_MESSAGES } from '@/app/lib/messageTypes'
import { TASK_SEQUENCE } from '@/app/config'
import type { UseMessageBusReturn } from '@/app/features/messaging/hooks/useMessageBus'
import { eventBus } from '@/app/lib/events'
import { trainingService, trainingSessionService } from '@/app/services'

// =============================================================================
// Training State Type
// =============================================================================

export interface TrainingStateData {
  mode: 'cinematic' | 'training'
  uiMode: 'normal' | 'waypoint' | 'task'
  progress: number
  taskName: string
  phase: string
  currentTaskIndex: number
  totalTasks: number
  isActive: boolean
  trainingStarted: boolean
  // Database session tracking
  dbSessionId: string | null
}

// =============================================================================
// Callbacks
// =============================================================================

export interface TrainingStateCallbacks {
  onTrainingProgress?: (data: {
    progress: number
    taskName: string
    phase: string
    currentTask: number
    totalTasks: number
    isActive: boolean
  }) => void
  onTrainingComplete?: (progress: number, currentTask: number, totalTasks: number) => void
  onTaskCompleted?: (taskId: string, nextTaskIndex: number) => void
  onTaskStart?: (toolName: string) => void
}

// =============================================================================
// Initial State
// =============================================================================

const initialState: TrainingStateData = {
  mode: 'cinematic',
  uiMode: 'normal',
  progress: 0,
  taskName: 'Not Started',
  phase: 'NotStarted',
  currentTaskIndex: 0,
  totalTasks: trainingService.getTotalTasks(),
  isActive: false,
  trainingStarted: false,
  dbSessionId: null
}

// =============================================================================
// Hook Return Type
// =============================================================================

export interface UseTrainingStateReturn {
  state: TrainingStateData
  startTraining: () => void
  startFromTask: (phaseIndex: number) => void
  pauseTraining: () => void
  resumeTraining: () => void
  resetTraining: () => void
  testConnection: () => void
  setMode: (mode: 'cinematic' | 'training') => void
  setUIMode: (uiMode: 'normal' | 'waypoint' | 'task') => void
  setPhase: (phase: string) => void
  setCurrentTaskIndex: (index: number) => void
  setTrainingStarted: (started: boolean) => void
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useTrainingState(
  messageBus: UseMessageBusReturn,
  callbacks: TrainingStateCallbacks = {}
): UseTrainingStateReturn {
  const [state, setState] = useState<TrainingStateData>(initialState)
  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks

  // Track time for periodic saves
  const sessionStartTimeRef = useRef<number | null>(null)
  const lastSaveTimeRef = useRef<number>(0)
  const lastProgressRef = useRef<number>(0)
  const lastPhaseRef = useRef<string>('0') // Track by index

  // ==========================================================================
  // Initialize/Resume Training Session from Database
  // ==========================================================================

  useEffect(() => {
    async function initSession() {
      const result = await trainingSessionService.getCurrentSession()
      if (result.success && result.data) {
        setState(prev => ({
          ...prev,
          dbSessionId: result.data!.id,
          progress: result.data!.overall_progress,
          phase: result.data!.current_training_phase,
        }))
        lastProgressRef.current = result.data.overall_progress
        lastPhaseRef.current = result.data.current_training_phase
      }
    }
    initSession()
  }, [])

  // ==========================================================================
  // Message Handler
  // ==========================================================================

  useEffect(() => {
    const unsubscribe = messageBus.onMessage((message: ParsedMessage) => {
      const { type, dataString } = message
      const parts = dataString.split(':')

      switch (type) {
        case 'training_progress': {
          const progress = parseFloat(parts[0]) || 0
          const taskName = parts[1] || 'Not Started'
          const phase = parts[2] || 'NotStarted'
          const currentTask = parseInt(parts[3]) || 0
          const totalTasks = parseInt(parts[4]) || 5
          const isActive = parts[5] === 'true'

          setState(prev => ({
            ...prev,
            progress,
            taskName,
            phase,
            currentTaskIndex: currentTask,
            totalTasks,
            isActive,
            mode: isActive ? 'training' : prev.mode,
            uiMode: isActive && prev.uiMode === 'normal' ? 'task' : prev.uiMode
          }))

          callbacksRef.current.onTrainingProgress?.({
            progress,
            taskName,
            phase,
            currentTask,
            totalTasks,
            isActive
          })

          // Save progress to database
          // Phase index changes are ALWAYS saved immediately (no throttle)
          // Progress changes are throttled (only if changed >= 5% and 5 seconds passed)
          const now = Date.now()
          const progressChanged = Math.abs(progress - lastProgressRef.current) >= 5
          // Track by currentTask index instead of phase name (more reliable from stream)
          const phaseIndexChanged = currentTask !== state.currentTaskIndex
          const timeSinceLastSave = now - lastSaveTimeRef.current

          // Always save on phase index change, or throttled progress change
          const shouldSavePhase = phaseIndexChanged
          const shouldSaveProgress = progressChanged && timeSinceLastSave > 5000

          if (shouldSavePhase || shouldSaveProgress) {
            lastProgressRef.current = progress
            lastPhaseRef.current = phase
            lastSaveTimeRef.current = now

            // Calculate time spent since session start
            const timeSpentMs = sessionStartTimeRef.current
              ? now - sessionStartTimeRef.current
              : 0

            // Store phase index as string (e.g., "0", "1", "2"...) instead of phase name
            // This is more reliable as UE5 sometimes sends "NotStarted" for intermediate phases
            const phaseIndex = String(currentTask)

            console.log(`📊 Saving training progress: phaseIndex=${phaseIndex}, phaseName=${phase}, progress=${progress}%`)

            trainingSessionService.updateProgress({
              phase: phaseIndex, // Store index as string
              progress,
              timeSpentMs,
            }).then(result => {
              if (!result.success) {
                console.warn('Failed to save training progress:', result.error)
              } else {
                console.log(`✅ Training progress saved: phaseIndex=${phaseIndex}`)
              }
            })
          }

          // Check for training completion using service
          if (trainingService.isTrainingComplete(currentTask) || progress >= 100) {
            console.log(`🎉 TRAINING COMPLETED! Tasks: ${currentTask}/${totalTasks}, Progress: ${progress}%`)
            callbacksRef.current.onTrainingComplete?.(progress, currentTask, totalTasks)
            // Emit event for other parts of the app
            eventBus.emit('training:completed', { totalTasks })

            // Complete training in database
            trainingSessionService.completeTraining({
              finalResults: {
                completedAt: new Date().toISOString(),
                totalTimeMs: sessionStartTimeRef.current
                  ? Date.now() - sessionStartTimeRef.current
                  : 0,
                phaseScores: [],
                quizPerformance: {
                  totalQuestions: 0,
                  correctFirstTry: 0,
                  totalAttempts: 0,
                  averageTimeMs: 0,
                },
                overallGrade: 'A',
              },
            })
          }

          // Emit progress update event
          eventBus.emit('training:progressUpdated', { progress, currentTask, totalTasks })
          break
        }

        case 'task_completed': {
          const taskId = parts[0] || ''
          console.log('=== TASK COMPLETED MESSAGE ===')
          console.log('Completed task ID:', taskId)

          // Get current state to calculate next index
          setState(prev => {
            const nextIndex = prev.currentTaskIndex + 1

            // Schedule callback to run after state update
            setTimeout(() => {
              console.log('📢 Calling onTaskCompleted callback with taskId:', taskId, 'nextIndex:', nextIndex)
              callbacksRef.current.onTaskCompleted?.(taskId, nextIndex)
            }, 0)

            if (trainingService.isTrainingComplete(nextIndex)) {
              return {
                ...prev,
                currentTaskIndex: nextIndex,
                phase: 'All Tasks Complete'
              }
            }

            return {
              ...prev,
              currentTaskIndex: nextIndex,
              phase: 'Tool Selection'
            }
          })
          break
        }

        case 'task_start': {
          const toolName = parts[0] || ''
          console.log('Task started:', toolName)
          setState(prev => ({ ...prev, phase: 'Task Active' }))
          callbacksRef.current.onTaskStart?.(toolName)
          break
        }
      }
    })

    return unsubscribe
  }, [messageBus])

  // ==========================================================================
  // Actions
  // ==========================================================================

  const startTraining = useCallback(async () => {
    console.log('Training started')

    // Start session timer
    sessionStartTimeRef.current = Date.now()

    // Start or get training session in database
    const result = await trainingSessionService.startSession({
      courseName: 'VR Pipe Training',
    })

    if (result.success && result.data) {
      setState(prev => ({
        ...prev,
        mode: 'training',
        uiMode: 'task',
        phase: 'Phase A',
        currentTaskIndex: 0,
        trainingStarted: false,
        dbSessionId: result.data!.id,
      }))
    } else {
      setState(prev => ({
        ...prev,
        mode: 'training',
        uiMode: 'task',
        phase: 'Phase A',
        currentTaskIndex: 0,
        trainingStarted: false,
      }))
    }

    messageBus.sendMessage(WEB_TO_UE_MESSAGES.TRAINING_CONTROL, 'start')
    // Emit event
    eventBus.emit('training:started', { taskIndex: 0 })
  }, [messageBus])

  const pauseTraining = useCallback(async () => {
    // Save time spent before pausing
    if (sessionStartTimeRef.current) {
      const timeSpentMs = Date.now() - sessionStartTimeRef.current
      await trainingSessionService.recordTimeSpent(timeSpentMs)
    }

    // Save current state (session remains 'active' - user can resume)
    setState(prev => ({ ...prev, isActive: false }))

    messageBus.sendMessage(WEB_TO_UE_MESSAGES.TRAINING_CONTROL, 'pause')
    eventBus.emit('training:paused', { taskIndex: state.currentTaskIndex })
  }, [messageBus, state.currentTaskIndex])

  const resumeTraining = useCallback(() => {
    console.log('▶️ Resuming training')
    setState(prev => ({ ...prev, isActive: true }))
    messageBus.sendMessage(WEB_TO_UE_MESSAGES.TRAINING_CONTROL, 'resume')
    eventBus.emit('training:resumed', { taskIndex: state.currentTaskIndex })
  }, [messageBus, state.currentTaskIndex])

  const resetTraining = useCallback(async () => {
    // Mark session as completed (training is being reset/ended)
    await trainingSessionService.updateStatus('completed')

    // Reset timer
    sessionStartTimeRef.current = null
    lastSaveTimeRef.current = 0
    lastProgressRef.current = 0
    lastPhaseRef.current = 'NotStarted'

    messageBus.sendMessage(WEB_TO_UE_MESSAGES.TRAINING_CONTROL, 'reset')
    setState(initialState)
  }, [messageBus])

  const testConnection = useCallback(() => {
    messageBus.sendMessage(WEB_TO_UE_MESSAGES.TRAINING_CONTROL, 'test')
  }, [messageBus])

  /**
   * Resume training from a specific phase/task index
   * Used when student returns to continue a previous session
   */
  const startFromTask = useCallback(async (phaseIndex: number) => {
    console.log(`🔄 Resuming training from phase ${phaseIndex}`)

    // Start session timer
    sessionStartTimeRef.current = Date.now()

    setState(prev => ({
      ...prev,
      mode: 'training',
      uiMode: 'task',
      currentTaskIndex: phaseIndex,
      trainingStarted: false,
    }))

    // Send start_from_task message to UE5 to jump to the correct phase
    messageBus.sendMessage(WEB_TO_UE_MESSAGES.START_FROM_TASK, String(phaseIndex))

    // Emit event
    eventBus.emit('training:resumed', { taskIndex: phaseIndex })
  }, [messageBus])

  // State setters
  const setMode = useCallback((mode: 'cinematic' | 'training') => {
    setState(prev => ({ ...prev, mode }))
  }, [])

  const setUIMode = useCallback((uiMode: 'normal' | 'waypoint' | 'task') => {
    setState(prev => ({ ...prev, uiMode }))
  }, [])

  const setPhase = useCallback((phase: string) => {
    setState(prev => ({ ...prev, phase }))
  }, [])

  const setCurrentTaskIndex = useCallback((currentTaskIndex: number) => {
    setState(prev => ({ ...prev, currentTaskIndex }))
  }, [])

  const setTrainingStarted = useCallback((trainingStarted: boolean) => {
    setState(prev => ({ ...prev, trainingStarted }))
  }, [])

  return {
    state,
    startTraining,
    startFromTask,
    pauseTraining,
    resumeTraining,
    resetTraining,
    testConnection,
    setMode,
    setUIMode,
    setPhase,
    setCurrentTaskIndex,
    setTrainingStarted
  }
}

export default useTrainingState
