'use client'

import { Camera, Home, Video } from 'lucide-react'
import { useTheme } from '@/app/context/ThemeContext'
import type { CameraPerspective } from '@/app/lib/messageTypes'

// =============================================================================
// Props Interface
// =============================================================================

interface CameraControlsProps {
  /** Current camera perspective */
  currentPerspective?: string
  /** Current camera mode (Orbit or Manual) */
  cameraMode?: string
  /** Called when a camera perspective is selected */
  onSetPerspective: (perspective: CameraPerspective) => void
  /** Called to toggle auto-orbit */
  onToggleAutoOrbit: () => void
  /** Called to reset camera */
  onResetCamera: () => void
  /** Whether the controls are visible */
  isVisible: boolean
}

// =============================================================================
// Camera Perspectives
// =============================================================================

const CAMERA_PERSPECTIVES: { id: CameraPerspective; label: string }[] = [
  { id: 'Front', label: 'Front' },
  { id: 'Back', label: 'Back' },
  { id: 'Left', label: 'Left' },
  { id: 'Right', label: 'Right' },
  { id: 'Top', label: 'Top' },
  { id: 'IsometricNE', label: 'Iso' },
]

// =============================================================================
// Component
// =============================================================================

export function CameraControls({
  currentPerspective,
  cameraMode,
  onSetPerspective,
  onToggleAutoOrbit,
  onResetCamera,
  isVisible
}: CameraControlsProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  if (!isVisible) return null

  const isOrbitActive = cameraMode === 'Orbit'

  return (
    <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-30 backdrop-blur-md rounded-xl border overflow-hidden ${
      isDark
        ? 'bg-black/80 border-white/10'
        : 'bg-white/90 border-gray-200 shadow-lg'
    }`}>
      {/* Header */}
      <div className={`px-4 py-2 border-b ${
        isDark
          ? 'bg-gradient-to-r from-[#39BEAE]/20 to-transparent border-white/10'
          : 'bg-gradient-to-r from-[#39BEAE]/10 to-transparent border-gray-200'
      }`}>
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-[#39BEAE]" />
          <h3 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>Camera</h3>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 flex items-center gap-2">
        {/* Perspective Buttons */}
        {CAMERA_PERSPECTIVES.map((cam) => (
          <button
            key={cam.id}
            onClick={() => onSetPerspective(cam.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentPerspective === cam.id
                ? 'bg-[#39BEAE] text-white'
                : isDark
                  ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            }`}
          >
            {cam.label}
          </button>
        ))}

        {/* Divider */}
        <div className={`w-px h-6 mx-1 ${isDark ? 'bg-white/20' : 'bg-gray-300'}`} />

        {/* Auto Orbit */}
        <button
          onClick={onToggleAutoOrbit}
          className={`p-2 rounded-lg transition-all ${
            isOrbitActive
              ? 'bg-[#39BEAE] text-white'
              : isDark
                ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
          }`}
          title={isOrbitActive ? 'Stop Auto Orbit' : 'Start Auto Orbit'}
        >
          <Video className="w-4 h-4" />
        </button>

        {/* Reset Camera */}
        <button
          onClick={onResetCamera}
          className={`p-2 rounded-lg transition-all ${
            isDark
              ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
          }`}
          title="Reset Camera"
        >
          <Home className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default CameraControls
