'use client'

import { useState, useEffect, useRef } from 'react'
import { SkipForward, Eye } from 'lucide-react'
import { useTheme } from '@/app/context/ThemeContext'

// =============================================================================
// Props Interface
// =============================================================================

interface CinematicTimerProps {
  /** Duration in seconds (default: 7200 = 2 hours) */
  duration?: number
  /** Called when timer expires or user clicks skip */
  onSkipToTraining: () => void
  /** Whether the cinematic mode is active */
  isActive: boolean
}

// =============================================================================
// Helper: Format time as H:MM:SS
// =============================================================================

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// =============================================================================
// Component
// =============================================================================

export function CinematicTimer({
  duration = 7200, // 2 hours default
  onSkipToTraining,
  isActive
}: CinematicTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(duration)
  const onSkipRef = useRef(onSkipToTraining)
  const hasInitializedRef = useRef(false)

  // Keep callback ref updated
  useEffect(() => {
    onSkipRef.current = onSkipToTraining
  }, [onSkipToTraining])

  // Initialize timer once when becoming active
  useEffect(() => {
    if (isActive && !hasInitializedRef.current) {
      hasInitializedRef.current = true
      setTimeRemaining(duration)
    }
  }, [isActive, duration])

  // Countdown timer
  useEffect(() => {
    if (!isActive) return

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          onSkipRef.current()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isActive])

  const { theme } = useTheme()
  const isDark = theme === 'dark'

  if (!isActive) return null

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-40 flex flex-col sm:flex-row items-center gap-2 sm:gap-4 px-4 sm:px-6 py-2 sm:py-3 backdrop-blur-md rounded-2xl sm:rounded-full border max-w-[calc(100%-2rem)] sm:max-w-none ${
      isDark
        ? 'bg-black/70 border-white/10'
        : 'bg-white/90 border-gray-200 shadow-lg'
    }`}>
      {/* Top row on mobile: Icon + Timer */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Eye Icon */}
        <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-[#39BEAE]" />

        {/* Timer Text */}
        <div className="flex items-center gap-1 sm:gap-2">
          <span className={`text-xs sm:text-sm hidden sm:inline ${isDark ? 'text-white/70' : 'text-gray-500'}`}>Interactive View:</span>
          <span className={`font-mono text-sm sm:text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {formatTime(timeRemaining)}
          </span>
        </div>

        {/* Divider - hidden on mobile */}
        <div className={`hidden sm:block w-px h-6 ${isDark ? 'bg-white/20' : 'bg-gray-300'}`} />
      </div>

      {/* Skip Button */}
      <button
        onClick={onSkipToTraining}
        className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-[#39BEAE] hover:bg-[#2ea89a] text-white rounded-full transition-all duration-200 text-xs sm:text-sm font-medium w-full sm:w-auto justify-center"
      >
        <SkipForward className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        <span className="sm:hidden">Start Training</span>
        <span className="hidden sm:inline">Skip to Training</span>
      </button>
    </div>
  )
}

export default CinematicTimer
