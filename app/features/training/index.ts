/**
 * Training Feature
 *
 * Training flow, progress tracking, tool selection, and composite hook.
 */

// Components
export { CompletionPopup } from './components/CompletionPopup'

// Hooks
export { useTrainingState } from './hooks/useTrainingState'
export { useToolSelection } from './hooks/useToolSelection'
export { useTrainingMessagesComposite } from './hooks/useTrainingMessagesComposite'

// Types
export type { TrainingStateData, UseTrainingStateReturn, TrainingStateCallbacks } from './hooks/useTrainingState'
export type { ToolStateData, UseToolSelectionReturn, ToolSelectionCallbacks } from './hooks/useToolSelection'
export type { TrainingMessageCallbacks, UseTrainingMessagesConfig, TrainingState } from './hooks/useTrainingMessagesComposite'
