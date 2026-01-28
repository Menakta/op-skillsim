'use client'

/**
 * TrainingSidebar Component
 *
 * Slim full-height sidebar for training mode (desktop only).
 * Opens/closes via a toggle button at top-left.
 * Contains:
 *   1. Theme Toggle (light/dark)
 *   2. Pause/Resume Training
 *   3. Quit Training
 *   4. Task Tools (when PipeConnection or PressureTester is selected)
 *
 * Auto-opens when a phase requiring sub-tools (pipes, air plug) is active.
 */

import { useState, useEffect } from 'react'
import { Sun, Moon, Play, Pause, LogOut, PanelLeftOpen, X, Plug } from 'lucide-react'
import Image from 'next/image'
import { useTheme } from '@/app/context/ThemeContext'
import { useFittingOptions } from '@/app/features/training'
import type { TrainingState } from '@/app/hooks/useTrainingMessagesComposite'

// =============================================================================
// Props Interface
// =============================================================================

interface TrainingSidebarProps {
  isPaused: boolean
  isVisible: boolean
  onPause: () => void
  onResume: () => void
  onQuit: () => void
  // Task Tools props
  trainingState?: TrainingState
  onSelectPipe?: (pipe: string) => void
  onSelectPressureTest?: (testType: 'air-plug' | 'conduct-test') => void
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
  trainingState,
  onSelectPipe,
  onSelectPressureTest,
}: TrainingSidebarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const { pipeTypes, loading: fittingsLoading } = useFittingOptions()

  // Check if current tool requires sub-tools
  const showPipeSelection = trainingState?.selectedTool === 'PipeConnection'
  const showPressureTest = trainingState?.selectedTool === 'PressureTester'
  const requiresSubTools = showPipeSelection || showPressureTest

  // Auto-open sidebar when a phase requiring sub-tools is active
  useEffect(() => {
    if (requiresSubTools && !sidebarOpen) {
      setSidebarOpen(true)
    }
  }, [requiresSubTools, sidebarOpen])

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
        <div className='flex items-center justify-center flex-col h-screen'>  
          <button
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
          className="w-10 h-10 bg-red-500 hover:bg-red-600 rounded-xl flex items-center justify-center text-white hover:text-white transition-all duration-200"
          title="Quit Training"
        >
          <LogOut className="w-5 h-5" />
        </button>

        {/* Task Tools Section - Only when PipeConnection or PressureTester is selected */}
        
        {requiresSubTools && (
          <>
            {/* Divider */}
            <div className={`w-6 h-px mt-2 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />

            {/* Section Label */}
            <span className={`text-[10px] font-medium mt-1 ${isDark ? 'text-white/50' : 'text-gray-400'}`}>
              Materials
            </span>

            {/* Pipe Selection - When PipeConnection tool is selected */}
            {showPipeSelection && !fittingsLoading && onSelectPipe && (
              <>
                {pipeTypes.map((pipe) => {
                  const isSelected = trainingState?.selectedPipe === pipe.id
                  return (
                    
                       <button
                      key={pipe.id}
                      onClick={() => onSelectPipe(pipe.id)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 m-1 ${
                        isSelected
                          ? 'bg-[#39BEAE] ring-2 ring-white'
                          : isDark
                            ? 'bg-white/10 hover:bg-[#39BEAE]'
                            : 'bg-gray-500 hover:bg-[#39BEAE]'
                      }`}
                      title={pipe.label}
                    >
                      <Image
                        src={pipe.icon}
                        alt={pipe.label}
                        width={22}
                        height={22}
                      />
                    </button>
                   
                  )
                })}
              </>
            )}

            {/* Loading state for pipes */}
            {showPipeSelection && fittingsLoading && (
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
                <span className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-400'}`}>...</span>
              </div>
            )}

            {/* Pressure Test Options - When PressureTester tool is selected */}
            {showPressureTest && onSelectPressureTest && (
              <>
                {/* Air Plug */}
                <button
                  onClick={() => onSelectPressureTest('air-plug')}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 m-1${
                    trainingState?.airPlugSelected
                      ? 'bg-[#39BEAE] ring-white'
                      : isDark
                        ? 'bg-white hover:bg-[#39BEAE]'
                        : 'bg-gray-500 hover:bg-[#39BEAE]'
                  }`}
                  title={trainingState?.airPlugSelected ? '✓ Air Plug Selected' : 'Select Air Plug'}
                >
                  <Plug className={isDark ? 'text-white' : 'text-gray-800'} />
                </button>

                {/* Conduct Test */}
                <button
                  onClick={() => trainingState?.airPlugSelected && onSelectPressureTest('conduct-test')}
                  disabled={!trainingState?.airPlugSelected}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 m-1 ${
                    trainingState?.airPlugSelected
                      ? isDark
                        ? 'bg-white hover:bg-[#39BEAE]'
                        : 'bg-gray-500 hover:bg-[#39BEAE]'
                      : 'bg-gray-700/40 opacity-50 cursor-not-allowed'
                  }`}
                  title={trainingState?.airPlugSelected ? 'Conduct Test' : 'Select Air Plug First'}
                >
                  <Play className={isDark ? 'text-white' : 'text-gray-800'} />
                </button>
              </>
            )}
          </>
        )}
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
