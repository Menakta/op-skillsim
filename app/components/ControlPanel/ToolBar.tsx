'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronUp, X } from 'lucide-react'
import type { TrainingState } from '@/app/hooks/useTrainingMessagesComposite'
import type { ToolName } from '@/app/lib/messageTypes'
import { TASK_SEQUENCE } from '@/app/lib/messageTypes'

// =============================================================================
// Constants
// =============================================================================

const TOOLS: { id: ToolName; label: string; icon: string }[] = [
  { id: 'XRay', label: 'X-Ray', icon: '/icons/view.png' },
  { id: 'Shovel', label: 'Shovel', icon: '/icons/Dig.png' },
  { id: 'Measuring', label: 'Measure', icon: '/icons/measure_tape.png' },
  { id: 'PipeConnection', label: 'Pipe', icon: '/icons/pipe.png' },
  { id: 'Glue', label: 'Glue', icon: '/icons/glue-gun.png' },
  { id: 'PressureTester', label: 'Pressure', icon: '/icons/hand.png' }
]

// =============================================================================
// Props Interface
// =============================================================================

interface ToolBarProps {
  state: TrainingState
  onSelectTool: (tool: ToolName) => void
}

// =============================================================================
// Component
// =============================================================================

export function ToolBar({ state, onSelectTool }: ToolBarProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const currentTaskDef = TASK_SEQUENCE[state.currentTaskIndex]
  const isTrainingComplete = state.currentTaskIndex >= TASK_SEQUENCE.length

  return (
    <div
      className="fixed bottom-0 left-1/2 -translate-x-1/2 bg-gray-800/60 shadow-xl rounded-t-2xl transition-all duration-300"
      style={{ zIndex: 2147483646 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-600">
        <span className="text-white font-medium text-sm">Tools</span>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-6 h-6 bg-gray-600 hover:bg-[#2ea89a] rounded-full flex items-center justify-center transition-all"
        >
          {isExpanded ? (
            <X className="w-3 h-3 text-white" />
          ) : (
            <ChevronUp className="w-3 h-3 text-white" />
          )}
        </button>
      </div>

      {/* Tools */}
      <div className={`flex items-center gap-2 ${isExpanded ? 'px-4 pb-4 pt-3' : 'px-3 pb-2 pt-2'}`}>
        {TOOLS.map((tool) => {
          const isSelected = state.selectedTool === tool.id
          const isRequired = currentTaskDef?.tool === tool.id && !isTrainingComplete

          return (
            <div key={tool.id} className="flex flex-col items-center">
              <button
                onClick={() => onSelectTool(tool.id)}
                disabled={isTrainingComplete}
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-[#39BEAE] ring-2 ring-white'
                    : isRequired
                    ? 'bg-[#39BEAE]/50 animate-pulse'
                    : isTrainingComplete
                    ? 'bg-gray-600 opacity-50 cursor-not-allowed'
                    : 'bg-gray-600 hover:bg-[#39BEAE]'
                }`}
                title={tool.label}
              >
                <Image
                  src={tool.icon}
                  alt={tool.label}
                  width={24}
                  height={24}
                />
              </button>

              {/* Label - Only show when expanded */}
              {isExpanded && (
                <span className={`text-xs mt-1 ${isSelected ? 'text-[#39BEAE]' : 'text-gray-300'}`}>
                  {tool.label}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ToolBar
