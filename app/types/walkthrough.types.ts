/**
 * Walkthrough Types
 *
 * Type definitions for the walkthrough feature.
 */

// =============================================================================
// Database Types
// =============================================================================

export interface WalkthroughStep {
  id: string
  sequence_order: number
  title: string
  description: string | null
  target_element_id: string | null
  metadata: WalkthroughMetadata | null
  created_at: string
}

export interface WalkthroughMetadata {
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  [key: string]: unknown
}

export interface UserWalkthroughProgress {
  user_id: string
  step_id: string
  completed_at: string
}

// =============================================================================
// API Response Types
// =============================================================================

export interface WalkthroughStepsResponse {
  success: boolean
  steps: WalkthroughStep[]
  completedStepIds?: string[]
  error?: string
}

export interface WalkthroughProgressResponse {
  success: boolean
  progress?: UserWalkthroughProgress
  error?: string
}

// =============================================================================
// Component Props Types
// =============================================================================

export interface CinematicWalkthroughProps {
  onComplete: () => void
  onSkip: () => void
  /** Callback when sidebar should be opened (e.g., when highlighting sidebar) */
  onOpenSidebar?: () => void
  /** Callback when sidebar should be closed */
  onCloseSidebar?: () => void
}

export interface TrainingWalkthroughProps {
  onComplete: () => void
  onSkip: () => void
  /** Callback when sidebar should be opened */
  onOpenSidebar?: () => void
  /** Callback when sidebar should be closed */
  onCloseSidebar?: () => void
}
