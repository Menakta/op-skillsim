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
  /** Initial time remaining (for session restore). If not provided, uses duration. */
  initialTimeRemaining?: number | null
  /** Called when timer expires or user clicks skip */
  onSkipToTraining: () => void
  /** Called when time remaining changes (for state persistence) */
  onTimeChange?: (timeRemaining: number) => void
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
  initialTimeRemaining,
  onSkipToTraining,
  onTimeChange,
  isActive
}: CinematicTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(duration)
  const onSkipRef = useRef(onSkipToTraining)
  const onTimeChangeRef = useRef(onTimeChange)
  const hasInitializedRef = useRef(false)
  const lastReportedTimeRef = useRef<number>(duration)

  // Keep callback refs updated
  useEffect(() => {
    onSkipRef.current = onSkipToTraining
  }, [onSkipToTraining])

  useEffect(() => {
    onTimeChangeRef.current = onTimeChange
  }, [onTimeChange])

  // Initialize timer once when becoming active
  useEffect(() => {
    if (isActive && !hasInitializedRef.current) {
      hasInitializedRef.current = true
      // Use restored time if available, otherwise use full duration
      const startTime = initialTimeRemaining !== null && initialTimeRemaining !== undefined
        ? initialTimeRemaining
        : duration
      setTimeRemaining(startTime)
      lastReportedTimeRef.current = startTime
    }
  }, [isActive, duration, initialTimeRemaining])

  // Countdown timer
  useEffect(() => {
    if (!isActive) return

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          // Schedule callback outside of state setter to avoid React warning
          setTimeout(() => onSkipRef.current(), 0)
          return 0
        }
        const newTime = prev - 1

        // Report time changes every 30 seconds (to reduce saves)
        // Schedule callback outside of state setter to avoid React warning
        if (lastReportedTimeRef.current - newTime >= 30) {
          lastReportedTimeRef.current = newTime
          setTimeout(() => onTimeChangeRef.current?.(newTime), 0)
        }

        return newTime
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
        ? 'bg-[#000000]/55 hover:bg-[#000000]/70 border-white/10'
        : 'bg-white/88 hover:bg-white/95 border-gray-200 shadow-lg'
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
        id="btn-skip-to-training"
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
