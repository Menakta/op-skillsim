'use client'

/**
 * Training Walkthrough Hook
 *
 * Manages walkthrough state for training mode.
 * Only shows when transitioning from cinematic to training (not for resume sessions).
 */

import { useState, useEffect, useCallback } from 'react'
import type { WalkthroughStep } from '@/app/types'

// =============================================================================
// Types
// =============================================================================

interface UseTrainingWalkthroughOptions {
  /** Whether to auto-fetch steps on mount */
  autoFetch?: boolean
  /** Callback when walkthrough is completed */
  onComplete?: () => void
  /** Callback when walkthrough is skipped */
  onSkip?: () => void
  /** Whether this is an LTI session - if true, always show walkthrough (clear localStorage) */
  isLtiSession?: boolean
}

interface UseTrainingWalkthroughReturn {
  /** All walkthrough steps */
  steps: WalkthroughStep[]
  /** Current step index (0-based) */
  currentStepIndex: number
  /** Current step data */
  currentStep: WalkthroughStep | null
  /** Whether walkthrough is loading */
  isLoading: boolean
  /** Whether walkthrough has been completed */
  isComplete: boolean
  /** Whether this is the first step */
  isFirstStep: boolean
  /** Whether this is the last step */
  isLastStep: boolean
  /** Total number of steps */
  totalSteps: number
  /** Go to next step */
  nextStep: () => void
  /** Go to previous step */
  previousStep: () => void
  /** Skip the entire walkthrough */
  skip: () => void
  /** Reset to first step */
  reset: () => void
  /** Fetch steps from API */
  fetchSteps: () => Promise<void>
}

// =============================================================================
// Local Storage Key
// =============================================================================

const TRAINING_WALKTHROUGH_COMPLETED_KEY = 'op-skillsim-training-walkthrough-completed'

// =============================================================================
// Hook Implementation
// =============================================================================

export function useTrainingWalkthrough(options: UseTrainingWalkthroughOptions = {}): UseTrainingWalkthroughReturn {
  const { autoFetch = true, onComplete, onSkip, isLtiSession } = options

  const [steps, setSteps] = useState<WalkthroughStep[]>([])
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isComplete, setIsComplete] = useState(false)

  // For LTI sessions, always clear the walkthrough completed state
  // This ensures the walkthrough shows on every new LTI launch
  useEffect(() => {
    if (typeof window !== 'undefined' && isLtiSession) {
      localStorage.removeItem(TRAINING_WALKTHROUGH_COMPLETED_KEY)
    }
  }, [isLtiSession])

  // Check if walkthrough was already completed (only for non-LTI sessions)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // For LTI sessions, explicitly set isComplete to false so walkthrough shows
      if (isLtiSession) {
        setIsComplete(false)
        setIsLoading(false)
        return
      }
      const completed = localStorage.getItem(TRAINING_WALKTHROUGH_COMPLETED_KEY)
      if (completed === 'true') {
        setIsComplete(true)
        setIsLoading(false)
      }
    }
  }, [isLtiSession])

  // Fetch steps from API
  const fetchSteps = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/walkthrough/training')
      const data = await response.json()

      if (data.success && data.steps) {
        setSteps(data.steps)
      } else {
        console.error('Failed to fetch training walkthrough steps:', data.error)
      }
    } catch (error) {
      console.error('Error fetching training walkthrough steps:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Auto-fetch on mount if enabled and not already completed
  useEffect(() => {
    if (autoFetch && !isComplete) {
      fetchSteps()
    }
  }, [autoFetch, isComplete, fetchSteps])

  // Computed values
  const currentStep = steps[currentStepIndex] || null
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === steps.length - 1
  const totalSteps = steps.length

  // Mark as completed and save to localStorage
  const markComplete = useCallback(() => {
    setIsComplete(true)
    if (typeof window !== 'undefined') {
      localStorage.setItem(TRAINING_WALKTHROUGH_COMPLETED_KEY, 'true')
    }
    onComplete?.()
  }, [onComplete])

  // Navigation functions
  const nextStep = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1)
    } else {
      // Last step - mark as complete
      markComplete()
    }
  }, [currentStepIndex, steps.length, markComplete])

  const previousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1)
    }
  }, [currentStepIndex])

  const skip = useCallback(() => {
    markComplete()
    onSkip?.()
  }, [markComplete, onSkip])

  const reset = useCallback(() => {
    setCurrentStepIndex(0)
    setIsComplete(false)
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TRAINING_WALKTHROUGH_COMPLETED_KEY)
    }
  }, [])

  return {
    steps,
    currentStepIndex,
    currentStep,
    isLoading,
    isComplete,
    isFirstStep,
    isLastStep,
    totalSteps,
    nextStep,
    previousStep,
    skip,
    reset,
    fetchSteps,
  }
}

export default useTrainingWalkthrough
