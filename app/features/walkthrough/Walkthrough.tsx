'use client'

/**
 * Unified Walkthrough Component
 *
 * A single, reusable walkthrough component that can be used for both
 * cinematic and training modes. Features a modern, intuitive design
 * with smooth animations and spotlight effects.
 */

import { useEffect, useRef, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import type { WalkthroughStep, WalkthroughMetadata } from '@/app/types'

// =============================================================================
// Types
// =============================================================================

export type WalkthroughMode = 'cinematic' | 'training'

export interface WalkthroughProps {
  /** Walkthrough mode - affects styling and button labels */
  mode: WalkthroughMode
  /** All walkthrough steps */
  steps: WalkthroughStep[]
  /** Current step index (0-based) */
  currentStepIndex: number
  /** Whether walkthrough is loading */
  isLoading: boolean
  /** Whether walkthrough has been completed */
  isComplete: boolean
  /** Go to next step */
  onNext: () => void
  /** Go to previous step */
  onPrevious: () => void
  /** Skip the entire walkthrough */
  onSkip: () => void
  /** Callback when sidebar should be opened */
  onOpenSidebar?: () => void
  /** Callback when sidebar should be closed */
  onCloseSidebar?: () => void
}

// =============================================================================
// Constants - Element IDs that require sidebar to be open
// =============================================================================

const SIDEBAR_ELEMENT_IDS = [
  'sidebar',
  'sidebar-menu',
  'unified-sidebar',
  'materials',
  'inventory',
  'tab-inventory'
]

// =============================================================================
// Helper: Get position classes based on metadata and target element
// =============================================================================

function getPositionClasses(metadata: WalkthroughMetadata | null, targetElementId: string | null): string {
  const position = metadata?.position || 'center'

  // For inventory/materials, position tooltip to the right of sidebar
  if (targetElementId === 'tab-inventory' || targetElementId === 'materials' || targetElementId === 'inventory') {
    return 'left-56 top-32'
  }

  // For sidebar, position tooltip to the right of it
  if (targetElementId === 'sidebar' || targetElementId === 'unified-sidebar') {
    return 'left-72 top-1/3 -translate-y-1/2'
  }

  // For skip to training button (top of screen), position tooltip below it
  if (targetElementId === 'btn-skip-to-training') {
    return 'top-28 left-1/2 -translate-x-1/2'
  }

  // For toolbar (bottom of screen), position tooltip above it
  if (targetElementId === 'toolbar') {
    return 'bottom-32 left-1/2 -translate-x-1/2'
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

export function Walkthrough({
  mode,
  steps,
  currentStepIndex,
  isLoading,
  isComplete,
  onNext,
  onPrevious,
  onSkip,
  onOpenSidebar,
  onCloseSidebar,
}: WalkthroughProps) {
  // Refs
  const highlightRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  // Computed values
  const currentStep = steps[currentStepIndex] || null
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === steps.length - 1
  const totalSteps = steps.length

  // Get button labels based on mode
  const getFinishLabel = () => {
    return mode === 'training' ? 'Start Training' : 'Get Started'
  }

  // Open sidebar when step requires it
  useEffect(() => {
    if (!currentStep) return

    const needsSidebar = requiresSidebarOpen(currentStep.target_element_id)
    if (needsSidebar) {
      const timer = setTimeout(() => {
        onOpenSidebar?.()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [currentStep, onOpenSidebar])

  // Highlight target element when step changes
  useEffect(() => {
    if (!currentStep?.target_element_id) {
      if (highlightRef.current) {
        highlightRef.current.style.display = 'none'
      }
      return
    }

    const needsSidebar = requiresSidebarOpen(currentStep.target_element_id)
    const delay = needsSidebar ? 500 : 350

    const timer = setTimeout(() => {
      const targetElement = document.getElementById(currentStep.target_element_id!)
      if (targetElement && highlightRef.current) {
        const rect = targetElement.getBoundingClientRect()
        highlightRef.current.style.top = `${rect.top - 6}px`
        highlightRef.current.style.left = `${rect.left - 6}px`
        highlightRef.current.style.width = `${rect.width + 12}px`
        highlightRef.current.style.height = `${rect.height + 12}px`
        highlightRef.current.style.display = 'block'
      } else if (highlightRef.current) {
        highlightRef.current.style.display = 'none'
      }
    }, delay)

    return () => clearTimeout(timer)
  }, [currentStep])

  // Navigation handlers with sidebar close
  const handleSkip = useCallback(() => {
    onCloseSidebar?.()
    onSkip()
  }, [onCloseSidebar, onSkip])

  const handlePrevious = useCallback(() => {
    onCloseSidebar?.()
    onPrevious()
  }, [onCloseSidebar, onPrevious])

  const handleNext = useCallback(() => {
    onCloseSidebar?.()
    onNext()
  }, [onCloseSidebar, onNext])

  // Don't render if complete
  if (isComplete) {
    return null
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[2147483646] flex items-center justify-center pointer-events-none">
        <div className="animate-pulse flex items-center gap-2 text-white/60">
          <Sparkles className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    )
  }

  // No steps available
  if (steps.length === 0 || !currentStep) {
    return null
  }

  const positionClasses = getPositionClasses(currentStep.metadata, currentStep.target_element_id)
  const hasTargetElement = !!currentStep.target_element_id

  return (
    <>
      {/* Dark overlay - only show when no target element */}
      {!hasTargetElement && (
        <div
          className="fixed inset-0 z-[2147483645] bg-black/80 pointer-events-none animate-fade-in"
        />
      )}

      {/* Spotlight highlight for target element */}
      <div
        ref={highlightRef}
        className="fixed z-[2147483646] rounded-xl pointer-events-none hidden"
        style={{
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.8)',
          border: '2px solid #39BEAE',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Animated glow effect */}
        <div
          className="absolute inset-0 rounded-xl animate-pulse"
          style={{
            boxShadow: '0 0 20px 4px rgba(57, 190, 174, 0.4)',
          }}
        />
      </div>

      {/* Walkthrough Card */}
      <div
        ref={cardRef}
        className={`fixed z-[2147483647] ${positionClasses} animate-slide-up`}
      >
        <div className="relative bg-gradient-to-br from-gray-900/95 via-gray-900/90 to-gray-800/95 rounded-2xl shadow-2xl backdrop-blur-xl border border-white/10 overflow-hidden max-w-[380px] w-[calc(100vw-2rem)]">
          {/* Decorative gradient line at top */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#39BEAE] via-[#4fd1c5] to-[#39BEAE]" />

          {/* Close/Skip button */}
          <button
            onClick={handleSkip}
            className="absolute top-3 right-3 p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-all"
            title="Skip walkthrough"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Content */}
          <div className="p-5 pt-6">
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#39BEAE]/20 text-[#39BEAE] text-xs font-bold">
                {currentStepIndex + 1}
              </div>
              <span className="text-xs text-gray-400 font-medium">
                of {totalSteps}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold text-white mb-2 leading-snug">
              {currentStep.title}
            </h3>

            {/* Description */}
            {currentStep.description && (
              <p className="text-sm text-gray-300 leading-relaxed mb-5">
                {currentStep.description}
              </p>
            )}

            {/* Progress bar */}
            <div className="relative h-1 bg-gray-700/50 rounded-full mb-5 overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#39BEAE] to-[#4fd1c5] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
              />
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between">
              {/* Previous button */}
              <div className="w-20">
                {!isFirstStep && (
                  <button
                    onClick={handlePrevious}
                    className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors group"
                  >
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    Back
                  </button>
                )}
              </div>

              {/* Step dots */}
              <div className="flex items-center gap-1.5">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={`rounded-full transition-all duration-300 ${
                      index === currentStepIndex
                        ? 'w-6 h-1.5 bg-[#39BEAE]'
                        : index < currentStepIndex
                        ? 'w-1.5 h-1.5 bg-[#39BEAE]/60'
                        : 'w-1.5 h-1.5 bg-gray-600'
                    }`}
                  />
                ))}
              </div>

              {/* Next/Finish button */}
              <button
                onClick={handleNext}
                className="flex items-center gap-1 px-4 py-2 bg-[#39BEAE] hover:bg-[#2da89a] text-white text-sm font-medium rounded-lg transition-all hover:shadow-lg hover:shadow-[#39BEAE]/20 group"
              >
                {isLastStep ? getFinishLabel() : 'Next'}
                {!isLastStep && (
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CSS animations */}
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
        .animate-slide-up {
          animation: slide-up 0.4s ease-out forwards;
        }
      `}</style>
    </>
  )
}

export default Walkthrough
