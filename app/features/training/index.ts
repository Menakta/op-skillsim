/**
 * Training Feature
 *
 * Training flow, progress tracking, and tool selection.
 */

// Components
export { CompletionPopup } from './components/CompletionPopup'

// Hooks
export { useTrainingState } from './hooks/useTrainingState'
export { useToolSelection } from './hooks/useToolSelection'
export { useFittingOptions } from './hooks/useFittingOptions'
export { useStatePersistence } from './hooks/useStatePersistence'

// Types
export type { TrainingStateData, UseTrainingStateReturn, TrainingStateCallbacks } from './hooks/useTrainingState'
export type { ToolStateData, UseToolSelectionReturn, ToolSelectionCallbacks } from './hooks/useToolSelection'
export type { UseFittingOptionsReturn } from './hooks/useFittingOptions'
export type { StatePersistenceState, UseStatePersistenceOptions, UseStatePersistenceReturn } from './hooks/useStatePersistence'

// Re-export composite hook types from canonical location
export type { TrainingMessageCallbacks, UseTrainingMessagesConfig, TrainingState } from '@/app/hooks/useTrainingMessagesComposite'
