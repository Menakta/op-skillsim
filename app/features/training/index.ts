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

// Types
export type { TrainingStateData, UseTrainingStateReturn, TrainingStateCallbacks } from './hooks/useTrainingState'
export type { ToolStateData, UseToolSelectionReturn, ToolSelectionCallbacks } from './hooks/useToolSelection'

// Re-export composite hook types from canonical location
export type { TrainingMessageCallbacks, UseTrainingMessagesConfig, TrainingState } from '@/app/hooks/useTrainingMessagesComposite'
