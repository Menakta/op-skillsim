'use client'

/**
 * Modal Manager Hook
 *
 * Centralized modal state management for StreamingApp.
 * Reduces multiple useState calls to a single state object.
 *
 * Benefits:
 * - Single source of truth for modal visibility
 * - Type-safe modal operations
 * - Easier to add new modals
 * - Prevents multiple modals from conflicting
 */

import { useState, useCallback, useMemo } from 'react'
import type { QuestionData } from '@/app/lib/messageTypes'

// =============================================================================
// Types
// =============================================================================

export type ModalType =
  | 'question'
  | 'trainingComplete'
  | 'phaseSuccess'
  | 'error'
  | 'navigationWalkthrough'
  | 'resumeConfirmation'
  | 'sessionEnd'
  | 'sessionExpiry'
  | 'quitTraining'
  // Note: IdleWarningModal is controlled by useIdleDetection hook, not this manager

// Modal-specific data types
export interface PhaseSuccessData {
  taskId: string
  taskName: string
  nextTaskIndex: number
}

export interface SessionEndData {
  reason: 'expired' | 'logged_out' | 'inactive' | 'kicked' | 'other'
}

export interface ErrorData {
  message: string | null
}

export interface ResumeData {
  phaseIndex: number
}

// Combined modal state
export interface ModalState {
  activeModal: ModalType | null

  // Modal-specific data
  questionData: QuestionData | null
  phaseSuccessData: PhaseSuccessData | null
  sessionEndData: SessionEndData
  errorData: ErrorData
  resumeData: ResumeData
}

export interface UseModalManagerReturn {
  // State
  state: ModalState

  // Query helpers
  isOpen: (modal: ModalType) => boolean
  activeModal: ModalType | null

  // Modal openers (with optional data)
  openQuestion: (question: QuestionData) => void
  openTrainingComplete: () => void
  openPhaseSuccess: (data: PhaseSuccessData) => void
  openError: (message?: string | null) => void
  openNavigationWalkthrough: () => void
  openResumeConfirmation: (phaseIndex: number) => void
  openSessionEnd: (reason: SessionEndData['reason']) => void
  openSessionExpiry: () => void
  openQuitTraining: () => void

  // Close modal
  close: () => void
  closeModal: (modal: ModalType) => void

  // Direct state access for backward compatibility
  showingQuestion: QuestionData | null
  completedPhase: PhaseSuccessData | null
  sessionEndReason: SessionEndData['reason']
  initError: string | null
  resumePhaseIndex: number
}

// =============================================================================
// Initial State
// =============================================================================

const initialState: ModalState = {
  activeModal: null,
  questionData: null,
  phaseSuccessData: null,
  sessionEndData: { reason: 'other' },
  errorData: { message: null },
  resumeData: { phaseIndex: 0 },
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useModalManager(): UseModalManagerReturn {
  const [state, setState] = useState<ModalState>(initialState)

  // ==========================================================================
  // Query Helpers
  // ==========================================================================

  const isOpen = useCallback((modal: ModalType): boolean => {
    return state.activeModal === modal
  }, [state.activeModal])

  // ==========================================================================
  // Modal Openers
  // ==========================================================================

  const openQuestion = useCallback((question: QuestionData) => {
    setState(prev => ({
      ...prev,
      activeModal: 'question',
      questionData: question,
    }))
  }, [])

  const openTrainingComplete = useCallback(() => {
    setState(prev => ({
      ...prev,
      activeModal: 'trainingComplete',
    }))
  }, [])

  const openPhaseSuccess = useCallback((data: PhaseSuccessData) => {
    setState(prev => ({
      ...prev,
      activeModal: 'phaseSuccess',
      phaseSuccessData: data,
    }))
  }, [])

  const openError = useCallback((message?: string | null) => {
    setState(prev => ({
      ...prev,
      activeModal: 'error',
      errorData: { message: message ?? null },
    }))
  }, [])

  const openNavigationWalkthrough = useCallback(() => {
    setState(prev => ({
      ...prev,
      activeModal: 'navigationWalkthrough',
    }))
  }, [])

  const openResumeConfirmation = useCallback((phaseIndex: number) => {
    setState(prev => ({
      ...prev,
      activeModal: 'resumeConfirmation',
      resumeData: { phaseIndex },
    }))
  }, [])

  const openSessionEnd = useCallback((reason: SessionEndData['reason']) => {
    setState(prev => ({
      ...prev,
      activeModal: 'sessionEnd',
      sessionEndData: { reason },
    }))
  }, [])

  const openSessionExpiry = useCallback(() => {
    setState(prev => ({
      ...prev,
      activeModal: 'sessionExpiry',
    }))
  }, [])

  const openQuitTraining = useCallback(() => {
    setState(prev => ({
      ...prev,
      activeModal: 'quitTraining',
    }))
  }, [])

  // ==========================================================================
  // Close Modals
  // ==========================================================================

  const close = useCallback(() => {
    setState(prev => ({
      ...prev,
      activeModal: null,
      // Clear question data when closing question modal
      questionData: prev.activeModal === 'question' ? null : prev.questionData,
    }))
  }, [])

  const closeModal = useCallback((modal: ModalType) => {
    setState(prev => {
      if (prev.activeModal !== modal) return prev
      return {
        ...prev,
        activeModal: null,
        questionData: modal === 'question' ? null : prev.questionData,
      }
    })
  }, [])

  // ==========================================================================
  // Return
  // ==========================================================================

  return useMemo(() => ({
    state,
    isOpen,
    activeModal: state.activeModal,

    // Openers
    openQuestion,
    openTrainingComplete,
    openPhaseSuccess,
    openError,
    openNavigationWalkthrough,
    openResumeConfirmation,
    openSessionEnd,
    openSessionExpiry,
    openQuitTraining,

    // Closers
    close,
    closeModal,

    // Backward compatibility accessors
    showingQuestion: state.questionData,
    completedPhase: state.phaseSuccessData,
    sessionEndReason: state.sessionEndData.reason,
    initError: state.errorData.message,
    resumePhaseIndex: state.resumeData.phaseIndex,
  }), [
    state,
    isOpen,
    openQuestion,
    openTrainingComplete,
    openPhaseSuccess,
    openError,
    openNavigationWalkthrough,
    openResumeConfirmation,
    openSessionEnd,
    openSessionExpiry,
    openQuitTraining,
    close,
    closeModal,
  ])
}

export default useModalManager
