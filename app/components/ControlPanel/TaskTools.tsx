'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { TrainingState } from '@/app/hooks/useTrainingMessagesComposite'
import type { PipeType } from '@/app/lib/messageTypes'
import { GitMerge } from 'lucide-react'

// =============================================================================
// Constants
// =============================================================================

const PIPE_TYPES: { id: PipeType; label: string; icon: string }[] = [
  { id: 'y-junction', label: 'Y-Junction', icon: '/icons/y-junction.png' },
  { id: 'elbow', label: '90° Elbow', icon: '/icons/pipe-90-deg.png' },
  { id: '100mm', label: '100mm', icon: '/icons/pipe-2.png' },
  { id: '150mm', label: '150mm', icon: '/icons/pipe-3.png' }
]

// =============================================================================
// Props Interface
// =============================================================================

interface TaskToolsProps {
  state: TrainingState
  onSelectPipe: (pipe: PipeType) => void
  onSelectPressureTest: (testType: 'air-plug' | 'conduct-test') => void
}

// =============================================================================
// Component
// =============================================================================

export function TaskTools({
  state,
  onSelectPipe,
  onSelectPressureTest
}: TaskToolsProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  // Only show when PipeConnection or PressureTester tool is selected
  const showPipeSelection = state.selectedTool === 'PipeConnection'
  const showPressureTest = state.selectedTool === 'PressureTester'

  // Don't render if nothing to show
  if (!showPipeSelection && !showPressureTest) {
    return null
  }

  return (
    <div className="fixed left-5 top-1/2 -translate-y-1/2 flex flex-col gap-2" style={{ zIndex: 2147483647 }}>
      <span className='text-white'>Materials</span>
      {/* Pipe Selection Icons - Only when PipeConnection tool is selected */}
      {showPipeSelection && (
        <>
          {PIPE_TYPES.map((pipe) => {
            const isSelected = state.selectedPipe === pipe.id
            return (
              <div key={pipe.id} className="relative">
                <button
                  onClick={() => onSelectPipe(pipe.id)}
                  onMouseEnter={() => setHoveredItem(pipe.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={`w-12 h-12 rounded-xl shadow-lg flex items-center justify-center transition-all hover:scale-105 ${
                    isSelected
                      ? 'bg-[#39BEAE] ring-2 ring-white'
                      : 'bg-gray-700/80 hover:bg-[#39BEAE]'
                  }`}
                  title={pipe.label}
                >
                  <Image
                    src={pipe.icon}
                    alt={pipe.label}
                    width={25}
                    height={25}
                  />
                </button>
                {/* Tooltip */}
                {hoveredItem === pipe.id && (
                  <div className="absolute left-14 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    {pipe.label}
                  </div>
                )}
              </div>
            )
          })}
        </>
      )}

      {/* Pressure Test Icons - Only when PressureTester tool is selected */}
      {showPressureTest && (
        <>
          {/* Air Plug Icon */}
          <div className="relative">
            <button
              onClick={() => onSelectPressureTest('air-plug')}
              onMouseEnter={() => setHoveredItem('air-plug')}
              onMouseLeave={() => setHoveredItem(null)}
              className={`w-12 h-12 rounded-xl shadow-lg flex items-center justify-center transition-all hover:scale-105 ${
                state.airPlugSelected
                  ? 'bg-[#39BEAE] ring-2 ring-white'
                  : 'bg-gray-700/80 hover:bg-[#39BEAE]'
              }`}
              title="Air Plug"
            >
              <span className="text-white text-lg">1</span>
            </button>
            {/* Tooltip */}
            {hoveredItem === 'air-plug' && (
              <div className="absolute left-14 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                {state.airPlugSelected ? '✓ Air Plug Selected' : 'Select Air Plug'}
              </div>
            )}
          </div>

          {/* Conduct Test Icon */}
          <div className="relative">
            <button
              onClick={() => state.airPlugSelected && onSelectPressureTest('conduct-test')}
              onMouseEnter={() => setHoveredItem('conduct-test')}
              onMouseLeave={() => setHoveredItem(null)}
              disabled={!state.airPlugSelected}
              className={`w-12 h-12 rounded-xl shadow-lg flex items-center justify-center transition-all ${
                state.airPlugSelected
                  ? 'bg-gray-700/80 hover:bg-[#39BEAE] hover:scale-105'
                  : 'bg-gray-700/40 opacity-50 cursor-not-allowed'
              }`}
              title="Conduct Test"
            >
              <span className="text-white text-lg">2</span>
            </button>
            {/* Tooltip */}
            {hoveredItem === 'conduct-test' && (
              <div className="absolute left-14 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                {state.airPlugSelected ? 'Conduct Test' : 'Select Air Plug First'}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default TaskTools
