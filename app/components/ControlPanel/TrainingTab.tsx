'use client'

import type { TrainingState } from '@/app/hooks/useTrainingMessagesComposite'
import { TASK_SEQUENCE, TOOL_INFO } from '@/app/lib/messageTypes'

// =============================================================================
// Props Interface
// =============================================================================

interface TrainingTabProps {
  state: TrainingState
  onStartTraining: () => void
  onPauseTraining: () => void
  onResetTraining: () => void
}

// =============================================================================
// Component
// =============================================================================

export function TrainingTab({
  state,
  onStartTraining,
  onPauseTraining,
  onResetTraining
}: TrainingTabProps) {
  return (
    <div className="space-y-4">
      {/* Training Progress Widget */}
      <div className="bg-[#1e2a4a] rounded-lg p-4 border border-[#2c3e50]">
        <h3 className="text-blue-400 text-sm font-medium border-b border-[#2c3e50] pb-2 mb-3">Training Progress</h3>
        <div className="text-white text-sm mb-2">
          Task {Math.min(state.currentTaskIndex + 1, state.totalTasks)} of {state.totalTasks}
        </div>
        <div className="w-full h-2 bg-[#2c3e50] rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-300"
            style={{ width: `${state.progress}%` }}
          />
        </div>
        <div className="text-white text-sm">{state.taskName}</div>
        <div className="text-gray-400 text-xs">Phase: {state.phase}</div>
      </div>

      {/* Training Controls */}
      <div className="bg-[#1e2a4a] rounded-lg p-4 border border-[#2c3e50]">
        <h3 className="text-blue-400 text-sm font-medium border-b border-[#2c3e50] pb-2 mb-3">Training Control</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onStartTraining}
            className="p-2 bg-green-500/20 border border-green-500/30 rounded text-green-400 hover:bg-green-500/30 transition-colors text-sm"
          >
            ▶ Start
          </button>
          <button
            onClick={onPauseTraining}
            className="p-2 bg-yellow-500/20 border border-yellow-500/30 rounded text-yellow-400 hover:bg-yellow-500/30 transition-colors text-sm"
          >
            ⏸ Pause
          </button>
          <button
            onClick={onResetTraining}
            className="p-2 bg-gray-500/20 border border-gray-500/30 rounded text-gray-400 hover:bg-gray-500/30 transition-colors text-sm col-span-2"
          >
            🔄 Reset Training
          </button>
        </div>
      </div>

      {/* Current Tool Widget */}
      <div className="bg-[#1e2a4a] rounded-lg p-4 border border-[#2c3e50]">
        <h3 className="text-blue-400 text-sm font-medium border-b border-[#2c3e50] pb-2 mb-3">Current Tool</h3>
        <div className="flex items-center gap-3 p-3 bg-[#2c3e50] rounded-lg">
          <div className="w-8 h-8 bg-blue-400 rounded flex items-center justify-center text-lg">
            {TOOL_INFO[state.currentTool]?.icon || 'N'}
          </div>
          <div>
            <div className="text-white text-sm">{TOOL_INFO[state.currentTool]?.name || 'None'}</div>
            <div className="text-gray-400 text-xs">{TOOL_INFO[state.currentTool]?.description || 'No tool selected'}</div>
          </div>
        </div>
      </div>

      {/* Task Sequence Reference */}
      <div className="bg-[#1e2a4a] rounded-lg p-4 border border-[#2c3e50]">
        <h3 className="text-blue-400 text-sm font-medium border-b border-[#2c3e50] pb-2 mb-3">Task Sequence</h3>
        <div className="space-y-1">
          {TASK_SEQUENCE.map((task, index) => (
            <div
              key={task.taskId}
              className={`p-2 rounded flex items-center gap-2 ${
                index < state.currentTaskIndex
                  ? 'bg-green-500/20 text-green-400'
                  : index === state.currentTaskIndex
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                  : 'bg-gray-800/50 text-gray-500'
              }`}
            >
              <span className="text-lg">{TOOL_INFO[task.tool]?.icon}</span>
              <div className="flex-1">
                <div className="text-xs font-medium">{task.name}</div>
                <div className="text-xs opacity-70">{task.tool}</div>
              </div>
              {index < state.currentTaskIndex && <span className="text-green-400">✓</span>}
              {index === state.currentTaskIndex && <span className="text-blue-400">→</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default TrainingTab
