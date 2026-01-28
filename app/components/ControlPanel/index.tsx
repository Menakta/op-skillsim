'use client'

import type { ToolName } from '@/app/lib/messageTypes'

// Redux imports
import { useAppSelector } from '@/app/store/hooks'
import { selectTrainingState } from '@/app/store/slices/trainingSlice'

// Import components - Only ToolBar remains here
// TaskTools is now integrated into TrainingSidebar
import { ToolBar } from './ToolBar'

// =============================================================================
// Props Interface - Simplified for ToolBar only
// =============================================================================

interface ControlPanelProps {
  // Theme (optional, defaults handled internally)
  isDark?: boolean

  // Tool Selection Actions
  onSelectTool: (tool: ToolName) => void
  onSelectPipe: (pipe: string) => void
  onSelectPressureTest: (testType: 'air-plug' | 'conduct-test') => void
}

// =============================================================================
// Component - Now only contains ToolBar at bottom
// =============================================================================

export function ControlPanel({
  isDark = true,
  onSelectTool,
  onSelectPipe,
  onSelectPressureTest,
}: ControlPanelProps) {
  // Get state from Redux
  const state = useAppSelector(selectTrainingState)

  // ==========================================================================
  // Render - Only ToolBar (TaskTools moved to TrainingSidebar)
  // ==========================================================================

  return (
    <>
      {/* Tool Bar - Always visible at bottom */}
      <ToolBar
        state={state}
        onSelectTool={onSelectTool}
      />
    </>
  )
}

export default ControlPanel
