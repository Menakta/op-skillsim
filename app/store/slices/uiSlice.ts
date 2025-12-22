/**
 * UI Slice
 *
 * Manages UI state: modals, screens, loading states, etc.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../index'
import type { QuestionData } from '@/app/lib/messageTypes'

// =============================================================================
// State Types
// =============================================================================

export interface CompletedPhase {
  taskId: string
  taskName: string
  nextTaskIndex: number
}

export interface UiSliceState {
  // Theme
  isDark: boolean

  // Screens
  showStarterScreen: boolean
  showLoadingScreen: boolean
  showNavigationWalkthrough: boolean

  // Modals
  showQuestionModal: boolean
  currentQuestionData: QuestionData | null
  showCompletionPopup: boolean
  showPhaseSuccess: boolean
  completedPhase: CompletedPhase | null
  showErrorModal: boolean
  errorMessage: string | null

  // Stream state
  streamStarted: boolean
}

// =============================================================================
// Initial State
// =============================================================================

const initialState: UiSliceState = {
  // Theme
  isDark: true,

  // Screens
  showStarterScreen: true,
  showLoadingScreen: false,
  showNavigationWalkthrough: false,

  // Modals
  showQuestionModal: false,
  currentQuestionData: null,
  showCompletionPopup: false,
  showPhaseSuccess: false,
  completedPhase: null,
  showErrorModal: false,
  errorMessage: null,

  // Stream state
  streamStarted: false,
}

// =============================================================================
// Slice Definition
// =============================================================================

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Theme
    setIsDark: (state, action: PayloadAction<boolean>) => {
      state.isDark = action.payload
    },

    toggleTheme: (state) => {
      state.isDark = !state.isDark
    },

    // Starter Screen
    setShowStarterScreen: (state, action: PayloadAction<boolean>) => {
      state.showStarterScreen = action.payload
    },

    // Loading Screen
    setShowLoadingScreen: (state, action: PayloadAction<boolean>) => {
      state.showLoadingScreen = action.payload
    },

    // Navigation Walkthrough
    setShowNavigationWalkthrough: (state, action: PayloadAction<boolean>) => {
      state.showNavigationWalkthrough = action.payload
    },

    // Question Modal
    openQuestionModal: (state, action: PayloadAction<QuestionData>) => {
      state.showQuestionModal = true
      state.currentQuestionData = action.payload
    },

    closeQuestionModal: (state) => {
      state.showQuestionModal = false
      state.currentQuestionData = null
    },

    // Completion Popup
    setShowCompletionPopup: (state, action: PayloadAction<boolean>) => {
      state.showCompletionPopup = action.payload
    },

    // Phase Success Modal
    openPhaseSuccess: (state, action: PayloadAction<CompletedPhase>) => {
      state.showPhaseSuccess = true
      state.completedPhase = action.payload
    },

    closePhaseSuccess: (state) => {
      state.showPhaseSuccess = false
      state.completedPhase = null
    },

    // Error Modal
    openErrorModal: (state, action: PayloadAction<string>) => {
      state.showErrorModal = true
      state.errorMessage = action.payload
    },

    closeErrorModal: (state) => {
      state.showErrorModal = false
      state.errorMessage = null
    },

    // Stream State
    setStreamStarted: (state, action: PayloadAction<boolean>) => {
      state.streamStarted = action.payload
    },

    // Start stream flow
    startStreamFlow: (state) => {
      state.showStarterScreen = false
      state.streamStarted = true
    },

    // Reset to starter screen
    resetToStarterScreen: (state) => {
      state.showStarterScreen = true
      state.showLoadingScreen = false
      state.showNavigationWalkthrough = false
      state.streamStarted = false
      state.showCompletionPopup = false
      state.showPhaseSuccess = false
      state.completedPhase = null
      state.showErrorModal = false
      state.errorMessage = null
    },

    // Reset all UI state
    resetUi: () => initialState,
  },
})

// =============================================================================
// Actions Export
// =============================================================================

export const {
  setIsDark,
  toggleTheme,
  setShowStarterScreen,
  setShowLoadingScreen,
  setShowNavigationWalkthrough,
  openQuestionModal,
  closeQuestionModal,
  setShowCompletionPopup,
  openPhaseSuccess,
  closePhaseSuccess,
  openErrorModal,
  closeErrorModal,
  setStreamStarted,
  startStreamFlow,
  resetToStarterScreen,
  resetUi,
} = uiSlice.actions

// =============================================================================
// Selectors
// =============================================================================

// Theme
export const selectIsDark = (state: RootState) => state.ui.isDark

// Screens
export const selectShowStarterScreen = (state: RootState) => state.ui.showStarterScreen
export const selectShowLoadingScreen = (state: RootState) => state.ui.showLoadingScreen
export const selectShowNavigationWalkthrough = (state: RootState) => state.ui.showNavigationWalkthrough

// Question Modal
export const selectShowQuestionModal = (state: RootState) => state.ui.showQuestionModal
export const selectCurrentQuestionData = (state: RootState) => state.ui.currentQuestionData

// Completion
export const selectShowCompletionPopup = (state: RootState) => state.ui.showCompletionPopup
export const selectShowPhaseSuccess = (state: RootState) => state.ui.showPhaseSuccess
export const selectCompletedPhase = (state: RootState) => state.ui.completedPhase

// Error
export const selectShowErrorModal = (state: RootState) => state.ui.showErrorModal
export const selectErrorMessage = (state: RootState) => state.ui.errorMessage

// Stream
export const selectStreamStarted = (state: RootState) => state.ui.streamStarted

// Combined
export const selectUiState = (state: RootState) => state.ui

export default uiSlice.reducer
