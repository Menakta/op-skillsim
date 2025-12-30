'use client'

import type { ToolName } from '@/app/lib/messageTypes'

// Redux imports
import { useAppSelector } from '@/app/store/hooks'
import { selectTrainingState } from '@/app/store/slices/trainingSlice'

// Import components - Only ToolBar and TaskTools remain here
import { TaskTools } from './TaskTools'
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
  // Render - Only ToolBar and TaskTools
  // ==========================================================================

  return (
    <>
      {/* Left Side - Task Tools (shows only for pipe/pressure test selection) */}
      <TaskTools
        state={state}
        onSelectPipe={onSelectPipe}
        onSelectPressureTest={onSelectPressureTest}
      />

      {/* Tool Bar - Always visible at bottom */}
      <ToolBar
        state={state}
        onSelectTool={onSelectTool}
      />
    </>
  )
}

export default ControlPanel
