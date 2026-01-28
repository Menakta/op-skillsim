'use client'

/**
 * TrainingSidebar Component
 *
 * Slim full-height sidebar for training mode (desktop only).
 * Opens/closes via a toggle button at top-left.
 * Contains three icon buttons stacked vertically:
 *   1. Theme Toggle (light/dark)
 *   2. Pause/Resume Training
 *   3. Quit Training
 */

import { useState } from 'react'
import { Sun, Moon, Play, Pause, LogOut, PanelLeftOpen, X } from 'lucide-react'
import { useTheme } from '@/app/context/ThemeContext'

// =============================================================================
// Props Interface
// =============================================================================

interface TrainingSidebarProps {
  isPaused: boolean
  isVisible: boolean
  onPause: () => void
  onResume: () => void
  onQuit: () => void
}

// =============================================================================
// Component
// =============================================================================

export function TrainingSidebar({
  isPaused,
  isVisible,
  onPause,
  onResume,
  onQuit,
}: TrainingSidebarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  if (!isVisible) return null

  return (
    <>
      {/* Toggle button — top-left, same position as cinematic sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`${sidebarOpen ? 'hidden' : 'sm:flex'} fixed top-4 left-4 z-50 w-10 h-10 rounded-xl items-center justify-center backdrop-blur-md border transition-all duration-200 ${
          isDark
            ? 'bg-black/70 hover:bg-black/80 text-white/80 hover:text-white border-white/10'
            : 'bg-white/90 hover:bg-white text-gray-700 hover:text-gray-900 border-gray-200 shadow-lg'
        }`}
        title="Open Controls"
      >
        <PanelLeftOpen className="w-5 h-5" />
      </button>

      {/* Sidebar */}
      <div
        className={`hidden sm:flex fixed top-0 left-0 bottom-0 z-40 w-[50px] flex-col items-center py-4 gap-3 border-r backdrop-blur-md transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isDark ? 'bg-black/90 border-white/10' : 'bg-white/95 border-gray-200 shadow-xl'}`}
      >
        {/* Close button */}
        <button
          onClick={() => setSidebarOpen(false)}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
            isDark
              ? 'text-gray-400 hover:text-white hover:bg-white/10'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
          }`}
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Divider */}
        <div className={`w-6 h-px ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />

        {/* Theme Toggle */}
        <div className='flex items-center justify-center flex-col h-screen'>  <button
          onClick={toggleTheme}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
            isDark
              ? 'text-white/80 hover:text-white hover:bg-white/10'
              : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
          }`}
          title={isDark ? 'Light Mode' : 'Dark Mode'}
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Pause/Resume */}
        <button
          onClick={isPaused ? onResume : onPause}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
            isPaused
              ? 'bg-[#39BEAE] text-white hover:bg-[#2ea89a]'
              : isDark
                ? 'text-white/80 hover:text-white hover:bg-white/10'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
          }`}
          title={isPaused ? 'Resume Training' : 'Pause Training'}
        >
          {isPaused ? <Play className="w-5 h-5 ml-0.5" /> : <Pause className="w-5 h-5" />}
        </button>

        {/* Quit */}
        <button
          onClick={onQuit}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-red-400 hover:text-white hover:bg-red-500 transition-all duration-200"
          title="Quit Training"
        >
          <LogOut className="w-5 h-5" />
        </button>
</div>
      
        {/* Paused indicator */}
        {isPaused && (
          <div className="mt-auto mb-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          </div>
        )}
      </div>
    </>
  )
}

export default TrainingSidebar
