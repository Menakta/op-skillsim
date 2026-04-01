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
  onTaskCompleted?: (taskId: string, nextTaskIndex: number, completedTaskIndex: number) => void
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

          // Use setState to get the LATEST state value (avoids stale closure)
          setState(prev => {
            // training_progress has already updated currentTaskIndex to the NEXT task
            // So the completed task is currentTaskIndex - 1
            const completedTaskIndex = prev.currentTaskIndex > 0 ? prev.currentTaskIndex - 1 : 0
            const nextIndex = prev.currentTaskIndex

            console.log('📢 Completed task index:', completedTaskIndex, 'Next index:', nextIndex, 'Current state index:', prev.currentTaskIndex)

            // Call callback with correct indices
            setTimeout(() => {
              callbacksRef.current.onTaskCompleted?.(taskId, nextIndex, completedTaskIndex)
            }, 0)

            // Update phase display
            if (trainingService.isTrainingComplete(nextIndex)) {
              return {
                ...prev,
                phase: 'All Tasks Complete'
              }
            }

            return {
              ...prev,
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
    console.log('🚀 ========== startTraining() CALLED ==========')

    // ==========================================================================
    // SCENE RESET: Ensure scene is in default state before training starts
    // This fixes P1-09/P1-12: Scene not reset when training starts
    // ==========================================================================

    // 1. Reset explosion to 0% (assembled state) - try both formats for compatibility
    console.log('🔧 Resetting scene state before training...')
    console.log('📤 Sending explosion_control:assemble')
    messageBus.sendMessage(WEB_TO_UE_MESSAGES.EXPLOSION_CONTROL, 'assemble')

    // Also send numeric 0 for compatibility
    console.log('📤 Sending explosion_control:0')
    messageBus.sendMessage(WEB_TO_UE_MESSAGES.EXPLOSION_CONTROL, '0')

    // 2. Reset camera to default perspective
    console.log('📤 Sending camera_control:reset')
    messageBus.sendMessage(WEB_TO_UE_MESSAGES.CAMERA_CONTROL, 'reset')

    // 3. Reset layers to show all (default visibility)
    console.log('📤 Sending hierarchical_control:show_all')
    messageBus.sendMessage(WEB_TO_UE_MESSAGES.HIERARCHICAL_CONTROL, 'show_all')

    // 4. Small delay to ensure UE5 processes resets before starting training
    await new Promise(resolve => setTimeout(resolve, 200))

    // ==========================================================================
    // Continue with normal training start flow
    // ==========================================================================

    // Start session timer
    sessionStartTimeRef.current = Date.now()

    // Start or get training session in database
    const result = await trainingSessionService.startSession({
      courseName: 'OP-Skillsim Plumbing Training',
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

  const pauseTraining = useCallback(() => {
    console.log('⏸️ Pausing training - sending pause command to UE5')

    // Send pause message to UE5 IMMEDIATELY (don't wait for async operations)
    messageBus.sendMessage(WEB_TO_UE_MESSAGES.TRAINING_CONTROL, 'pause')

    // Update local state
    setState(prev => ({ ...prev, isActive: false }))
    eventBus.emit('training:paused', { taskIndex: state.currentTaskIndex })

    // Save time spent asynchronously (non-blocking)
    if (sessionStartTimeRef.current) {
      const timeSpentMs = Date.now() - sessionStartTimeRef.current
      trainingSessionService.recordTimeSpent(timeSpentMs).catch(err => {
        console.warn('Failed to record time spent on pause:', err)
      })
    }
  }, [messageBus, state.currentTaskIndex])

  const resumeTraining = useCallback(() => {
    console.log('▶️ Resuming training - sending resume command to UE5')

    // Send resume message to UE5 IMMEDIATELY
    messageBus.sendMessage(WEB_TO_UE_MESSAGES.TRAINING_CONTROL, 'resume')

    // Get the tool for the current phase
    const taskInfo = TASK_SEQUENCE[state.currentTaskIndex]
    const toolForPhase = taskInfo?.tool || 'None'

    // Update local state
    setState(prev => ({ ...prev, isActive: true }))
    eventBus.emit('training:resumed', { taskIndex: state.currentTaskIndex, tool: toolForPhase })
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
    console.log(`🔄 [startFromTask] CALLED with phaseIndex=${phaseIndex}`)

    // Get the task info for this phase to determine the correct tool
    const taskInfo = TASK_SEQUENCE[phaseIndex]
    const toolForPhase = taskInfo?.tool || 'None'
    const taskName = taskInfo?.name || 'Unknown Task'

    console.log(`🔧 [startFromTask] Phase ${phaseIndex} requires tool: ${toolForPhase}, taskName: ${taskName}`)

    // Start session timer
    sessionStartTimeRef.current = Date.now()

    setState(prev => ({
      ...prev,
      mode: 'training',
      uiMode: 'task',
      currentTaskIndex: phaseIndex,
      taskName: taskName,
      trainingStarted: true, // Set to true so tools are enabled
    }))

    // Send start_from_task message to UE5 to jump to the correct phase
    console.log(`📤 [startFromTask] Sending START_FROM_TASK message with phaseIndex=${phaseIndex}`)
    messageBus.sendMessage(WEB_TO_UE_MESSAGES.START_FROM_TASK, String(phaseIndex))

    // Emit event with tool info
    console.log(`📢 [startFromTask] Emitting training:resumed event with taskIndex=${phaseIndex}, tool=${toolForPhase}`)
    eventBus.emit('training:resumed', { taskIndex: phaseIndex, tool: toolForPhase })
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

  // ==========================================================================
  // Proactive Token Refresh During Active Training
  // Fixes P0-01: Session drops during training
  // Refreshes the session token every 30 minutes while training is active
  // ==========================================================================

  useEffect(() => {
    if (!state.isActive && state.mode !== 'training') {
      return // Only refresh during active training
    }

    const refreshToken = async () => {
      try {
        const response = await fetch('/api/auth/session/refresh', {
          method: 'POST',
          credentials: 'include',
        })

        if (response.ok) {
          const data = await response.json()
          if (data.refreshed) {
            console.log('🔄 Session token refreshed during training')
          }
        } else {
          console.warn('⚠️ Failed to refresh session token:', response.status)
        }
      } catch (error) {
        console.warn('⚠️ Error refreshing session token:', error)
      }
    }

    // Refresh every 30 minutes during active training
    const refreshInterval = setInterval(refreshToken, 30 * 60 * 1000)

    // Also refresh immediately when training becomes active
    refreshToken()

    return () => clearInterval(refreshInterval)
  }, [state.isActive, state.mode])

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
