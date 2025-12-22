/**
 * Training Slice
 *
 * Manages training state: progress, current task, tool selection, etc.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../index'
import type { ToolName, PipeType, QuestionData } from '@/app/lib/messageTypes'

// =============================================================================
// State Types
// =============================================================================

export interface TrainingSliceState {
  // Training mode and progress
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

  // Layer state
  layers: { index: number; name: string; visible: boolean; actorCount: number }[]
  hierarchicalGroups: { name: string; visible: boolean; isChild: boolean; actorCount: number; parentName?: string; childIndex?: number }[]
  waypoints: { index: number; name: string }[]
  activeWaypointIndex: number
  activeWaypointName: string
}

// =============================================================================
// Initial State
// =============================================================================

const initialState: TrainingSliceState = {
  // Training mode and progress
  mode: 'cinematic',
  uiMode: 'normal',
  progress: 0,
  taskName: 'Not Started',
  phase: 'NotStarted',
  currentTaskIndex: 0,
  totalTasks: 6,
  isActive: false,
  trainingStarted: false,

  // Tool state
  currentTool: 'None',
  selectedTool: null,
  selectedPipe: null,
  airPlugSelected: false,

  // Question state
  currentQuestion: null,
  questionTryCount: 0,
  questionAnsweredCorrectly: false,

  // Camera state
  cameraMode: 'Manual',
  cameraPerspective: 'IsometricNE',
  cameraDistance: 1500,

  // Explosion state
  explosionValue: 0,
  isAnimating: false,

  // Layer state
  layers: [],
  hierarchicalGroups: [],
  waypoints: [],
  activeWaypointIndex: -1,
  activeWaypointName: 'None',
}

// =============================================================================
// Slice Definition
// =============================================================================

export const trainingSlice = createSlice({
  name: 'training',
  initialState,
  reducers: {
    // Training Progress
    setTrainingProgress: (state, action: PayloadAction<{
      progress: number
      taskName: string
      phase: string
      currentTask: number
      totalTasks: number
      isActive: boolean
    }>) => {
      state.progress = action.payload.progress
      state.taskName = action.payload.taskName
      state.phase = action.payload.phase
      state.currentTaskIndex = action.payload.currentTask
      state.totalTasks = action.payload.totalTasks
      state.isActive = action.payload.isActive
    },

    setMode: (state, action: PayloadAction<'cinematic' | 'training'>) => {
      state.mode = action.payload
    },

    setUiMode: (state, action: PayloadAction<'normal' | 'waypoint' | 'task'>) => {
      state.uiMode = action.payload
    },

    setTrainingStarted: (state, action: PayloadAction<boolean>) => {
      state.trainingStarted = action.payload
    },

    setCurrentTaskIndex: (state, action: PayloadAction<number>) => {
      state.currentTaskIndex = action.payload
    },

    // Tool Selection
    setCurrentTool: (state, action: PayloadAction<ToolName>) => {
      state.currentTool = action.payload
    },

    setSelectedTool: (state, action: PayloadAction<ToolName | null>) => {
      state.selectedTool = action.payload
    },

    setSelectedPipe: (state, action: PayloadAction<PipeType | null>) => {
      state.selectedPipe = action.payload
    },

    setAirPlugSelected: (state, action: PayloadAction<boolean>) => {
      state.airPlugSelected = action.payload
    },

    // Question State
    setCurrentQuestion: (state, action: PayloadAction<QuestionData | null>) => {
      state.currentQuestion = action.payload
    },

    setQuestionTryCount: (state, action: PayloadAction<number>) => {
      state.questionTryCount = action.payload
    },

    incrementQuestionTryCount: (state) => {
      state.questionTryCount += 1
    },

    setQuestionAnsweredCorrectly: (state, action: PayloadAction<boolean>) => {
      state.questionAnsweredCorrectly = action.payload
    },

    resetQuestionState: (state) => {
      state.currentQuestion = null
      state.questionTryCount = 0
      state.questionAnsweredCorrectly = false
    },

    // Camera State
    setCameraMode: (state, action: PayloadAction<'Manual' | 'Orbit'>) => {
      state.cameraMode = action.payload
    },

    setCameraPerspective: (state, action: PayloadAction<string>) => {
      state.cameraPerspective = action.payload
    },

    setCameraDistance: (state, action: PayloadAction<number>) => {
      state.cameraDistance = action.payload
    },

    setCameraState: (state, action: PayloadAction<{
      mode: 'Manual' | 'Orbit'
      perspective: string
      distance: number
    }>) => {
      state.cameraMode = action.payload.mode
      state.cameraPerspective = action.payload.perspective
      state.cameraDistance = action.payload.distance
    },

    // Explosion State
    setExplosionValue: (state, action: PayloadAction<number>) => {
      state.explosionValue = action.payload
    },

    setIsAnimating: (state, action: PayloadAction<boolean>) => {
      state.isAnimating = action.payload
    },

    setExplosionState: (state, action: PayloadAction<{
      value: number
      isAnimating: boolean
    }>) => {
      state.explosionValue = action.payload.value
      state.isAnimating = action.payload.isAnimating
    },

    // Layer State
    setLayers: (state, action: PayloadAction<{ index: number; name: string; visible: boolean; actorCount: number }[]>) => {
      state.layers = action.payload
    },

    setHierarchicalGroups: (state, action: PayloadAction<{ name: string; visible: boolean; isChild: boolean; actorCount: number; parentName?: string; childIndex?: number }[]>) => {
      state.hierarchicalGroups = action.payload
    },

    // Waypoint State
    setWaypoints: (state, action: PayloadAction<{ index: number; name: string }[]>) => {
      state.waypoints = action.payload
    },

    setActiveWaypoint: (state, action: PayloadAction<{ index: number; name: string }>) => {
      state.activeWaypointIndex = action.payload.index
      state.activeWaypointName = action.payload.name
    },

    // Bulk state update (for syncing with composite hook)
    syncFromHook: (state, action: PayloadAction<Partial<TrainingSliceState>>) => {
      return { ...state, ...action.payload }
    },

    // Reset training
    resetTraining: () => initialState,
  },
})

// =============================================================================
// Actions Export
// =============================================================================

export const {
  setTrainingProgress,
  setMode,
  setUiMode,
  setTrainingStarted,
  setCurrentTaskIndex,
  setCurrentTool,
  setSelectedTool,
  setSelectedPipe,
  setAirPlugSelected,
  setCurrentQuestion,
  setQuestionTryCount,
  incrementQuestionTryCount,
  setQuestionAnsweredCorrectly,
  resetQuestionState,
  setCameraMode,
  setCameraPerspective,
  setCameraDistance,
  setCameraState,
  setExplosionValue,
  setIsAnimating,
  setExplosionState,
  setLayers,
  setHierarchicalGroups,
  setWaypoints,
  setActiveWaypoint,
  syncFromHook,
  resetTraining,
} = trainingSlice.actions

// =============================================================================
// Selectors
// =============================================================================

// Training progress selectors
export const selectTrainingMode = (state: RootState) => state.training.mode
export const selectUiMode = (state: RootState) => state.training.uiMode
export const selectProgress = (state: RootState) => state.training.progress
export const selectTaskName = (state: RootState) => state.training.taskName
export const selectPhase = (state: RootState) => state.training.phase
export const selectCurrentTaskIndex = (state: RootState) => state.training.currentTaskIndex
export const selectTotalTasks = (state: RootState) => state.training.totalTasks
export const selectIsActive = (state: RootState) => state.training.isActive
export const selectTrainingStarted = (state: RootState) => state.training.trainingStarted

// Combined training progress selector
export const selectTrainingProgress = (state: RootState) => ({
  progress: state.training.progress,
  taskName: state.training.taskName,
  phase: state.training.phase,
  currentTaskIndex: state.training.currentTaskIndex,
  totalTasks: state.training.totalTasks,
  isActive: state.training.isActive,
  trainingStarted: state.training.trainingStarted,
})

// Tool selectors
export const selectCurrentTool = (state: RootState) => state.training.currentTool
export const selectSelectedTool = (state: RootState) => state.training.selectedTool
export const selectSelectedPipe = (state: RootState) => state.training.selectedPipe
export const selectAirPlugSelected = (state: RootState) => state.training.airPlugSelected

// Question selectors
export const selectCurrentQuestion = (state: RootState) => state.training.currentQuestion
export const selectQuestionTryCount = (state: RootState) => state.training.questionTryCount
export const selectQuestionAnsweredCorrectly = (state: RootState) => state.training.questionAnsweredCorrectly

// Camera selectors
export const selectCameraMode = (state: RootState) => state.training.cameraMode
export const selectCameraPerspective = (state: RootState) => state.training.cameraPerspective
export const selectCameraDistance = (state: RootState) => state.training.cameraDistance

// Explosion selectors
export const selectExplosionValue = (state: RootState) => state.training.explosionValue
export const selectIsAnimating = (state: RootState) => state.training.isAnimating
export const selectExplosionState = (state: RootState) => ({
  explosionValue: state.training.explosionValue,
  isAnimating: state.training.isAnimating,
})

// Layer selectors
export const selectLayers = (state: RootState) => state.training.layers
export const selectHierarchicalGroups = (state: RootState) => state.training.hierarchicalGroups

// Waypoint selectors
export const selectWaypoints = (state: RootState) => state.training.waypoints
export const selectActiveWaypointIndex = (state: RootState) => state.training.activeWaypointIndex
export const selectActiveWaypointName = (state: RootState) => state.training.activeWaypointName

// Combined selectors
export const selectTrainingState = (state: RootState) => state.training

export default trainingSlice.reducer
