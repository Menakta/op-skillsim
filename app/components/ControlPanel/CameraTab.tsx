'use client'

import type { CameraPerspective } from '@/app/lib/messageTypes'
import { useAppSelector } from '@/app/store/hooks'
import { selectCameraState } from '@/app/store/selectors'

// =============================================================================
// Constants
// =============================================================================

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

// =============================================================================
// Props Interface - Only actions, state from Redux
// =============================================================================

interface CameraTabProps {
  onSetCameraPerspective: (perspective: CameraPerspective) => void
  onToggleAutoOrbit: () => void
  onResetCamera: () => void
}

// =============================================================================
// Component
// =============================================================================

export function CameraTab({
  onSetCameraPerspective,
  onToggleAutoOrbit,
  onResetCamera
}: CameraTabProps) {
  // Get state from Redux
  const { cameraMode, cameraPerspective, cameraDistance } = useAppSelector(selectCameraState)
  return (
    <div className="space-y-4">
      <div className="bg-[#1e2a4a] rounded-lg p-4 border border-[#2c3e50]">
        <h3 className="text-blue-400 text-sm font-medium border-b border-[#2c3e50] pb-2 mb-3">Camera Controls</h3>

        {/* Perspective Buttons */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {CAMERA_PERSPECTIVES.map((cam) => {
            const isActive = cameraPerspective === cam.id
            return (
              <button
                key={cam.id}
                onClick={() => onSetCameraPerspective(cam.id)}
                className={`p-2 rounded text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-500 text-white ring-2 ring-blue-400/50 ring-offset-1 ring-offset-[#1e2a4a]'
                    : 'bg-gray-600 text-white hover:bg-gray-500'
                }`}
              >
                {cam.label}
              </button>
            )
          })}
        </div>

        {/* Orbit and Reset */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onToggleAutoOrbit}
            className={`p-2 rounded text-sm font-medium transition-colors ${
              cameraMode === 'Orbit'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-600 text-white hover:bg-gray-500'
            }`}
          >
            {cameraMode === 'Orbit' ? '⏹ Stop Orbit' : '🔄 Auto Orbit'}
          </button>
          <button
            onClick={onResetCamera}
            className="p-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-500 transition-colors"
          >
            🔄 Reset
          </button>
        </div>

        {/* Camera Status */}
        <div className="text-xs text-gray-400 mt-3 space-y-1">
          <div>Mode: <span className="text-white">{cameraMode}</span></div>
          <div>Perspective: <span className="text-white">{cameraPerspective}</span></div>
          <div>Distance: <span className="text-white">{cameraDistance}</span></div>
        </div>
      </div>
    </div>
  )
}

export default CameraTab
