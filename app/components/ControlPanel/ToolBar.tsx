'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronUp } from 'lucide-react'
import type { TrainingState } from '@/app/hooks/useTrainingMessagesComposite'
import type { ToolName } from '@/app/lib/messageTypes'
import { TASK_SEQUENCE } from '@/app/config'

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
      className="fixed bottom-0 left-1/2 -translate-x-1/2 shadow-xl rounded-2xl transition-all duration-300 max-w-[540px] py-3 mb-2"
      style={{ zIndex: 2147483646 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b max-w-[540px] border-gray-600">
        <span className="text-white font-medium text-sm">Tools</span>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-6 h-6 bg-[#000000]/70 hover:bg-[#2ea89a] rounded-full flex items-center justify-center transition-all duration-300"
        >
          <ChevronUp
            className={`w-4 h-4 text-white transition-transform duration-300 ease-out ${
              isExpanded ? 'rotate-180' : 'rotate-0'
            }`}
          />
        </button>
      </div>

      {/* Tools */}
      <div
        className="flex items-center gap-2 px-4 pt-2 overflow-hidden transition-all duration-300 ease-out"
        style={{
          paddingBottom: isExpanded ? '2rem' : '0.25rem',
        }}
      >
        {TOOLS.map((tool, index) => {
          const isSelected = state.selectedTool === tool.id
          const isRequired = currentTaskDef?.tool === tool.id && !isTrainingComplete

          return (
            <div
              key={tool.id}
              className="flex flex-col items-center transition-all duration-300 ease-out"
              style={{
                transform: isExpanded ? 'translateY(0) scale(1)' : 'translateY(0) scale(1)',
                transitionDelay: isExpanded ? `${index * 50}ms` : `${(TOOLS.length - index - 1) * 30}ms`,
              }}
            >
              <button
                onClick={() => onSelectTool(tool.id)}
                disabled={isTrainingComplete}
                className={`w-12 md:w-15 h-10 md:h-15 bg-[#000000]/40 rounded-lg flex items-center justify-center transition-all duration-200 ${
                  isSelected
                    ? 'bg-[#43CF89] shadow-lg scale-110'
                    : isRequired
                    ? 'bg-[#39BEAE]/40 animate-pulse'
                    : isTrainingComplete
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-[#79CFC2] hover:scale-105'
                }`}
                title={tool.label}
              >
                <Image
                  src={tool.icon}
                  alt={tool.label}
                  width={30}
                  height={30}
                  className="transition-transform duration-200"
                  style={{ width: 'auto', height: 'auto' }}
                />
              </button>

              {/* Label - Animated show/hide */}
              <div
                className="overflow-hidden transition-all duration-300 ease-out"
                style={{
                  maxHeight: isExpanded ? '2rem' : '0',
                  opacity: isExpanded ? 1 : 0,
                  transform: isExpanded ? 'translateY(0)' : 'translateY(-8px)',
                  transitionDelay: isExpanded ? `${index * 50 + 100}ms` : '0ms',
                }}
              >
                <span className={`text-sm mt-1 block ${isSelected ? 'text-[#39BEAE]' : 'text-gray-300'}`}>
                  {tool.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ToolBar
