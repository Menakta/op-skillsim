/**
 * UI Types
 *
 * Types for UI components, modals, and screens.
 */

// =============================================================================
// Modal Types
// =============================================================================

export interface BaseModalProps {
  isOpen: boolean
  onClose?: () => void
  title?: string
  showCloseButton?: boolean
  className?: string
  size?: ModalSize
  closeButtonColor?: ModalCloseButtonColor
  closeOnBackdropClick?: boolean
}

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

export type ModalCloseButtonColor = 'default' | 'red' | 'teal'

// =============================================================================
// Button Types
// =============================================================================

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost'

export type ButtonSize = 'sm' | 'md' | 'lg'

// =============================================================================
// Theme Types
// =============================================================================

export type Theme = 'light' | 'dark'

export interface ThemeColors {
  bg: string
  bgSecondary: string
  border: string
  text: string
  textSecondary: string
  accent: string
}

// =============================================================================
// Screen State Types
// =============================================================================

export interface ScreenState {
  showStarterScreen: boolean
  showLoadingScreen: boolean
  showNavigationWalkthrough: boolean
  streamStarted: boolean
}

// =============================================================================
// Modal State Types
// =============================================================================

export interface ModalState {
  showQuestionModal: boolean
  showCompletionPopup: boolean
  showPhaseSuccess: boolean
  showErrorModal: boolean
}

export interface CompletedPhase {
  taskId: string
  taskName: string
  nextTaskIndex: number
}

// =============================================================================
// Connection Status Types
// =============================================================================

export type ConnectionStatus = 'initializing' | 'connecting' | 'connected' | 'failed' | 'retrying'

export interface ConnectionState {
  status: ConnectionStatus
  isConnected: boolean
  isRetrying: boolean
  retryCount: number
  maxRetries: number
  initError: string | null
}

// =============================================================================
// Loading State Types
// =============================================================================

export interface LoadingState {
  isLoading: boolean
  message?: string
  progress?: number
}

// =============================================================================
// Tab Types
// =============================================================================

export type ControlPanelTab = 'training' | 'camera' | 'layers' | 'cinematic'

export interface TabConfig {
  id: ControlPanelTab
  label: string
  icon: React.ComponentType<{ size?: number }>
}
