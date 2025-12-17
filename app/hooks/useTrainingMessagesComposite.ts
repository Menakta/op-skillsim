'use client'

/**
 * Composite Training Messages Hook
 *
 * This hook composes all the individual feature hooks into a single interface
 * that maintains backward compatibility with the original useTrainingMessages.
 *
 * The individual hooks are:
 * - useMessageBus: Send/receive messages
 * - useTrainingState: Training progress and state
 * - useToolSelection: Tool and pipe selection
 * - useQuestionFlow: Question handling
 * - useCameraControl: Camera perspectives and orbit
 * - useExplosionControl: Building explosion
 * - useLayerControl: Layers and waypoints
 */

import { useMemo } from 'react'
import type { InputEmitter } from '@pureweb/platform-sdk'
import type { Subject } from 'rxjs'

import { useMessageBus } from '@/app/features/messaging'
import { useTrainingState, useToolSelection } from '@/app/features/training'
import { useQuestionFlow } from '@/app/features/questions'
import { useCameraControl } from '@/app/features/camera'
import { useExplosionControl } from '@/app/features/explosion'
import { useLayerControl } from '@/app/features/layers'

import type { QuestionData, ToolName, PipeType, CameraPerspective } from '@/app/lib/messageTypes'
import { WEB_TO_UE_MESSAGES } from '@/app/lib/messageTypes'

// =============================================================================
// Callback Types (backward compatible with original)
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
  onTaskCompleted?: (taskId: string) => void
  onTaskStart?: (toolName: string) => void
  onQuestionRequest?: (questionId: string, question: QuestionData) => void
  onTrainingComplete?: (progress: number, currentTask: number, totalTasks: number) => void
  onMessage?: (message: { type: string; dataString: string }) => void
}

export interface UseTrainingMessagesConfig {
  debug?: boolean
}

// =============================================================================
// Combined State Type (backward compatible)
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
  selectedPipe: PipeType | null
  airPlugSelected: boolean  // Track if air plug was selected for pressure test

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

  // Layer state
  layers: { index: number; name: string; visible: boolean; actorCount: number }[]
  hierarchicalGroups: { name: string; visible: boolean; isChild: boolean; actorCount: number; parentName?: string; childIndex?: number }[]
  waypoints: { index: number; name: string }[]
  activeWaypointIndex: number
  activeWaypointName: string
}

// =============================================================================
// Composite Hook
// =============================================================================

export function useTrainingMessagesComposite(
  emitter: InputEmitter | undefined,
  messageSubject: Subject<string> | undefined,
  callbacks: TrainingMessageCallbacks = {},
  config: UseTrainingMessagesConfig = {}
) {
  const { debug = true } = config

  // ==========================================================================
  // Initialize individual hooks
  // ==========================================================================

  const messageBus = useMessageBus(emitter, messageSubject, { debug })

  const trainingState = useTrainingState(messageBus, {
    onTrainingProgress: callbacks.onTrainingProgress,
    onTrainingComplete: callbacks.onTrainingComplete,
    onTaskCompleted: callbacks.onTaskCompleted,
    onTaskStart: callbacks.onTaskStart
  })

  const toolSelection = useToolSelection(messageBus, {
    onToolChange: callbacks.onToolChange
  })

  const questionFlow = useQuestionFlow(messageBus, {
    onQuestionRequest: callbacks.onQuestionRequest
  })

  const cameraControl = useCameraControl(messageBus)
  const explosionControl = useExplosionControl(messageBus)
  const layerControl = useLayerControl(messageBus)

  // ==========================================================================
  // Combine state (backward compatible)
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

    // Layer state
    layers: layerControl.state.layers,
    hierarchicalGroups: layerControl.state.hierarchicalGroups,
    waypoints: layerControl.state.waypoints,
    activeWaypointIndex: layerControl.state.activeWaypointIndex,
    activeWaypointName: layerControl.state.activeWaypointName
  }), [
    trainingState.state,
    toolSelection.state,
    questionFlow.state,
    cameraControl.state,
    explosionControl.state,
    layerControl.state
  ])

  // ==========================================================================
  // Wrapped selectTool (needs training state)
  // ==========================================================================

  const selectTool = (tool: ToolName) => {
    return toolSelection.selectTool(
      tool,
      trainingState.state.currentTaskIndex,
      () => trainingState.setTrainingStarted(true)
    )
  }

  // ==========================================================================
  // Application control
  // ==========================================================================

  const quitApplication = () => {
    messageBus.sendMessage(WEB_TO_UE_MESSAGES.APPLICATION_CONTROL, 'quit')
  }

  // ==========================================================================
  // Return (backward compatible interface)
  // ==========================================================================

  return {
    // State
    state,
    isConnected: messageBus.isConnected,
    lastMessage: messageBus.lastMessage,
    messageLog: messageBus.messageLog,

    // Training Control
    startTraining: trainingState.startTraining,
    pauseTraining: trainingState.pauseTraining,
    resetTraining: trainingState.resetTraining,
    testConnection: trainingState.testConnection,

    // Tool Selection
    selectTool,

    // Pipe Selection
    selectPipe: toolSelection.selectPipe,

    // Pressure Testing
    selectPressureTest: toolSelection.selectPressureTest,

    // Question Handling
    submitQuestionAnswer: questionFlow.submitQuestionAnswer,
    closeQuestion: questionFlow.closeQuestion,

    // Camera Control
    setCameraPerspective: cameraControl.setCameraPerspective,
    toggleAutoOrbit: cameraControl.toggleAutoOrbit,
    resetCamera: cameraControl.resetCamera,

    // Explosion Control
    setExplosionLevel: explosionControl.setExplosionLevel,
    explodeBuilding: explosionControl.explodeBuilding,
    assembleBuilding: explosionControl.assembleBuilding,

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
      layerControl
    }
  }
}

export default useTrainingMessagesComposite
