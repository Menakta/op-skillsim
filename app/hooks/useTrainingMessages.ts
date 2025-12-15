'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import type { InputEmitter } from '@pureweb/platform-sdk'
import type { Subject } from 'rxjs'
import {
  ParsedMessage,
  MessageLogEntry,
  ToolName,
  PipeType,
  CameraPerspective,
  TrainingProgressData,
  ExplosionUpdateData,
  CameraUpdateData,
  WaypointData,
  WaypointUpdateData,
  LayerData,
  HierarchicalLayerData,
  QuestionData,
  QUESTION_DATABASE,
  TASK_SEQUENCE,
  parseMessage,
  createMessage,
  WEB_TO_UE_MESSAGES
} from '../lib/messageTypes'

// =============================================================================
// Hook Configuration
// =============================================================================

export interface UseTrainingMessagesConfig {
  /** Enable debug logging */
  debug?: boolean
}

// =============================================================================
// Callback Types (matching player(2).html message handlers)
// =============================================================================

export interface TrainingMessageCallbacks {
  // Training Progress
  onTrainingProgress?: (data: TrainingProgressData) => void

  // Tool
  onToolChange?: (toolName: ToolName) => void

  // Task
  onTaskCompleted?: (taskId: string) => void
  onTaskStart?: (toolName: string) => void
  onTaskComplete?: () => void

  // Question
  onQuestionRequest?: (questionId: string, question: QuestionData) => void

  // Waypoints
  onWaypointList?: (waypoints: WaypointData[]) => void
  onWaypointUpdate?: (data: WaypointUpdateData) => void

  // Layers
  onLayerList?: (layers: LayerData[]) => void
  onHierarchicalList?: (groups: HierarchicalLayerData[]) => void
  onLayerUpdate?: () => void

  // Explosion
  onExplosionUpdate?: (data: ExplosionUpdateData) => void

  // Camera
  onCameraUpdate?: (data: CameraUpdateData) => void

  // Generic callback for all messages
  onMessage?: (message: ParsedMessage) => void

  // Training completion
  onTrainingComplete?: (progress: number, currentTask: number, totalTasks: number) => void
}

// =============================================================================
// Training State
// =============================================================================

export interface TrainingState {
  // Mode (matching player(2).html currentMode)
  mode: 'cinematic' | 'training'

  // UI Mode (matching player(2).html currentUIMode)
  uiMode: 'normal' | 'waypoint' | 'task'

  // Progress (matching player(2).html updateTrainingProgress)
  progress: number
  taskName: string
  phase: string
  currentTaskIndex: number
  totalTasks: number
  isActive: boolean

  // Tool (matching player(2).html selectedTool, currentTask)
  currentTool: ToolName
  selectedTool: ToolName | null
  selectedPipe: PipeType | null

  // Question (matching player(2).html currentQuestion, questionTryCount)
  currentQuestion: QuestionData | null
  questionTryCount: number
  questionAnsweredCorrectly: boolean

  // Camera
  cameraMode: 'Manual' | 'Orbit'
  cameraPerspective: string
  cameraDistance: number

  // Explosion
  explosionValue: number
  isAnimating: boolean

  // Waypoints
  waypoints: WaypointData[]
  activeWaypointIndex: number
  activeWaypointName: string

  // Layers
  layers: LayerData[]
  hierarchicalGroups: HierarchicalLayerData[]

  // Training started flag (matching player(2).html trainingStarted)
  trainingStarted: boolean
}

// =============================================================================
// Hook Return Type
// =============================================================================

export interface UseTrainingMessagesReturn {
  // State
  state: TrainingState
  isConnected: boolean
  lastMessage: ParsedMessage | null
  messageLog: MessageLogEntry[]

  // Training Control (matching player(2).html)
  startTraining: () => void
  pauseTraining: () => void
  resetTraining: () => void
  testConnection: () => void

  // Tool Selection (matching player(2).html selectTool flow)
  selectTool: (tool: ToolName) => void

  // Pipe Selection (matching player(2).html selectPipe)
  selectPipe: (pipe: PipeType) => void

  // Pressure Testing (matching player(2).html selectPressureTest)
  selectPressureTest: (testType: 'air-plug' | 'conduct-test') => void

  // Question Handling (matching player(2).html submitAnswer, hideQuestion)
  submitQuestionAnswer: (selectedAnswer: number) => { correct: boolean; message: string } | undefined
  closeQuestion: () => void

  // Camera Control (matching player(2).html)
  setCameraPerspective: (perspective: CameraPerspective) => void
  toggleAutoOrbit: () => void
  resetCamera: () => void

  // Explosion Control (matching player(2).html)
  setExplosionLevel: (level: number) => void
  explodeBuilding: () => void
  assembleBuilding: () => void

  // Waypoint Control (matching player(2).html)
  refreshWaypoints: () => void
  activateWaypoint: (index: number) => void
  deactivateWaypoint: () => void

  // Layer Control (matching player(2).html)
  refreshLayers: () => void
  refreshHierarchicalLayers: () => void
  toggleLayer: (index: number) => void
  isolateLayer: (index: number) => void
  showAllLayers: () => void
  hideAllLayers: () => void
  toggleMainGroup: (groupName: string) => void
  toggleChildGroup: (parentName: string, childIndex: number) => void

  // Application Control
  quitApplication: () => void

  // Raw message sending
  sendRawMessage: (message: string) => void

  // Utilities
  clearLog: () => void
}

// =============================================================================
// Initial State (matching player(2).html initial state)
// =============================================================================

const initialState: TrainingState = {
  mode: 'cinematic',
  uiMode: 'normal',
  progress: 0,
  taskName: 'Not Started',
  phase: 'NotStarted',
  currentTaskIndex: 0,
  totalTasks: TASK_SEQUENCE.length,
  isActive: false,
  currentTool: 'None',
  selectedTool: null,
  selectedPipe: null,
  currentQuestion: null,
  questionTryCount: 1,
  questionAnsweredCorrectly: false,
  cameraMode: 'Manual',
  cameraPerspective: 'IsometricNE',
  cameraDistance: 1500,
  explosionValue: 0,
  isAnimating: false,
  waypoints: [],
  activeWaypointIndex: -1,
  activeWaypointName: 'None',
  layers: [],
  hierarchicalGroups: [],
  trainingStarted: false
}

// =============================================================================
// Hook Implementation (matching player(2).html flow exactly)
// =============================================================================

export function useTrainingMessages(
  emitter: InputEmitter | undefined,
  messageSubject: Subject<string> | undefined,
  callbacks: TrainingMessageCallbacks = {},
  config: UseTrainingMessagesConfig = {}
): UseTrainingMessagesReturn {
  const { debug = true } = config

  // State
  const [state, setState] = useState<TrainingState>(initialState)
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<ParsedMessage | null>(null)
  const [messageLog, setMessageLog] = useState<MessageLogEntry[]>([])

  // Store callbacks in ref to avoid re-subscribing on every render
  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks

  // ==========================================================================
  // SEND: Matching player(2).html sendMessageToUE function
  // ==========================================================================

  const sendMessageToUE = useCallback((type: string, data: string) => {
    const message = createMessage(type, data)

    if (debug) {
      console.log('sendMessageToUE called:', type, data)
      console.log('emitter exists:', !!emitter)
    }

    if (emitter) {
      if (debug) console.log('Sending to UE:', message)
      emitter.EmitUIInteraction(message)
    } else {
      if (debug) console.warn('Emitter not ready - message not sent:', message)
    }

    // Log the message
    const entry: MessageLogEntry = {
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      direction: 'sent',
      type,
      data,
      raw: message,
      timestamp: Date.now()
    }
    setMessageLog(prev => [entry, ...prev].slice(0, 100))
  }, [emitter, debug])

  // Raw message sending
  const sendRawMessage = useCallback((message: string) => {
    if (emitter) {
      if (debug) console.log('Sending raw to UE:', message)
      emitter.EmitUIInteraction(message)
    }

    const colonIndex = message.indexOf(':')
    const entry: MessageLogEntry = {
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      direction: 'sent',
      type: colonIndex > -1 ? message.substring(0, colonIndex) : message,
      data: colonIndex > -1 ? message.substring(colonIndex + 1) : '',
      raw: message,
      timestamp: Date.now()
    }
    setMessageLog(prev => [entry, ...prev].slice(0, 100))
  }, [emitter, debug])

  // ==========================================================================
  // RECEIVE: Matching player(2).html handleMessageFromUE function
  // ==========================================================================

  useEffect(() => {
    if (!messageSubject) {
      if (debug) console.log('messageSubject not available yet')
      return
    }

    if (debug) console.log('Subscribing to UE5 messages')

    const subscription = messageSubject.subscribe((raw: string) => {
      if (debug) console.log('Received from UE:', raw)

      const message = parseMessage(raw)
      if (!message) return

      // Update state
      setLastMessage(message)
      setIsConnected(true)

      // Log the message
      const entry: MessageLogEntry = {
        id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        direction: 'received',
        type: message.type,
        data: message.dataString,
        raw,
        timestamp: Date.now()
      }
      setMessageLog(prev => [entry, ...prev].slice(0, 100))

      // Call generic handler
      callbacksRef.current.onMessage?.(message)

      // Route to specific handlers (matching player(2).html switch statement)
      handleMessageFromUE(message)
    })

    return () => {
      if (debug) console.log('Unsubscribing from UE5 messages')
      subscription.unsubscribe()
    }
  }, [messageSubject, debug])

  // ==========================================================================
  // Message Handler (matching player(2).html handleMessageFromUE exactly)
  // ==========================================================================

  const handleMessageFromUE = useCallback((message: ParsedMessage) => {
    const { type, data, dataString } = message
    const parts = dataString.split(':')

    switch (type) {
      case 'training_progress': {
        // Matching player(2).html updateTrainingProgress
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

        // Check for training completion (matching player(2).html)
        if (currentTask >= totalTasks || progress >= 100) {
          console.log(`🎉 TRAINING COMPLETED! Tasks: ${currentTask}/${totalTasks}, Progress: ${progress}%`)
          callbacksRef.current.onTrainingComplete?.(progress, currentTask, totalTasks)
        }
        break
      }

      case 'tool_change': {
        // Matching player(2).html updateCurrentTool
        const toolName = (parts[0] as ToolName) || 'None'
        console.log('Tool change confirmed by UE:', toolName)
        setState(prev => ({ ...prev, currentTool: toolName }))
        callbacksRef.current.onToolChange?.(toolName)
        break
      }

      case 'task_completed': {
        // Matching player(2).html handleTaskCompleted
        const taskId = parts[0] || ''
        console.log('=== TASK COMPLETED MESSAGE ===')
        console.log('Completed task ID:', taskId)

        callbacksRef.current.onTaskCompleted?.(taskId)

        // Advance to next task (matching player(2).html completeCurrentTask)
        setState(prev => {
          const nextIndex = prev.currentTaskIndex + 1

          if (nextIndex >= TASK_SEQUENCE.length) {
            return {
              ...prev,
              currentTaskIndex: nextIndex,
              phase: 'All Tasks Complete',
              selectedTool: null,
              selectedPipe: null
            }
          }

          const nextTask = TASK_SEQUENCE[nextIndex]
          return {
            ...prev,
            currentTaskIndex: nextIndex,
            phase: 'Tool Selection',
            selectedTool: null,
            selectedPipe: null,
            currentTool: 'None'
          }
        })
        break
      }

      case 'task_start': {
        // Matching player(2).html task_start handler
        const toolName = parts[0] || ''
        console.log('Task started:', toolName)
        setState(prev => ({ ...prev, phase: 'Task Active' }))
        callbacksRef.current.onTaskStart?.(toolName)
        break
      }

      case 'task_complete': {
        callbacksRef.current.onTaskComplete?.()
        break
      }

      case 'question_request': {
        // Matching player(2).html showQuestion
        const questionId = parts[0] || 'Q1'
        const question = QUESTION_DATABASE[questionId]

        if (question) {
          console.log('Question requested:', questionId)
          setState(prev => ({
            ...prev,
            currentQuestion: question,
            questionTryCount: 1,
            questionAnsweredCorrectly: false
          }))
          callbacksRef.current.onQuestionRequest?.(questionId, question)
        } else {
          console.error('Question not found in database:', questionId)
        }
        break
      }

      case 'task_debug': {
        console.log('🔍 TASK DEBUG:', dataString)
        break
      }

      case 'waypoint_list': {
        // Matching player(2).html updateWaypointList
        const count = parseInt(parts[0]) || 0
        const waypointData = dataString.substring(parts[0].length + 1)
        const waypoints: WaypointData[] = []

        if (count > 0 && waypointData) {
          waypointData.split(',').forEach(wp => {
            const [index, name] = wp.split(':')
            if (index !== undefined && name) {
              waypoints.push({ index: parseInt(index), name })
            }
          })
        }

        setState(prev => ({ ...prev, waypoints }))
        callbacksRef.current.onWaypointList?.(waypoints)
        break
      }

      case 'waypoint_update': {
        // Matching player(2).html updateWaypointState
        const activeIndex = parseInt(parts[0]) || -1
        const waypointName = parts[1] || 'None'
        const isActive = parts[2] === 'true'
        const progress = parseFloat(parts[3]) || 0

        setState(prev => {
          if (isActive && prev.uiMode !== 'waypoint') {
            return {
              ...prev,
              uiMode: 'waypoint',
              activeWaypointIndex: activeIndex,
              activeWaypointName: waypointName
            }
          } else if (!isActive && prev.uiMode === 'waypoint') {
            return {
              ...prev,
              uiMode: 'normal',
              activeWaypointIndex: -1,
              activeWaypointName: 'None'
            }
          }
          return {
            ...prev,
            activeWaypointIndex: isActive ? activeIndex : -1,
            activeWaypointName: isActive ? waypointName : 'None'
          }
        })

        callbacksRef.current.onWaypointUpdate?.({
          activeIndex,
          name: waypointName,
          isActive,
          progress
        })
        break
      }

      case 'layer_list': {
        // Matching player(2).html updateLayerList
        const count = parseInt(parts[0]) || 0
        const layerData = dataString.substring(parts[0].length + 1)
        const layers: LayerData[] = []

        if (count > 0 && layerData) {
          layerData.split(',').forEach(layer => {
            const [index, name, visible, actorCount] = layer.split(':')
            if (index !== undefined && name) {
              layers.push({
                index: parseInt(index),
                name,
                visible: visible === 'true',
                actorCount: parseInt(actorCount) || 0
              })
            }
          })
        }

        setState(prev => ({ ...prev, layers }))
        callbacksRef.current.onLayerList?.(layers)
        break
      }

      case 'hierarchical_list': {
        // Matching player(2).html updateHierarchicalLayerList
        const count = parseInt(parts[0]) || 0
        const groupData = dataString.substring(parts[0].length + 1)
        const groups: HierarchicalLayerData[] = []

        if (count > 0 && groupData) {
          groupData.split(',').forEach(group => {
            const [name, visible, isChild, actorCount, parentName, childIndex] = group.split(':')
            if (name) {
              groups.push({
                name,
                visible: visible === 'true',
                isChild: isChild === 'true',
                actorCount: parseInt(actorCount) || 0,
                parentName: parentName || undefined,
                childIndex: childIndex ? parseInt(childIndex) : undefined
              })
            }
          })
        }

        setState(prev => ({ ...prev, hierarchicalGroups: groups }))
        callbacksRef.current.onHierarchicalList?.(groups)
        break
      }

      case 'layer_update': {
        // Matching player(2).html - refresh layer list
        console.log('Layer update received, refreshing list')
        setTimeout(() => {
          sendMessageToUE(WEB_TO_UE_MESSAGES.LAYER_CONTROL, 'list')
        }, 100)
        callbacksRef.current.onLayerUpdate?.()
        break
      }

      case 'explosion_update': {
        // Matching player(2).html updateExplosionState
        const value = parseFloat(parts[0]) || 0
        const isAnimating = parts[1] === 'true'

        setState(prev => ({
          ...prev,
          explosionValue: value,
          isAnimating
        }))
        callbacksRef.current.onExplosionUpdate?.({ value, isAnimating })
        break
      }

      case 'camera_update': {
        // Matching player(2).html updateCameraState
        const mode = (parts[0] as 'Manual' | 'Orbit') || 'Manual'
        const perspective = parts[1] || 'IsometricNE'
        const distance = parseFloat(parts[2]) || 1500

        setState(prev => ({
          ...prev,
          cameraMode: mode,
          cameraPerspective: perspective,
          cameraDistance: distance
        }))
        callbacksRef.current.onCameraUpdate?.({
          mode,
          perspective,
          distance,
          isTransitioning: parts[3] === 'true'
        })
        break
      }

      default:
        if (debug) console.log('Unhandled message type:', type)
    }
  }, [debug, sendMessageToUE])

  // ==========================================================================
  // Training Control (matching player(2).html)
  // ==========================================================================

  const startTraining = useCallback(() => {
    // Matching player(2).html startTraining function
    console.log('Training started')

    // Switch to training mode UI
    setState(prev => ({
      ...prev,
      mode: 'training',
      uiMode: 'task',
      phase: 'Tool Selection',
      currentTaskIndex: 0,
      trainingStarted: false // Will be set true when first tool is selected
    }))

    // Send training start to UE
    sendMessageToUE(WEB_TO_UE_MESSAGES.TRAINING_CONTROL, 'start')
  }, [sendMessageToUE])

  const pauseTraining = useCallback(() => {
    sendMessageToUE(WEB_TO_UE_MESSAGES.TRAINING_CONTROL, 'pause')
  }, [sendMessageToUE])

  const resetTraining = useCallback(() => {
    sendMessageToUE(WEB_TO_UE_MESSAGES.TRAINING_CONTROL, 'reset')
    setState(initialState)
  }, [sendMessageToUE])

  const testConnection = useCallback(() => {
    sendMessageToUE(WEB_TO_UE_MESSAGES.TRAINING_CONTROL, 'test')
  }, [sendMessageToUE])

  // ==========================================================================
  // Tool Selection (matching player(2).html selectTool EXACTLY)
  // ==========================================================================

  const selectTool = useCallback((toolName: ToolName) => {
    console.log('=== TOOL SELECTION DEBUG ===')
    console.log('Tool clicked:', toolName)
    console.log('Current task index:', state.currentTaskIndex)

    const expectedTool = TASK_SEQUENCE[state.currentTaskIndex]?.tool
    console.log('Expected tool:', expectedTool)

    // Check if correct tool (matching player(2).html)
    if (toolName !== expectedTool) {
      console.log('WRONG TOOL - Expected:', expectedTool, 'Got:', toolName)
      // Wrong tool - don't proceed
      return false
    }

    console.log('CORRECT TOOL SELECTED!')

    // Update UI with selected tool
    setState(prev => ({
      ...prev,
      selectedTool: toolName,
      currentTool: toolName,
      phase: 'Task Starting'
    }))

    // For the FIRST tool (index 0), start training instead of just selecting tool
    // Matching player(2).html: "if (currentTaskIndex === 0)"
    if (state.currentTaskIndex === 0) {
      console.log('First tool selected - starting training:', toolName)
      sendMessageToUE(WEB_TO_UE_MESSAGES.TRAINING_CONTROL, 'start')
      setState(prev => ({ ...prev, trainingStarted: true }))
    } else {
      // For subsequent tasks, send tool_select then task_start
      console.log('Sending tool_select message to UE:', toolName)
      sendMessageToUE(WEB_TO_UE_MESSAGES.TOOL_SELECT, toolName)
    }

    // Show pipe selection if needed (matching player(2).html)
    if (toolName === 'PipeConnection') {
      console.log('Showing pipe selection for tool:', toolName)
      // Don't start task yet - wait for pipe selection
    } else if (toolName === 'PressureTester') {
      console.log('Showing pressure test panel for tool:', toolName)
      // Don't start task yet - wait for pressure test selection
    } else {
      // Start task immediately for other tools
      if (state.currentTaskIndex > 0) {
        console.log('Starting task with tool:', toolName)
        sendMessageToUE(WEB_TO_UE_MESSAGES.TASK_START, toolName)
      }
    }

    console.log('=== END TOOL SELECTION DEBUG ===')
    return true
  }, [state.currentTaskIndex, sendMessageToUE])

  // ==========================================================================
  // Pipe Selection (matching player(2).html selectPipe)
  // ==========================================================================

  const selectPipe = useCallback((pipeType: PipeType) => {
    console.log('Pipe selected:', pipeType)

    setState(prev => ({ ...prev, selectedPipe: pipeType }))

    // Send to UE (matching player(2).html)
    sendMessageToUE(WEB_TO_UE_MESSAGES.PIPE_SELECT, pipeType)

    // Start task with both tool and pipe
    if (state.selectedTool) {
      const taskData = state.selectedTool + ':' + pipeType
      sendMessageToUE(WEB_TO_UE_MESSAGES.TASK_START, taskData)
    }
  }, [state.selectedTool, sendMessageToUE])

  // ==========================================================================
  // Pressure Test Selection (matching player(2).html selectPressureTest)
  // ==========================================================================

  const selectPressureTest = useCallback((testType: 'air-plug' | 'conduct-test') => {
    console.log('Pressure test selected:', testType)

    if (testType === 'air-plug') {
      // Send test plug selection message to UE5
      sendMessageToUE(WEB_TO_UE_MESSAGES.TEST_PLUG_SELECT, 'AirPlug')
      console.log('Air Plug selection sent to UE5')
    } else if (testType === 'conduct-test') {
      // Send conduct test message to UE5
      sendMessageToUE(WEB_TO_UE_MESSAGES.PRESSURE_TEST_START, 'air_test')
      console.log('Conduct test message sent to UE5')

      // Also start the task
      sendMessageToUE(WEB_TO_UE_MESSAGES.TASK_START, 'PressureTester')
    }
  }, [sendMessageToUE])

  // ==========================================================================
  // Question Handling (matching player(2).html submitAnswer, hideQuestion)
  // ==========================================================================

  const submitQuestionAnswer = useCallback((selectedAnswer: number) => {
    const question = state.currentQuestion
    if (!question || selectedAnswer === null) return

    // Check if answer is correct (matching player(2).html)
    const isCorrect = selectedAnswer === question.correctAnswer

    if (isCorrect) {
      // Mark question as answered correctly (for close detection - matching player(2).html)
      setState(prev => ({ ...prev, questionAnsweredCorrectly: true }))

      // Correct answer - send to UE
      const answerMessage = `${question.id}:${state.questionTryCount}:true`
      sendMessageToUE(WEB_TO_UE_MESSAGES.QUESTION_ANSWER, answerMessage)

      // Special handling for Q6 pressure testing (matching player(2).html)
      if (question.id === 'Q6') {
        console.log('🔧 Q6 ANSWERED CORRECTLY! NEW FLOW:')
        console.log('  → Q6 answer sent to UE5:', answerMessage)
        console.log('  → UE5 will wait for player to close question')
        console.log('  → When player clicks Close, pressure testing will begin')
      }

      return { correct: true, message: question.explanation }
    } else {
      // Wrong answer (matching player(2).html)
      setState(prev => ({ ...prev, questionTryCount: prev.questionTryCount + 1 }))
      return { correct: false, message: 'Incorrect. Try again!' }
    }
  }, [state.currentQuestion, state.questionTryCount, sendMessageToUE])

  const closeQuestion = useCallback(() => {
    const question = state.currentQuestion

    // Check if this is Q6 being closed and if it was answered correctly
    // Matching player(2).html hideQuestion function exactly
    if (question && question.id === 'Q6' && state.questionAnsweredCorrectly) {
      console.log('🔧 Q6 CLOSE DETECTED! Triggering pressure testing sequence...')
      console.log('  → Sending OnPlayerClosedQ6Question message to UE5')

      // Send message to UE5 to start pressure testing sequence
      sendMessageToUE(WEB_TO_UE_MESSAGES.PRESSURE_TEST_START, 'player_closed_q6')
    }

    setState(prev => ({
      ...prev,
      currentQuestion: null,
      questionTryCount: 1,
      questionAnsweredCorrectly: false
    }))
  }, [state.currentQuestion, state.questionAnsweredCorrectly, sendMessageToUE])

  // ==========================================================================
  // Camera Control (matching player(2).html)
  // ==========================================================================

  const setCameraPerspective = useCallback((perspective: CameraPerspective) => {
    sendMessageToUE(WEB_TO_UE_MESSAGES.CAMERA_CONTROL, perspective)
  }, [sendMessageToUE])

  const toggleAutoOrbit = useCallback(() => {
    // Matching player(2).html toggleAutoOrbit
    if (state.cameraMode === 'Orbit') {
      sendMessageToUE(WEB_TO_UE_MESSAGES.CAMERA_CONTROL, 'orbit_stop')
    } else {
      sendMessageToUE(WEB_TO_UE_MESSAGES.CAMERA_CONTROL, 'orbit_start')
    }
  }, [state.cameraMode, sendMessageToUE])

  const resetCamera = useCallback(() => {
    sendMessageToUE(WEB_TO_UE_MESSAGES.CAMERA_CONTROL, 'reset')
  }, [sendMessageToUE])

  // ==========================================================================
  // Explosion Control (matching player(2).html)
  // ==========================================================================

  const setExplosionLevel = useCallback((level: number) => {
    sendMessageToUE(WEB_TO_UE_MESSAGES.EXPLOSION_CONTROL, level.toString())
  }, [sendMessageToUE])

  const explodeBuilding = useCallback(() => {
    sendMessageToUE(WEB_TO_UE_MESSAGES.EXPLOSION_CONTROL, 'explode')
  }, [sendMessageToUE])

  const assembleBuilding = useCallback(() => {
    sendMessageToUE(WEB_TO_UE_MESSAGES.EXPLOSION_CONTROL, 'assemble')
  }, [sendMessageToUE])

  // ==========================================================================
  // Waypoint Control (matching player(2).html)
  // ==========================================================================

  const refreshWaypoints = useCallback(() => {
    console.log('Refreshing waypoint list')
    sendMessageToUE(WEB_TO_UE_MESSAGES.WAYPOINT_CONTROL, 'list')
  }, [sendMessageToUE])

  const activateWaypoint = useCallback((index: number) => {
    console.log('Activating waypoint:', index)
    sendMessageToUE(WEB_TO_UE_MESSAGES.WAYPOINT_CONTROL, `activate:${index}`)

    // Get waypoint name and switch to waypoint mode
    const waypoint = state.waypoints.find(w => w.index === index)
    if (waypoint) {
      setState(prev => ({
        ...prev,
        uiMode: 'waypoint',
        activeWaypointIndex: index,
        activeWaypointName: waypoint.name
      }))
    }
  }, [state.waypoints, sendMessageToUE])

  const deactivateWaypoint = useCallback(() => {
    console.log('Deactivating waypoint')
    sendMessageToUE(WEB_TO_UE_MESSAGES.WAYPOINT_CONTROL, 'deactivate')

    setState(prev => ({
      ...prev,
      uiMode: 'normal',
      activeWaypointIndex: -1,
      activeWaypointName: 'None'
    }))
  }, [sendMessageToUE])

  // ==========================================================================
  // Layer Control (matching player(2).html)
  // ==========================================================================

  const refreshLayers = useCallback(() => {
    console.log('Refreshing layer list')
    sendMessageToUE(WEB_TO_UE_MESSAGES.LAYER_CONTROL, 'list')
  }, [sendMessageToUE])

  const refreshHierarchicalLayers = useCallback(() => {
    console.log('Refreshing hierarchical layer list')
    sendMessageToUE(WEB_TO_UE_MESSAGES.HIERARCHICAL_CONTROL, 'list')
  }, [sendMessageToUE])

  const toggleLayer = useCallback((index: number) => {
    console.log('Toggling layer:', index)
    sendMessageToUE(WEB_TO_UE_MESSAGES.LAYER_CONTROL, `toggle:${index}`)

    // Request updated layer list after a short delay
    setTimeout(() => {
      sendMessageToUE(WEB_TO_UE_MESSAGES.LAYER_CONTROL, 'list')
    }, 200)
  }, [sendMessageToUE])

  const isolateLayer = useCallback((index: number) => {
    console.log('Isolating layer:', index)
    sendMessageToUE(WEB_TO_UE_MESSAGES.LAYER_CONTROL, `isolate:${index}`)
  }, [sendMessageToUE])

  const showAllLayers = useCallback(() => {
    console.log('Showing all layers')
    sendMessageToUE(WEB_TO_UE_MESSAGES.HIERARCHICAL_CONTROL, 'show_all')

    setTimeout(() => {
      sendMessageToUE(WEB_TO_UE_MESSAGES.HIERARCHICAL_CONTROL, 'list')
    }, 200)
  }, [sendMessageToUE])

  const hideAllLayers = useCallback(() => {
    console.log('Hiding all layers')
    sendMessageToUE(WEB_TO_UE_MESSAGES.HIERARCHICAL_CONTROL, 'hide_all')

    setTimeout(() => {
      sendMessageToUE(WEB_TO_UE_MESSAGES.HIERARCHICAL_CONTROL, 'list')
    }, 200)
  }, [sendMessageToUE])

  const toggleMainGroup = useCallback((groupName: string) => {
    console.log('Toggling main group:', groupName)
    sendMessageToUE(WEB_TO_UE_MESSAGES.HIERARCHICAL_CONTROL, `toggle_main:${groupName}`)

    setTimeout(() => {
      sendMessageToUE(WEB_TO_UE_MESSAGES.HIERARCHICAL_CONTROL, 'list')
    }, 200)
  }, [sendMessageToUE])

  const toggleChildGroup = useCallback((parentName: string, childIndex: number) => {
    console.log('Toggling child group:', parentName, childIndex)
    sendMessageToUE(WEB_TO_UE_MESSAGES.HIERARCHICAL_CONTROL, `toggle_child:${parentName}:${childIndex}`)

    setTimeout(() => {
      sendMessageToUE(WEB_TO_UE_MESSAGES.HIERARCHICAL_CONTROL, 'list')
    }, 200)
  }, [sendMessageToUE])

  // ==========================================================================
  // Application Control
  // ==========================================================================

  const quitApplication = useCallback(() => {
    sendMessageToUE(WEB_TO_UE_MESSAGES.APPLICATION_CONTROL, 'quit')
  }, [sendMessageToUE])

  // ==========================================================================
  // Utilities
  // ==========================================================================

  const clearLog = useCallback(() => {
    setMessageLog([])
  }, [])

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    // State
    state,
    isConnected,
    lastMessage,
    messageLog,

    // Training Control
    startTraining,
    pauseTraining,
    resetTraining,
    testConnection,

    // Tool Selection
    selectTool,

    // Pipe Selection
    selectPipe,

    // Pressure Testing
    selectPressureTest,

    // Question Handling
    submitQuestionAnswer,
    closeQuestion,

    // Camera Control
    setCameraPerspective,
    toggleAutoOrbit,
    resetCamera,

    // Explosion Control
    setExplosionLevel,
    explodeBuilding,
    assembleBuilding,

    // Waypoint Control
    refreshWaypoints,
    activateWaypoint,
    deactivateWaypoint,

    // Layer Control
    refreshLayers,
    refreshHierarchicalLayers,
    toggleLayer,
    isolateLayer,
    showAllLayers,
    hideAllLayers,
    toggleMainGroup,
    toggleChildGroup,

    // Application Control
    quitApplication,

    // Raw message sending
    sendRawMessage,

    // Utilities
    clearLog
  }
}

export default useTrainingMessages
