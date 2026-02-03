/**
 * Walkthrough Feature
 *
 * Exports for the walkthrough feature module.
 */

// Unified Walkthrough Component
export { Walkthrough } from './Walkthrough'
export type { WalkthroughProps, WalkthroughMode } from './Walkthrough'

// Mode-specific wrappers
export { CinematicWalkthrough } from './CinematicWalkthrough'
export { TrainingModeWalkthrough } from './TrainingModeWalkthrough'

// Hooks
export { useWalkthrough } from './useWalkthrough'
export { useTrainingWalkthrough } from './useTrainingWalkthrough'
