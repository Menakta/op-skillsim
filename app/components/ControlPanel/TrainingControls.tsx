'use client'

import { useState } from 'react'
import { Play, Pause, RotateCcw, GraduationCap } from 'lucide-react'
import type { TrainingState } from '@/app/hooks/useTrainingMessagesComposite'

interface TrainingControlsProps {
  state: TrainingState
  onStartTraining: () => void
  onPauseTraining: () => void
  onResetTraining: () => void
}

export function TrainingControls({
  state,
  onStartTraining,
  onPauseTraining,
  onResetTraining
}: TrainingControlsProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-12 h-12 flex items-center justify-center shadow-lg transition-all ${
          isOpen
            ? 'bg-[#39BEAE] rounded-t-md'
            : 'bg-gray-700/80 hover:bg-[#39BEAE] rounded-md'
        }`}
        title="Training Controls"
      >
        <GraduationCap className="w-7 h-7 text-white" />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Panel - Connected to button */}
      <div
        className={`absolute top-12 left-0 w-48 bg-[#39BEAE] rounded-b-xl rounded-tr-xl shadow-2xl overflow-hidden transition-all duration-200 z-50 ${
          isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-2 bg-[#39BEAE] border-b border-gray-700">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-medium">Training</h3>
          </div>
        </div>

        {/* Content */}
        <div className="bg-[#39BEAE] p-4 space-y-2">
          {/* Start Button */}
          <div
            onClick={() => {
              onStartTraining()
              setIsOpen(false)
            }}
            className={`flex items-center gap-3 p-2 rounded-full transition-all cursor-pointer ${
              state.isActive ? 'bg-[#1A1A1A]/20' : 'hover:bg-[#1A1A1A]/10'
            }`}
          >
            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
              <Play className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-white">Start</div>
            </div>
          </div>

          {/* Pause Button */}
          <div
            onClick={() => {
              onPauseTraining()
              setIsOpen(false)
            }}
            className="flex items-center gap-3 p-2 rounded-full transition-all cursor-pointer hover:bg-[#1A1A1A]/10"
          >
            <div className="w-8 h-8 bg-yellow-600 rounded-full flex items-center justify-center">
              <Pause className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-white">Pause</div>
            </div>
          </div>

          {/* Reset Button */}
          <div
            onClick={() => {
              onResetTraining()
              setIsOpen(false)
            }}
            className="flex items-center gap-3 p-2 rounded-full transition-all cursor-pointer hover:bg-[#1A1A1A]/10"
          >
            <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
              <RotateCcw className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-white">Reset</div>
            </div>
          </div>

          {/* Status */}
          <div className="p-3 mt-2 border-t border-gray-600 bg-gray-800/50 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Status</span>
              <span className={`font-medium ${state.isActive ? 'text-green-400' : 'text-yellow-400'}`}>
                {state.isActive ? 'Active' : 'Paused'}
              </span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-400">Progress</span>
              <span className="text-white font-medium">
                {state.currentTaskIndex}/{state.totalTasks}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TrainingControls
