'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X, Check } from 'lucide-react'
import { TASK_SEQUENCE } from '@/app/lib/messageTypes'

interface MapDropdownProps {
  currentTaskIndex: number
}

export function MapDropdown({ currentTaskIndex }: MapDropdownProps) {
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
        title="Training Map"
      >
        <Image src="/icons/map.png" alt="Map" width={28} height={28} />
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
        className={`absolute top-12 right-0 w-80 bg-[#39BEAE] rounded-b-xl rounded-tl-xl shadow-2xl overflow-hidden transition-all duration-200 z-50 ${
          isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-2 bg-[#39BEAE] border-b border-gray-700">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-medium">Training Phases</h3>
          </div>
        </div>

        {/* Content */}
        <div className="bg-[#39BEAE] p-4 space-y-2">
          {TASK_SEQUENCE.map((task, index) => {
            const isCompleted = index < currentTaskIndex
            const isCurrent = index === currentTaskIndex

            return (
              <div
                key={task.taskId}
                className={`flex items-center gap-3 p-2 rounded-full transition-all ${
                  isCurrent
                    ? 'bg-[#1A1A1A]/20':''
                }`}
              >
               
                <div className="flex-1">
                  <div
                    className={`font-small flex items-center gap-2 ${
                      isCurrent ? 'text-white' : isCompleted ? 'text-white' : 'text-gray-200'
                    }`}
                  >
                    {isCompleted ? <Check size={16} />: isCurrent ? "": <X size={16} />} {task.name} 
                  </div>
                </div>
                {isCurrent && (
                  <div className="w-2 h-2 rounded-full bg-green-800 animate-pulse" />
                )}
              </div>
            )
          })}

          {/* Progress Summary */}
          <div className="p-3 mt-2 border-t border-gray-600 bg-gray-800/50 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Progress</span>
              <span className="text-white font-medium">
                {currentTaskIndex}/{TASK_SEQUENCE.length} Tasks
              </span>
            </div>
            <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#39BEAE] transition-all duration-500"
                style={{ width: `${(currentTaskIndex / TASK_SEQUENCE.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MapDropdown
