/**
 * UI Components Export
 *
 * Barrel file for all teacher dashboard UI components.
 */

export * from './Card'
export * from './StatCard'
export * from './Table'
export * from './Badge'
export * from './ProgressBar'
export * from './SearchInput'
export * from './EmptyState'
export * from './LoadingState'
export * from './Pagination'
export * from './DataTable'
export * from './TabButton'
export * from './FilterButton'
export * from './QuestionCard'
export * from './ExportDropdown'
export * from './ConfirmDialog'
export * from './SessionsChart'
export * from './TrainingAnalytics'

// Re-export types from centralized types
export type { Column, QuestionFromDB, BadgeVariant } from '../../types'
