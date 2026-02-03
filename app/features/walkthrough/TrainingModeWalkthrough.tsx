'use client'

/**
 * Training Mode Walkthrough Component
 *
 * Wrapper component that uses the unified Walkthrough component
 * for training mode. Fetches steps from the training walkthrough API.
 */

import { useTrainingWalkthrough } from './useTrainingWalkthrough'
import { Walkthrough } from './Walkthrough'
import type { TrainingWalkthroughProps } from '@/app/types'

// =============================================================================
// Component
// =============================================================================

export function TrainingModeWalkthrough({
  onComplete,
  onSkip,
  onOpenSidebar,
  onCloseSidebar,
}: TrainingWalkthroughProps) {
  const {
    steps,
    currentStepIndex,
    isLoading,
    isComplete,
    nextStep,
    previousStep,
    skip,
  } = useTrainingWalkthrough({
    autoFetch: true,
    onComplete,
    onSkip,
  })

  return (
    <Walkthrough
      mode="training"
      steps={steps}
      currentStepIndex={currentStepIndex}
      isLoading={isLoading}
      isComplete={isComplete}
      onNext={nextStep}
      onPrevious={previousStep}
      onSkip={skip}
      onOpenSidebar={onOpenSidebar}
      onCloseSidebar={onCloseSidebar}
    />
  )
}

export default TrainingModeWalkthrough
