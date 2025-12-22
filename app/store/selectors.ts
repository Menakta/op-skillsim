/**
 * Redux Selectors
 *
 * Memoized selectors for accessing store state.
 * Components should use these selectors for optimized re-renders.
 */

import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from './index'

// =============================================================================
// Training Selectors
// =============================================================================

// Base selector
const selectTraining = (state: RootState) => state.training

// Memoized combined selectors
export const selectTrainingProgress = createSelector(
  [selectTraining],
  (training) => ({
    progress: training.progress,
    taskName: training.taskName,
    phase: training.phase,
    currentTaskIndex: training.currentTaskIndex,
    totalTasks: training.totalTasks,
    isActive: training.isActive,
    trainingStarted: training.trainingStarted,
  })
)

export const selectToolState = createSelector(
  [selectTraining],
  (training) => ({
    currentTool: training.currentTool,
    selectedTool: training.selectedTool,
    selectedPipe: training.selectedPipe,
    airPlugSelected: training.airPlugSelected,
  })
)

export const selectQuestionState = createSelector(
  [selectTraining],
  (training) => ({
    currentQuestion: training.currentQuestion,
    questionTryCount: training.questionTryCount,
    questionAnsweredCorrectly: training.questionAnsweredCorrectly,
  })
)

export const selectCameraState = createSelector(
  [selectTraining],
  (training) => ({
    cameraMode: training.cameraMode,
    cameraPerspective: training.cameraPerspective,
    cameraDistance: training.cameraDistance,
  })
)

export const selectExplosionState = createSelector(
  [selectTraining],
  (training) => ({
    explosionValue: training.explosionValue,
    isAnimating: training.isAnimating,
  })
)

export const selectLayerState = createSelector(
  [selectTraining],
  (training) => ({
    layers: training.layers,
    hierarchicalGroups: training.hierarchicalGroups,
  })
)

export const selectWaypointState = createSelector(
  [selectTraining],
  (training) => ({
    waypoints: training.waypoints,
    activeWaypointIndex: training.activeWaypointIndex,
    activeWaypointName: training.activeWaypointName,
  })
)

// =============================================================================
// UI Selectors
// =============================================================================

const selectUi = (state: RootState) => state.ui

export const selectScreenState = createSelector(
  [selectUi],
  (ui) => ({
    showStarterScreen: ui.showStarterScreen,
    showLoadingScreen: ui.showLoadingScreen,
    showNavigationWalkthrough: ui.showNavigationWalkthrough,
    streamStarted: ui.streamStarted,
  })
)

export const selectModalState = createSelector(
  [selectUi],
  (ui) => ({
    showQuestionModal: ui.showQuestionModal,
    currentQuestionData: ui.currentQuestionData,
    showCompletionPopup: ui.showCompletionPopup,
    showPhaseSuccess: ui.showPhaseSuccess,
    completedPhase: ui.completedPhase,
    showErrorModal: ui.showErrorModal,
    errorMessage: ui.errorMessage,
  })
)

// =============================================================================
// Connection Selectors
// =============================================================================

const selectConnection = (state: RootState) => state.connection

export const selectConnectionInfo = createSelector(
  [selectConnection],
  (connection) => ({
    status: connection.status,
    isConnected: connection.isConnected,
    isRetrying: connection.isRetrying,
    retryCount: connection.retryCount,
    maxRetries: connection.maxRetries,
    initError: connection.initError,
  })
)

export const selectMessageLogState = createSelector(
  [selectConnection],
  (connection) => ({
    messageLog: connection.messageLog,
    lastMessage: connection.lastMessage,
  })
)

// =============================================================================
// Cross-Slice Selectors
// =============================================================================

export const selectIsTrainingComplete = createSelector(
  [selectTraining],
  (training) => training.currentTaskIndex >= training.totalTasks
)

export const selectIsCinematicMode = createSelector(
  [selectTraining],
  (training) => training.mode === 'cinematic'
)
