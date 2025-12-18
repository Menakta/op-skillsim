'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import type { ParsedMessage, ToolName, PipeType } from '@/app/lib/messageTypes'
import { TASK_SEQUENCE, WEB_TO_UE_MESSAGES } from '@/app/lib/messageTypes'
import type { UseMessageBusReturn } from '@/app/features/messaging/hooks/useMessageBus'

// =============================================================================
// Tool State Type
// =============================================================================

export interface ToolStateData {
  currentTool: ToolName
  selectedTool: ToolName | null
  selectedPipe: PipeType | null
  airPlugSelected: boolean  // Track if air plug was selected for pressure test
}

// =============================================================================
// Callbacks
// =============================================================================

export interface ToolSelectionCallbacks {
  onToolChange?: (toolName: ToolName) => void
  onAutoAdvance?: (nextTool: ToolName, nextTaskIndex: number) => void
}

// =============================================================================
// Initial State
// =============================================================================

const initialState: ToolStateData = {
  currentTool: 'None',
  selectedTool: null,
  selectedPipe: null,
  airPlugSelected: false
}

// =============================================================================
// Hook Return Type
// =============================================================================

export interface UseToolSelectionReturn {
  state: ToolStateData
  selectTool: (tool: ToolName, currentTaskIndex: number, onTrainingStart?: () => void) => boolean
  selectPipe: (pipe: PipeType) => void
  selectPressureTest: (testType: 'air-plug' | 'conduct-test') => void
  resetToolState: () => void
  autoAdvanceToNextTask: (nextTaskIndex: number) => void
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useToolSelection(
  messageBus: UseMessageBusReturn,
  callbacks: ToolSelectionCallbacks = {}
): UseToolSelectionReturn {
  const [state, setState] = useState<ToolStateData>(initialState)
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
        case 'tool_change': {
          const toolName = (parts[0] as ToolName) || 'None'
          console.log('Tool change confirmed by UE:', toolName)
          setState(prev => ({ ...prev, currentTool: toolName }))
          callbacksRef.current.onToolChange?.(toolName)
          break
        }

        case 'task_completed': {
          // Reset tool state on task completion
          setState(prev => ({
            ...prev,
            selectedTool: null,
            selectedPipe: null,
            currentTool: 'None',
            airPlugSelected: false
          }))
          break
        }
      }
    })

    return unsubscribe
  }, [messageBus])

  // ==========================================================================
  // Select Tool
  // ==========================================================================

  const selectTool = useCallback((
    toolName: ToolName,
    currentTaskIndex: number,
    onTrainingStart?: () => void
  ): boolean => {
    console.log('=== TOOL SELECTION DEBUG ===')
    console.log('Tool clicked:', toolName)
    console.log('Current task index:', currentTaskIndex)

    const expectedTool = TASK_SEQUENCE[currentTaskIndex]?.tool
    console.log('Expected tool:', expectedTool)

    // Check if correct tool
    if (toolName !== expectedTool) {
      console.log('WRONG TOOL - Expected:', expectedTool, 'Got:', toolName)
      return false
    }

    console.log('CORRECT TOOL SELECTED!')

    // Update UI with selected tool
    setState(prev => ({
      ...prev,
      selectedTool: toolName,
      currentTool: toolName
    }))

    // For the FIRST tool (index 0), start training
    if (currentTaskIndex === 0) {
      console.log('First tool selected - starting training:', toolName)
      messageBus.sendMessage(WEB_TO_UE_MESSAGES.TRAINING_CONTROL, 'start')
      onTrainingStart?.()
    } else {
      // For subsequent tasks, send tool_select then task_start
      console.log('Sending tool_select message to UE:', toolName)
      messageBus.sendMessage(WEB_TO_UE_MESSAGES.TOOL_SELECT, toolName)
    }

    // Start task immediately for tools that don't need sub-selection
    if (toolName !== 'PipeConnection' && toolName !== 'PressureTester') {
      if (currentTaskIndex > 0) {
        console.log('Starting task with tool:', toolName)
        messageBus.sendMessage(WEB_TO_UE_MESSAGES.TASK_START, toolName)
      }
    }

    console.log('=== END TOOL SELECTION DEBUG ===')
    return true
  }, [messageBus])

  // ==========================================================================
  // Select Pipe
  // ==========================================================================

  const selectPipe = useCallback((pipeType: PipeType) => {
    console.log('Pipe selected:', pipeType)

    setState(prev => ({ ...prev, selectedPipe: pipeType }))

    // Send to UE
    messageBus.sendMessage(WEB_TO_UE_MESSAGES.PIPE_SELECT, pipeType)

    // Start task with both tool and pipe
    if (state.selectedTool) {
      const taskData = state.selectedTool + ':' + pipeType
      messageBus.sendMessage(WEB_TO_UE_MESSAGES.TASK_START, taskData)
    }
  }, [messageBus, state.selectedTool])

  // ==========================================================================
  // Select Pressure Test
  // ==========================================================================

  const selectPressureTest = useCallback((testType: 'air-plug' | 'conduct-test') => {
    console.log('🔧 Pressure test selected:', testType)

    if (testType === 'air-plug') {
      // Mark air plug as selected
      setState(prev => ({ ...prev, airPlugSelected: true }))
      messageBus.sendMessage(WEB_TO_UE_MESSAGES.TEST_PLUG_SELECT, 'AirPlug')
      console.log('✅ Air Plug selection sent to UE5')
    } else if (testType === 'conduct-test') {
      console.log('🔧 Starting conduct test...')
      messageBus.sendMessage(WEB_TO_UE_MESSAGES.PRESSURE_TEST_START, 'air_test')
      console.log('✅ Pressure test start message sent to UE5')
      messageBus.sendMessage(WEB_TO_UE_MESSAGES.TASK_START, 'PressureTester')
      console.log('✅ Task start message sent to UE5')
    }
  }, [messageBus])

  // ==========================================================================
  // Reset
  // ==========================================================================

  const resetToolState = useCallback(() => {
    setState(initialState)
  }, [])

  // ==========================================================================
  // Auto Advance to Next Task
  // ==========================================================================

  const autoAdvanceToNextTask = useCallback((nextTaskIndex: number) => {
    const nextTask = TASK_SEQUENCE[nextTaskIndex]

    if (!nextTask) {
      console.log('🎉 All tasks completed - no more tasks to advance to')
      return
    }

    const nextTool = nextTask.tool
    console.log('🔄 Auto-advancing to next task:', nextTaskIndex, '- Tool:', nextTool)

    // Update UI with the next tool
    setState(prev => ({
      ...prev,
      selectedTool: nextTool,
      currentTool: nextTool,
      selectedPipe: null,
      airPlugSelected: false
    }))

    // Send tool selection to UE
    messageBus.sendMessage(WEB_TO_UE_MESSAGES.TOOL_SELECT, nextTool)

    // For tools that don't need sub-selection, start the task immediately
    if (nextTool !== 'PipeConnection' && nextTool !== 'PressureTester') {
      console.log('🚀 Auto-starting task with tool:', nextTool)
      messageBus.sendMessage(WEB_TO_UE_MESSAGES.TASK_START, nextTool)
    }

    // Notify callback
    callbacksRef.current.onAutoAdvance?.(nextTool, nextTaskIndex)
  }, [messageBus])

  return {
    state,
    selectTool,
    selectPipe,
    selectPressureTest,
    resetToolState,
    autoAdvanceToNextTask
  }
}

export default useToolSelection
