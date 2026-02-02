'use client'

/**
 * Cinematic Walkthrough Component
 *
 * Displays walkthrough steps during cinematic mode.
 * Fetches steps from database and guides users through the interface.
 */

import { useEffect, useRef } from 'react'
import { ChevronRight } from 'lucide-react'
import { useWalkthrough } from './useWalkthrough'
import type { CinematicWalkthroughProps, WalkthroughMetadata } from '@/app/types'

// =============================================================================
// Constants - Element IDs that require sidebar to be open
// =============================================================================

const SIDEBAR_ELEMENT_IDS = ['sidebar', 'sidebar-menu', 'unified-sidebar']

// =============================================================================
// Helper: Get position classes based on metadata
// =============================================================================

function getPositionClasses(metadata: WalkthroughMetadata | null, targetElementId: string | null): string {
  const position = metadata?.position || 'center'

  // For sidebar, position tooltip to the right of it
  if (targetElementId === 'sidebar') {
    return 'left-72 top-1/3 -translate-y-1/2'
  }

  // For skip to training button (top of screen), position tooltip below it
  if (targetElementId === 'btn-skip-to-training') {
    return 'top-28 left-1/2 -translate-x-1/2'
  }

  switch (position) {
    case 'top':
      return 'top-24 left-1/2 -translate-x-1/2'
    case 'bottom':
      return 'bottom-24 left-1/2 -translate-x-1/2'
    case 'left':
      return 'left-72 top-1/2 -translate-y-1/2'
    case 'right':
      return 'right-24 top-1/2 -translate-y-1/2'
    case 'center':
    default:
      return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
  }
}

// =============================================================================
// Helper: Check if target element requires sidebar open
// =============================================================================

function requiresSidebarOpen(targetElementId: string | null): boolean {
  if (!targetElementId) return false
  return SIDEBAR_ELEMENT_IDS.includes(targetElementId.toLowerCase())
}

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
    currentStep,
    isLoading,
    isComplete,
    isFirstStep,
    isLastStep,
    totalSteps,
    nextStep,
    previousStep,
    skip,
  } = useWalkthrough({
    autoFetch: true,
    onComplete,
    onSkip,
  })

  // Ref for highlighted element
  const highlightRef = useRef<HTMLDivElement>(null)

  // Open/close sidebar based on current step's target element
  useEffect(() => {
    if (!currentStep) return

    const needsSidebar = requiresSidebarOpen(currentStep.target_element_id)

    if (needsSidebar) {
      onOpenSidebar?.()
    } else {
      onCloseSidebar?.()
    }
  }, [currentStep, onOpenSidebar, onCloseSidebar])

  // Highlight target element when step changes
  useEffect(() => {
    if (!currentStep?.target_element_id) {
      if (highlightRef.current) {
        highlightRef.current.style.display = 'none'
      }
      return
    }

    // Small delay to allow sidebar to open before measuring element position
    const timer = setTimeout(() => {
      const targetElement = document.getElementById(currentStep.target_element_id!)
      if (targetElement && highlightRef.current) {
        const rect = targetElement.getBoundingClientRect()
        highlightRef.current.style.top = `${rect.top - 4}px`
        highlightRef.current.style.left = `${rect.left - 4}px`
        highlightRef.current.style.width = `${rect.width + 8}px`
        highlightRef.current.style.height = `${rect.height + 8}px`
        highlightRef.current.style.display = 'block'
      } else if (highlightRef.current) {
        highlightRef.current.style.display = 'none'
      }
    }, 350) // Wait for sidebar animation to complete

    return () => clearTimeout(timer)
  }, [currentStep])

  // Close sidebar when walkthrough completes or is skipped
  const handleSkip = () => {
    onCloseSidebar?.()
    skip()
  }

  const handleNext = () => {
    // If this is the last step, close sidebar before completing
    if (isLastStep) {
      onCloseSidebar?.()
    }
    nextStep()
  }

  // Don't render if complete or loading with no steps
  if (isComplete) {
    return null
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[2147483646] flex items-center justify-center pointer-events-none">
        <div className="bg-black/50 rounded-xl shadow-xl p-6 max-w-[400px] w-[calc(100%-2rem)]">
          <p className="text-gray-200 text-center">Loading walkthrough...</p>
        </div>
      </div>
    )
  }

  // No steps available
  if (steps.length === 0) {
    return null
  }

  // No current step (shouldn't happen but safety check)
  if (!currentStep) {
    return null
  }

  const positionClasses = getPositionClasses(currentStep.metadata, currentStep.target_element_id)
  const hasTargetElement = !!currentStep.target_element_id

  return (
    <>
      {/* Dark overlay - only show when no target element (spotlight handles blur when target exists) */}
      {!hasTargetElement && (
        <div className="fixed inset-0 z-[2147483645] bg-black/70 pointer-events-none" />
      )}

      {/* Highlight box for target element - creates spotlight effect with blur around it */}
      <div
        ref={highlightRef}
        className="fixed z-[2147483646] border-2 border-[#39BEAE] rounded-lg pointer-events-none hidden"
        style={{
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75)',
          transition: 'all 0.3s ease-in-out',
        }}
      />

      {/* Walkthrough Card */}
      <div
        className={`fixed z-[2147483647] ${positionClasses}`}
      >
        <div className="bg-black/50 rounded-xl shadow-2xl p-6 max-w-[420px] w-[calc(100vw-2rem)] md:w-full backdrop-blur-sm">
          {/* Header */}
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-[22px] font-bold text-gray-100 leading-tight pr-4">
              {currentStep.title}
            </h3>
            <span className="text-sm text-gray-200 font-medium whitespace-nowrap">
              {currentStepIndex + 1}/{totalSteps}
            </span>
          </div>

          {/* Description */}
          {currentStep.description && (
            <p className="text-gray-300 mb-6 leading-relaxed">
              {currentStep.description}
            </p>
          )}

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-5">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStepIndex
                    ? 'bg-[#39BEAE]'
                    : index < currentStepIndex
                    ? 'bg-[#39BEAE]/50'
                    : 'bg-gray-100'
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center">
            <button
              onClick={handleSkip}
              className="text-gray-300 hover:text-gray-400 transition-colors text-sm"
            >
              Skip Tour
            </button>

            <div className="flex items-center gap-3">
              {!isFirstStep && (
                <button
                  onClick={previousStep}
                  className="text-[#39BEAE] hover:text-[#2da89a] transition-colors font-medium"
                >
                  Previous
                </button>
              )}
              <button
                onClick={handleNext}
                className="flex items-center gap-1 bg-[#39BEAE] hover:bg-[#2da89a] text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                {isLastStep ? 'Get Started' : 'Next'}
                {!isLastStep && <ChevronRight size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default CinematicWalkthrough
