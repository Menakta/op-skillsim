'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Check } from 'lucide-react'
import type { TrainingState } from '@/app/hooks/useTrainingMessagesComposite'
import type { CameraPerspective } from '@/app/lib/messageTypes'

const CAMERA_PERSPECTIVES: { id: CameraPerspective; label: string }[] = [
  { id: 'Front', label: 'Front' },
  { id: 'Back', label: 'Back' },
  { id: 'Left', label: 'Left' },
  { id: 'Right', label: 'Right' },
  { id: 'Top', label: 'Top' },
  { id: 'Bottom', label: 'Bottom' },
  { id: 'IsometricNE', label: 'ISO-NE' },
  { id: 'IsometricSE', label: 'ISO-SE' },
  { id: 'IsometricSW', label: 'ISO-SW' }
]

interface CameraDropdownProps {
  state: TrainingState
  onSetCameraPerspective: (perspective: CameraPerspective) => void
  onToggleAutoOrbit: () => void
  onResetCamera: () => void
}

export function CameraDropdown({
  state,
  onSetCameraPerspective,
  onToggleAutoOrbit,
  onResetCamera
}: CameraDropdownProps) {
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
        title="Camera Controls"
      >
        <Image src="/icons/view.png" alt="Camera" width={28} height={28} />
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
            <h3 className="text-white font-medium">Camera Controls</h3>
          </div>
        </div>

        {/* Content */}
        <div className="bg-[#39BEAE] p-4 space-y-2">
          {/* Camera Perspectives */}
          {CAMERA_PERSPECTIVES.map((cam) => {
            const isActive = state.cameraPerspective === cam.id

            return (
              <div
                key={cam.id}
                onClick={() => onSetCameraPerspective(cam.id)}
                className={`flex items-center gap-3 p-2 rounded-full transition-all cursor-pointer ${
                  isActive ? 'bg-[#1A1A1A]/20' : 'hover:bg-[#1A1A1A]/10'
                }`}
              >
                <div className="flex-1 ">
                  <div className={`font-medium flex items-center gap-2 ${isActive ? 'text-white' : 'text-gray-300'}`}>
                    <Image src={'/icons/view.png'} width={18} height={17} alt='View Icon' /> {cam.label}
                  </div>
                </div>
                {isActive && (
                  <div className="w-2 h-2 rounded-full bg-green-800 animate-pulse" />
                )}
              </div>
            )
          })}

          {/* Orbit and Reset Controls */}
          <div className="p-3 mt-2 border-t border-gray-600 bg-gray-800/50 rounded-lg space-y-2">
            <div
              onClick={onToggleAutoOrbit}
              className={`flex items-center gap-3 p-2 rounded-full transition-all cursor-pointer ${
                state.cameraMode === 'Orbit' ? 'bg-[#39BEAE]/30' : 'hover:bg-gray-700/50'
              }`}
            >
              {state.cameraMode === 'Orbit' ? (
                <Check className="w-6 h-6 text-[#39BEAE]" />
              ) : (
                <div className="w-6 h-6 bg-gray-600 rounded-full" />
              )}
              <div className="flex-1">
                <div className={`font-medium ${state.cameraMode === 'Orbit' ? 'text-[#39BEAE]' : 'text-gray-300'}`}>
                  {state.cameraMode === 'Orbit' ? 'Stop Orbit' : 'Auto Orbit'}
                </div>
              </div>
            </div>

            <div
              onClick={onResetCamera}
              className="flex items-center gap-3 p-2 rounded-full transition-all cursor-pointer hover:bg-gray-700/50"
            >
              <div className="w-6 h-6 bg-gray-600 rounded-full" />
              <div className="flex-1">
                <div className="font-medium text-gray-300">Reset Camera</div>
              </div>
            </div>

            {/* Camera Status */}
            <div className="flex justify-between text-sm pt-2">
              <span className="text-gray-400">Mode</span>
              <span className="text-white font-medium">{state.cameraMode}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CameraDropdown
