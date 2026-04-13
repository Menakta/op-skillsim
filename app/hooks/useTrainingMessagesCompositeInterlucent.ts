'use client'

/**
 * Composite Training Messages Hook (Interlucent Version)
 *
 * This is the Interlucent version of useTrainingMessagesComposite.
 * It uses useInterlucientMessageBus instead of useMessageBus (PureWeb).
 *
 * The individual hooks are the same:
 * - useInterlucientMessageBus: Send/receive messages (Interlucent JSON format)
 * - useTrainingState: Training progress and state
 * - useToolSelection: Tool and pipe selection
 * - useQuestionFlow: Question handling
 * - useCameraControl: Camera perspectives and orbit
 * - useExplosionControl: Building explosion
 * - useLayerControl: Layers and waypoints
 */

import { useMemo } from 'react'
import type { InterlucientStreamRef } from '@/app/features/streaming/components/InterlucientStream'

import { useInterlucientMessageBus } from '@/app/features/messaging/hooks/useInterlucientMessageBus'
import { useTrainingState, useToolSelection } from '@/app/features/training'
import { useQuestionFlow } from '@/app/features/questions'
import { useCameraControl } from '@/app/features/camera'
import { useExplosionControl } from '@/app/features/explosion'
import { useLayerControl } from '@/app/features/layers'
import { useXRaySliderControl } from '@/app/features/xray'

import type { QuestionData, ToolName } from '@/app/lib/messageTypes'
import { WEB_TO_UE_MESSAGES } from '@/app/lib/messageTypes'

// =============================================================================
// Callback Types (same as PureWeb version)
// =============================================================================

export interface TrainingMessageCallbacks {
  onTrainingProgress?: (data: {
    progress: number
    taskName: string
    phase: string
    currentTask: number
    totalTasks: number
    isActive: boolean
  }) => void
  onToolChange?: (toolName: ToolName) => void
  onTaskCompleted?: (taskId: string, nextTaskIndex: number, completedTaskIndex: number) => void
  onTaskStart?: (toolName: string) => void
  onQuestionRequest?: (questionId: string, question: QuestionData) => void
  onTrainingComplete?: (progress: number, currentTask: number, totalTasks: number) => void
  onMessage?: (message: { type: string; dataString: string }) => void
  onAutoAdvance?: (nextTool: ToolName, nextTaskIndex: number) => void
  onQ6WrongAnswer?: (attemptCount: number) => void
}

export interface UseTrainingMessagesConfig {
  debug?: boolean
}

// =============================================================================
// Combined State Type (same as PureWeb version)
// =============================================================================

export interface TrainingState {
  // Training state
  mode: 'cinematic' | 'training'
  uiMode: 'normal' | 'waypoint' | 'task'
  progress: number
  taskName: string
  phase: string
  currentTaskIndex: number
  totalTasks: number
  isActive: boolean
  trainingStarted: boolean

  // Tool state
  currentTool: ToolName
  selectedTool: ToolName | null
  selectedPipe: string | null
  airPlugSelected: boolean

  // Question state
  currentQuestion: QuestionData | null
  questionTryCount: number
  questionAnsweredCorrectly: boolean

  // Camera state
  cameraMode: 'Manual' | 'Orbit'
  cameraPerspective: string
  cameraDistance: number

  // Explosion state
  explosionValue: number
  isAnimating: boolean

  // X-Ray slider state
  xrayFloorValue: number
  xrayWallValue: number

  // Layer state
  layers: { index: number; name: string; visible: boolean; actorCount: number }[]
  hierarchicalGroups: { name: string; visible: boolean; isChild: boolean; actorCount: number; parentName?: string; childIndex?: number }[]
  waypoints: { index: number; name: string }[]
  activeWaypointIndex: number
  activeWaypointName: string
}

// =============================================================================
// Composite Hook (Interlucent Version)
// =============================================================================

export function useTrainingMessagesCompositeInterlucent(
  streamRef: React.RefObject<InterlucientStreamRef | null>,
  isDataChannelOpen: boolean,
  callbacks: TrainingMessageCallbacks = {},
  config: UseTrainingMessagesConfig = {}
) {
  const { debug = true } = config

  // ==========================================================================
  // Initialize Interlucent message bus
  // ==========================================================================

  const messageBus = useInterlucientMessageBus(streamRef, isDataChannelOpen, { debug })

  // ==========================================================================
  // Initialize individual hooks (same as PureWeb version)
  // These hooks work with the messageBus interface, not specific to PureWeb
  // ==========================================================================

  const trainingState = useTrainingState(messageBus, {
    onTrainingProgress: callbacks.onTrainingProgress,
    onTrainingComplete: callbacks.onTrainingComplete,
    onTaskCompleted: callbacks.onTaskCompleted,
    onTaskStart: callbacks.onTaskStart
  })

  const toolSelection = useToolSelection(messageBus, {
    onToolChange: callbacks.onToolChange,
    onAutoAdvance: callbacks.onAutoAdvance
  })

  const questionFlow = useQuestionFlow(messageBus, {
    onQuestionRequest: callbacks.onQuestionRequest,
    onQ6WrongAnswer: callbacks.onQ6WrongAnswer,
  })

  const cameraControl = useCameraControl(messageBus)
  const explosionControl = useExplosionControl(messageBus)
  const layerControl = useLayerControl(messageBus)
  const xraySliderControl = useXRaySliderControl(messageBus)

  // ==========================================================================
  // Combine state (same as PureWeb version)
  // ==========================================================================

  const state: TrainingState = useMemo(() => ({
    // Training state
    mode: trainingState.state.mode,
    uiMode: trainingState.state.uiMode,
    progress: trainingState.state.progress,
    taskName: trainingState.state.taskName,
    phase: trainingState.state.phase,
    currentTaskIndex: trainingState.state.currentTaskIndex,
    totalTasks: trainingState.state.totalTasks,
    isActive: trainingState.state.isActive,
    trainingStarted: trainingState.state.trainingStarted,

    // Tool state
    currentTool: toolSelection.state.currentTool,
    selectedTool: toolSelection.state.selectedTool,
    selectedPipe: toolSelection.state.selectedPipe,
    airPlugSelected: toolSelection.state.airPlugSelected,

    // Question state
    currentQuestion: questionFlow.state.currentQuestion,
    questionTryCount: questionFlow.state.questionTryCount,
    questionAnsweredCorrectly: questionFlow.state.questionAnsweredCorrectly,

    // Camera state
    cameraMode: cameraControl.state.cameraMode,
    cameraPerspective: cameraControl.state.cameraPerspective,
    cameraDistance: cameraControl.state.cameraDistance,

    // Explosion state
    explosionValue: explosionControl.state.explosionValue,
    isAnimating: explosionControl.state.isAnimating,

    // X-Ray slider state
    xrayFloorValue: xraySliderControl.state.floorValue,
    xrayWallValue: xraySliderControl.state.wallValue,

    // Layer state
    layers: layerControl.state.layers,
    hierarchicalGroups: layerControl.state.hierarchicalGroups,
    waypoints: layerControl.state.waypoints,
    activeWaypointIndex: layerControl.state.activeWaypointIndex,
    activeWaypointName: layerControl.state.activeWaypointName
  }), [
    // Training state
    trainingState.state.mode,
    trainingState.state.uiMode,
    trainingState.state.progress,
    trainingState.state.taskName,
    trainingState.state.phase,
    trainingState.state.currentTaskIndex,
    trainingState.state.totalTasks,
    trainingState.state.isActive,
    trainingState.state.trainingStarted,
    // Tool state
    toolSelection.state.currentTool,
    toolSelection.state.selectedTool,
    toolSelection.state.selectedPipe,
    toolSelection.state.airPlugSelected,
    // Question state
    questionFlow.state.currentQuestion,
    questionFlow.state.questionTryCount,
    questionFlow.state.questionAnsweredCorrectly,
    // Camera state
    cameraControl.state.cameraMode,
    cameraControl.state.cameraPerspective,
    cameraControl.state.cameraDistance,
    // Explosion state
    explosionControl.state.explosionValue,
    explosionControl.state.isAnimating,
    // X-Ray slider state
    xraySliderControl.state.floorValue,
    xraySliderControl.state.wallValue,
    // Layer state
    layerControl.state.layers,
    layerControl.state.hierarchicalGroups,
    layerControl.state.waypoints,
    layerControl.state.activeWaypointIndex,
    layerControl.state.activeWaypointName
  ])

  // ==========================================================================
  // Wrapped selectTool (same as PureWeb version)
  // ==========================================================================

  const selectTool = (tool: ToolName) => {
    return toolSelection.selectTool(
      tool,
      trainingState.state.currentTaskIndex,
      () => trainingState.setTrainingStarted(true)
    )
  }

  // ==========================================================================
  // Application control (same as PureWeb version)
  // ==========================================================================

  const quitApplication = () => {
    messageBus.sendMessage(WEB_TO_UE_MESSAGES.APPLICATION_CONTROL, 'quit')
  }

  // ==========================================================================
  // Return (same interface as PureWeb version)
  // ==========================================================================

  return {
    // State
    state,
    isConnected: messageBus.isConnected,
    lastMessage: messageBus.lastMessage,
    messageLog: messageBus.messageLog,

    // Training Control
    startTraining: trainingState.startTraining,
    startFromTask: trainingState.startFromTask,
    pauseTraining: trainingState.pauseTraining,
    resumeTraining: trainingState.resumeTraining,
    resetTraining: trainingState.resetTraining,
    testConnection: trainingState.testConnection,

    // Tool Selection
    selectTool,

    // Pipe Selection
    selectPipe: toolSelection.selectPipe,

    // Pressure Testing
    selectPressureTest: toolSelection.selectPressureTest,

    // Auto Advance
    autoAdvanceToNextTask: toolSelection.autoAdvanceToNextTask,

    // Question Handling
    submitQuestionAnswer: questionFlow.submitQuestionAnswer,
    closeQuestion: questionFlow.closeQuestion,
    quizAnswers: questionFlow.answers,
    submitQuizResults: questionFlow.submitQuizResults,
    clearQuizAnswers: questionFlow.clearAnswers,
    restoreQuizAnswers: questionFlow.restoreAnswers,

    // Camera Control
    setCameraPerspective: cameraControl.setCameraPerspective,
    toggleAutoOrbit: cameraControl.toggleAutoOrbit,
    resetCamera: cameraControl.resetCamera,

    // Explosion Control
    setExplosionLevel: explosionControl.setExplosionLevel,
    explodeBuilding: explosionControl.explodeBuilding,
    assembleBuilding: explosionControl.assembleBuilding,

    // X-Ray Slider Control
    setXRayFloorValue: xraySliderControl.setFloorValue,
    setXRayWallValue: xraySliderControl.setWallValue,
    resetXRaySliders: xraySliderControl.resetSliders,

    // Waypoint Control
    refreshWaypoints: layerControl.refreshWaypoints,
    activateWaypoint: layerControl.activateWaypoint,
    deactivateWaypoint: layerControl.deactivateWaypoint,

    // Layer Control
    refreshLayers: layerControl.refreshLayers,
    refreshHierarchicalLayers: layerControl.refreshHierarchicalLayers,
    toggleLayer: layerControl.toggleLayer,
    isolateLayer: layerControl.isolateLayer,
    showAllLayers: layerControl.showAllLayers,
    hideAllLayers: layerControl.hideAllLayers,
    toggleMainGroup: layerControl.toggleMainGroup,
    toggleChildGroup: layerControl.toggleChildGroup,

    // Application Control
    quitApplication,

    // Raw message sending
    sendRawMessage: messageBus.sendRawMessage,

    // Utilities
    clearLog: messageBus.clearLog,

    // Individual hooks (for advanced use)
    hooks: {
      messageBus,
      trainingState,
      toolSelection,
      questionFlow,
      cameraControl,
      explosionControl,
      layerControl,
      xraySliderControl
    }
  }
}

export default useTrainingMessagesCompositeInterlucent
