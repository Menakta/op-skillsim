'use client'

/**
 * TrainingActionButtons Component
 *
 * Provides pause/resume and quit buttons during training mode.
 * Shows a floating control bar at the top-right of the screen.
 *
 * This is separate from TrainingControls to not affect existing functionality.
 */

import { useState } from 'react'
import { Play, Pause, LogOut } from 'lucide-react'

// =============================================================================
// Props Interface
// =============================================================================

interface TrainingActionButtonsProps {
  isPaused: boolean
  isVisible: boolean
  onPause: () => void
  onResume: () => void
  onQuit: () => void
}

// =============================================================================
// Component
// =============================================================================

export function TrainingActionButtons({
  isPaused,
  isVisible,
  onPause,
  onResume,
  onQuit
}: TrainingActionButtonsProps) {
  const [showTooltip, setShowTooltip] = useState<'pause' | 'quit' | null>(null)

  if (!isVisible) {
    return null
  }

  return (
    <div
      className="fixed top-4 right-4 flex items-center gap-2"
      style={{ zIndex: 2147483646 }}
    >
      {/* Status Badge */}
      {isPaused && (
        <div className="px-3 py-1.5 bg-amber-500/90 text-white text-sm font-medium rounded-full shadow-lg animate-pulse">
          PAUSED
        </div>
      )}

      {/* Pause/Resume Button */}
      <div className="relative">
        <button
          onClick={isPaused ? onResume : onPause}
          onMouseEnter={() => setShowTooltip('pause')}
          onMouseLeave={() => setShowTooltip(null)}
          className={`
            w-12 h-12 rounded-full flex items-center justify-center
            transition-all duration-200 shadow-lg
            ${isPaused
              ? 'bg-[#39BEAE] hover:bg-[#39BEAE]/80 text-white'
              : 'bg-[#000000]/60 hover:bg-[#000000]/80 text-white border border-white/20'
            }
          `}
          aria-label={isPaused ? 'Resume Training' : 'Pause Training'}
        >
          {isPaused ? (
            <Play className="w-5 h-5 ml-0.5" />
          ) : (
            <Pause className="w-5 h-5" />
          )}
        </button>

        {/* Tooltip */}
        {showTooltip === 'pause' && (
          <div className="absolute top-full mt-2 right-0 px-3 py-1.5 bg-[#000000]/90 text-white text-sm rounded-lg whitespace-nowrap pointer-events-none">
            {isPaused ? 'Resume Training' : 'Pause Training'}
          </div>
        )}
      </div>

      {/* Quit Button */}
      <div className="relative">
        <button
          onClick={onQuit}
          onMouseEnter={() => setShowTooltip('quit')}
          onMouseLeave={() => setShowTooltip(null)}
          className="
            w-12 h-12 rounded-full flex items-center justify-center
            bg-red-500/80 hover:bg-red-500 text-white
            transition-all duration-200 shadow-lg
          "
          aria-label="Quit Training"
        >
          <LogOut className="w-5 h-5" />
        </button>

        {/* Tooltip */}
        {showTooltip === 'quit' && (
          <div className="absolute top-full mt-2 right-0 px-3 py-1.5 bg-[#000000]/90 text-white text-sm rounded-lg whitespace-nowrap pointer-events-none">
            Quit Training
          </div>
        )}
      </div>
    </div>
  )
}

export default TrainingActionButtons
