'use client'

import { useState } from 'react'
import type { TrainingState } from '@/app/hooks/useTrainingMessagesComposite'
import type { ToolName, PipeType } from '@/app/lib/messageTypes'
import { TASK_SEQUENCE, TOOL_INFO } from '@/app/config'

// =============================================================================
// Constants
// =============================================================================

const PIPE_TYPES: { id: PipeType; label: string }[] = [
  { id: 'y-junction', label: 'Y-Junction' },
  { id: 'elbow', label: '90° Elbow' },
  { id: '100mm', label: '100mm Pipe' },
  { id: '150mm', label: '150mm Pipe' }
]

const AVAILABLE_TOOLS: ToolName[] = ['XRay', 'Shovel', 'Measuring', 'PipeConnection', 'Glue', 'PressureTester']

// =============================================================================
// Props Interface
// =============================================================================

interface ToolsTabProps {
  state: TrainingState
  onSelectTool: (tool: ToolName) => void
  onSelectPipe: (pipe: PipeType) => void
  onSelectPressureTest: (testType: 'air-plug' | 'conduct-test') => void
}

// =============================================================================
// Component
// =============================================================================

export function ToolsTab({
  state,
  onSelectTool,
  onSelectPipe,
  onSelectPressureTest
}: ToolsTabProps) {
  const [wrongToolClicked, setWrongToolClicked] = useState<ToolName | null>(null)

  const isTrainingMode = state.mode === 'training'
  const currentTaskDef = TASK_SEQUENCE[state.currentTaskIndex]
  const isTrainingComplete = state.currentTaskIndex >= TASK_SEQUENCE.length

  // Handle tool click with feedback
  const handleToolClick = (tool: ToolName) => {
    // Check if this is the expected tool
    if (currentTaskDef && tool !== currentTaskDef.tool) {
      // Wrong tool - show feedback
      setWrongToolClicked(tool)
      setTimeout(() => setWrongToolClicked(null), 1500)
      console.log('Wrong tool clicked:', tool, '- Expected:', currentTaskDef.tool)
      return
    }

    // Correct tool - proceed
    setWrongToolClicked(null)
    onSelectTool(tool)
  }

  return (
    <div className="space-y-4">
      {/* Tool Selection Prompt - Only show when in training and not complete */}
      {isTrainingMode && currentTaskDef && !isTrainingComplete && (
        <div className="bg-gradient-to-r from-pink-500 to-pink-600 text-white p-3 rounded-lg text-center animate-pulse">
          <div className="text-sm font-bold mb-1">✨ SELECT REQUIRED TOOL ✨</div>
          <div className="text-xs">Choose {currentTaskDef.tool} to continue training</div>
        </div>
      )}

      {/* Wrong Tool Feedback */}
      {wrongToolClicked && (
        <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-lg text-center">
          <div className="text-sm font-bold">Wrong Tool!</div>
          <div className="text-xs">Expected: {currentTaskDef?.tool}</div>
        </div>
      )}

      {/* Tool Buttons */}
      <div className="bg-[#1e2a4a] rounded-lg p-4 border border-[#2c3e50]">
        <h3 className="text-blue-400 text-sm font-medium border-b border-[#2c3e50] pb-2 mb-3">🔧 Available Tools</h3>
        <div className="grid grid-cols-2 gap-2">
          {AVAILABLE_TOOLS.map((tool) => {
            const isRequired = currentTaskDef?.tool === tool && !isTrainingComplete
            const isSelected = state.selectedTool === tool
            const isWrong = wrongToolClicked === tool
            const info = TOOL_INFO[tool]

            return (
              <button
                key={tool}
                onClick={() => handleToolClick(tool)}
                disabled={isTrainingComplete}
                className={`p-2 rounded text-sm font-medium transition-all ${
                  isWrong
                    ? 'bg-red-500 text-white border-2 border-red-300 animate-shake'
                    : isRequired
                    ? 'bg-pink-500 text-white border-2 border-pink-300 animate-pulse shadow-lg shadow-pink-500/50'
                    : isSelected
                    ? 'bg-teal-500 text-white border-2 border-teal-300'
                    : isTrainingComplete
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-500'
                }`}
              >
                {info.icon} {info.name.split(' ')[0]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Pipe Selection (show when PipeConnection is selected) */}
      {state.selectedTool === 'PipeConnection' && (
        <div className="bg-[#1e2a4a] rounded-lg p-4 border border-[#2c3e50] border-pink-500">
          <h3 className="text-pink-400 text-sm font-medium border-b border-[#2c3e50] pb-2 mb-3">🔧 Select Pipe Type</h3>
          <div className="text-xs text-gray-400 mb-3">Choose the correct pipe fitting to continue</div>
          <div className="grid grid-cols-2 gap-2">
            {PIPE_TYPES.map((pipe) => (
              <button
                key={pipe.id}
                onClick={() => onSelectPipe(pipe.id)}
                className={`p-3 rounded text-sm font-medium transition-all ${
                  state.selectedPipe === pipe.id
                    ? 'bg-pink-500 text-white border-2 border-pink-300'
                    : 'bg-orange-500 text-white hover:bg-orange-400'
                }`}
              >
                {pipe.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pressure Test Panel (show when PressureTester is selected) */}
      {state.selectedTool === 'PressureTester' && (
        <div className="bg-[#1e2a4a] rounded-lg p-4 border border-[#2c3e50] border-pink-500">
          <h3 className="text-pink-400 text-sm font-medium border-b border-[#2c3e50] pb-2 mb-3">🔧 Pressure Test Setup</h3>
          <div className="text-xs text-gray-400 mb-3">
            Step 1: Select Air Plug, then Step 2: Conduct Test
          </div>
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => onSelectPressureTest('air-plug')}
              className={`p-3 rounded text-sm transition-colors flex items-center justify-center gap-2 ${
                state.airPlugSelected
                  ? 'bg-green-500 text-white border-2 border-green-300'
                  : 'bg-orange-500 text-white hover:bg-orange-400 animate-pulse'
              }`}
            >
              <span>1️⃣</span> {state.airPlugSelected ? '✓ Air Plug Selected' : 'Select Air Plug'}
            </button>
            <button
              onClick={() => onSelectPressureTest('conduct-test')}
              disabled={!state.airPlugSelected}
              className={`p-3 rounded text-sm transition-colors flex items-center justify-center gap-2 ${
                state.airPlugSelected
                  ? 'bg-blue-500 text-white hover:bg-blue-400 animate-pulse'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              <span>2️⃣</span> Conduct Test
            </button>
          </div>
          <div className="text-xs text-gray-500 mt-3 p-2 bg-[#2c3e50] rounded">
            {!state.airPlugSelected
              ? 'First click "Select Air Plug" to prepare for the test.'
              : 'Air plug ready! Click "Conduct Test" to run the pressure test. Q6 question will appear.'}
          </div>
        </div>
      )}

      {/* Task Status */}
      <div className="bg-[#1e2a4a] rounded-lg p-4 border border-[#2c3e50]">
        <h3 className="text-blue-400 text-sm font-medium border-b border-[#2c3e50] pb-2 mb-3">Task Status</h3>
        <div className="text-xs text-gray-400 space-y-1">
          <div>Phase: <span className="text-white">{state.phase}</span></div>
          <div>Selected Tool: <span className="text-white">{state.selectedTool || 'None'}</span></div>
          <div>Current Task Index: <span className="text-white">{state.currentTaskIndex}</span></div>
          <div>Training Started: <span className="text-white">{state.trainingStarted ? 'Yes' : 'No'}</span></div>
          {state.selectedTool === 'PressureTester' && (
            <div>Air Plug Selected: <span className={state.airPlugSelected ? 'text-green-400' : 'text-yellow-400'}>
              {state.airPlugSelected ? 'Yes' : 'No - Select Air Plug first'}
            </span></div>
          )}
          <div>Next Step: <span className="text-white">
            {isTrainingComplete
              ? 'All tasks complete!'
              : currentTaskDef
                ? `Select ${currentTaskDef.tool} for: ${currentTaskDef.name}`
                : 'Start Training'}
          </span></div>
        </div>
      </div>

      {/* Shake animation style */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  )
}

export default ToolsTab
