'use client'

/**
 * Cinematic Walkthrough Component
 *
 * Wrapper component that uses the unified Walkthrough component
 * for cinematic mode. Fetches steps from the cinematic walkthrough API.
 */

import { useWalkthrough } from './useWalkthrough'
import { Walkthrough } from './Walkthrough'
import type { CinematicWalkthroughProps } from '@/app/types'

// =============================================================================
// Component
// =============================================================================

export function CinematicWalkthrough({
  onComplete,
  onSkip,
  onOpenSidebar,
  onCloseSidebar,
}: CinematicWalkthroughProps) {
  const {
    steps,
    currentStepIndex,
    isLoading,
    isComplete,
    nextStep,
    previousStep,
    skip,
  } = useWalkthrough({
    autoFetch: true,
    onComplete,
    onSkip,
  })

  return (
    <Walkthrough
      mode="cinematic"
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

export default CinematicWalkthrough
