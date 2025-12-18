'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import type { ParsedMessage } from '@/app/lib/messageTypes'
import { TASK_SEQUENCE, WEB_TO_UE_MESSAGES } from '@/app/lib/messageTypes'
import type { UseMessageBusReturn } from '@/app/features/messaging/hooks/useMessageBus'

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
  totalTasks: TASK_SEQUENCE.length,
  isActive: false,
  trainingStarted: false
}

// =============================================================================
// Hook Return Type
// =============================================================================

export interface UseTrainingStateReturn {
  state: TrainingStateData
  startTraining: () => void
  pauseTraining: () => void
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

          // Check for training completion
          if (currentTask >= totalTasks || progress >= 100) {
            console.log(`🎉 TRAINING COMPLETED! Tasks: ${currentTask}/${totalTasks}, Progress: ${progress}%`)
            callbacksRef.current.onTrainingComplete?.(progress, currentTask, totalTasks)
          }
          break
        }

        case 'task_completed': {
          const taskId = parts[0] || ''
          console.log('=== TASK COMPLETED MESSAGE ===')
          console.log('Completed task ID:', taskId)

          setState(prev => {
            const nextIndex = prev.currentTaskIndex + 1

            // Call callback with next task index for auto-advance
            callbacksRef.current.onTaskCompleted?.(taskId, nextIndex)

            if (nextIndex >= TASK_SEQUENCE.length) {
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

  const startTraining = useCallback(() => {
    console.log('Training started')
    setState(prev => ({
      ...prev,
      mode: 'training',
      uiMode: 'task',
      phase: 'Tool Selection',
      currentTaskIndex: 0,
      trainingStarted: false
    }))
    messageBus.sendMessage(WEB_TO_UE_MESSAGES.TRAINING_CONTROL, 'start')
  }, [messageBus])

  const pauseTraining = useCallback(() => {
    messageBus.sendMessage(WEB_TO_UE_MESSAGES.TRAINING_CONTROL, 'pause')
  }, [messageBus])

  const resetTraining = useCallback(() => {
    messageBus.sendMessage(WEB_TO_UE_MESSAGES.TRAINING_CONTROL, 'reset')
    setState(initialState)
  }, [messageBus])

  const testConnection = useCallback(() => {
    messageBus.sendMessage(WEB_TO_UE_MESSAGES.TRAINING_CONTROL, 'test')
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
    pauseTraining,
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
