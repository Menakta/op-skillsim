'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import type { ParsedMessage, ToolName, PipeType } from '@/app/lib/messageTypes'
import { WEB_TO_UE_MESSAGES } from '@/app/lib/messageTypes'
import { TASK_SEQUENCE } from '@/app/config'
import type { UseMessageBusReturn } from '@/app/features/messaging/hooks/useMessageBus'
import { eventBus } from '@/app/lib/events'
import { trainingService } from '@/app/services'

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
  const stateRef = useRef(state)
  callbacksRef.current = callbacks
  stateRef.current = state

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
          eventBus.emit('tool:selected', { toolName, previousTool: stateRef.current.currentTool })
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

        case 'test_plug_placed': {
          const plugType = parts[0] || ''
          console.log('🔌 Plug placed:', plugType)
          break
        }

        case 'test_plugs_complete': {
          const ready = parts[0] === 'true'
          console.log('🔌 All plugs placed, system ready:', ready)
          if (ready) {
            setState(prev => ({ ...prev, airPlugSelected: true }))
          }
          break
        }
      }
    })

    return unsubscribe
  }, [messageBus])

  // ==========================================================================
  // Listen for training:resumed event to set the correct tool
  // ==========================================================================

  useEffect(() => {
    const handleTrainingResumed = (data: { taskIndex: number; tool?: string }) => {
      const { taskIndex, tool } = data
      console.log(`🔧 Training resumed at phase ${taskIndex}, setting up tool selection`)

      // Get the tool for this phase from TASK_SEQUENCE
      const taskInfo = TASK_SEQUENCE[taskIndex]
      const toolForPhase = (tool as ToolName) || taskInfo?.tool || 'None'

      if (toolForPhase && toolForPhase !== 'None') {
        console.log(`🔧 Setting selected tool to: ${toolForPhase}`)
        setState(prev => ({
          ...prev,
          selectedTool: toolForPhase,
          currentTool: toolForPhase,
          selectedPipe: null,
          airPlugSelected: false
        }))

        // Send tool selection to UE5
        messageBus.sendMessage(WEB_TO_UE_MESSAGES.TOOL_SELECT, toolForPhase)
      }
    }

    eventBus.on('training:resumed', handleTrainingResumed)
    return () => {
      eventBus.off('training:resumed', handleTrainingResumed)
    }
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

    // Use trainingService to validate tool selection
    const isValidTool = trainingService.validateToolSelection(toolName, currentTaskIndex)
    const taskInfo = trainingService.getTaskInfo(currentTaskIndex)
    console.log('Expected tool:', taskInfo?.toolName)

    // Check if correct tool
    if (!isValidTool) {
      console.log('WRONG TOOL - Expected:', taskInfo?.toolName, 'Got:', toolName)
      return false
    }

    console.log('CORRECT TOOL SELECTED!')
    eventBus.emit('tool:selected', { toolName })

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
    eventBus.emit('debug:log', { message: `Pipe selected: ${pipeType}`, level: 'info' })

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
      // Send selection to UE5 — airPlugSelected will be set when UE5 confirms
      // via test_plugs_complete:true
      messageBus.sendMessage(WEB_TO_UE_MESSAGES.TEST_PLUG_SELECT, 'AirPlug')
      console.log('✅ Air Plug selection sent to UE5, waiting for confirmation')
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
    // Use trainingService to get next task info
    const nextTaskInfo = trainingService.getTaskInfo(nextTaskIndex)

    if (!nextTaskInfo) {
      console.log('🎉 All tasks completed - no more tasks to advance to')
      return
    }

    const nextTool = nextTaskInfo.toolName
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
