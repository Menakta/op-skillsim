'use client'

import { useState, useEffect } from 'react'
import { MapPin, Navigation, RefreshCw, X, Play, Square } from 'lucide-react'
import { useTheme } from '@/app/context/ThemeContext'

// =============================================================================
// Types
// =============================================================================

interface WaypointData {
  index: number
  name: string
}

// =============================================================================
// Props Interface
// =============================================================================

interface WaypointControlsProps {
  /** List of available waypoints */
  waypoints: WaypointData[]
  /** Currently active waypoint index (-1 if none) */
  activeWaypointIndex: number
  /** Name of active waypoint */
  activeWaypointName: string
  /** Current progress along waypoint spline (0-100) */
  waypointProgress?: number
  /** Called to refresh waypoint list */
  onRefresh: () => void
  /** Called when a waypoint is activated */
  onActivate: (index: number) => void
  /** Called when waypoint is deactivated */
  onDeactivate: () => void
  /** Called when waypoint progress changes (controls camera position along spline) */
  onProgressChange?: (progress: number) => void
  /** Whether the controls are visible */
  isVisible: boolean
}

// =============================================================================
// Component
// =============================================================================

export function WaypointControls({
  waypoints,
  activeWaypointIndex,
  activeWaypointName,
  waypointProgress = 0,
  onRefresh,
  onActivate,
  onDeactivate,
  onProgressChange,
  isVisible
}: WaypointControlsProps) {
  const [localProgress, setLocalProgress] = useState(waypointProgress)
  const isWaypointActive = activeWaypointIndex >= 0
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  // Sync local progress with prop
  useEffect(() => {
    setLocalProgress(waypointProgress)
  }, [waypointProgress])

  const handleProgressChange = (value: number) => {
    setLocalProgress(value)
    onProgressChange?.(value)
  }

  if (!isVisible) return null

  return (
    <div className={`fixed right-4 top-1/3 -translate-y-1/2 z-30 w-53 max-h-[80vh] backdrop-blur-md rounded-xl border overflow-hidden ${
      isDark
        ? 'bg-black/80 border-white/10'
        : 'bg-white/90 border-gray-200 shadow-lg'
    }`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b ${
        isDark
          ? 'bg-gradient-to-r from-[#39BEAE]/20 to-transparent border-white/10'
          : 'bg-gradient-to-r from-[#39BEAE]/10 to-transparent border-gray-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-[#39BEAE]" />
            <h3 className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Waypoint Navigation</h3>
          </div>
          <button
            onClick={onRefresh}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark
                ? 'text-gray-400 hover:text-white hover:bg-white/10'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
            title="Refresh waypoints"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-2 space-y-4 overflow-y-auto">
        {/* Active Waypoint Display */}
        {isWaypointActive && (
          <div className="p-3 bg-[#39BEAE]/20 rounded-lg border border-[#39BEAE]/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#39BEAE] rounded-full animate-pulse" />
                <span className="text-[#39BEAE] font-medium text-sm">Active Waypoint</span>
              </div>
              <button
                onClick={onDeactivate}
                className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                title="Deactivate waypoint"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>{activeWaypointName}</div>

            {/* Progress Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={`text-xs ${isDark ? 'text-white/70' : 'text-gray-600'}`}>Camera Position</label>
                <span className="text-[#39BEAE] font-mono text-xs">{Math.round(localProgress)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={localProgress}
                onChange={(e) => handleProgressChange(Number(e.target.value))}
                className={`w-full h-2 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#39BEAE] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-[#39BEAE]/30 ${
                  isDark ? 'bg-gray-700' : 'bg-gray-300'
                }`}
              />
              <div className={`flex justify-between text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                <span>Start</span>
                <span>End</span>
              </div>
            </div>
          </div>
        )}

        {/* Waypoint List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className={`text-sm font-medium ${isDark ? 'text-white/70' : 'text-gray-600'}`}>Available Waypoints</h4>
            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{waypoints.length} found</span>
          </div>

          {waypoints.length === 0 ? (
            <div className="text-center py-6">
              <MapPin className={`w-8 h-8 mx-auto mb-2 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>No waypoints available</p>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Add waypoints in the scene</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {waypoints.map((waypoint) => {
                const isActive = activeWaypointIndex === waypoint.index
                return (
                  <button
                    key={waypoint.index}
                    onClick={() => isActive ? onDeactivate() : onActivate(waypoint.index)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                      isActive
                        ? 'bg-[#39BEAE] text-white'
                        : isDark
                          ? 'bg-[#39BEAE]/20 hover:bg-[#39BEAE]/30 text-gray-300'
                          : 'bg-[#39BEAE]/10 hover:bg-[#39BEAE]/20 text-gray-700'
                    }`}
                  >
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isActive ? 'bg-white/20' : 'bg-[#39BEAE]'}`}>
                      {isActive ? (
                        <Square className="w-3 h-3" />
                      ) : (
                        <Play className="w-3 h-3 ml-0.5 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-xs truncate">{waypoint.name}</div>
                      <div className={`text-xs ${isActive ? 'text-white/70' : isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        Waypoint {waypoint.index + 1}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Custom scrollbar styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${isDark ? '#4b5563' : '#d1d5db'};
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${isDark ? '#6b7280' : '#9ca3af'};
        }
      `}</style>
    </div>
  )
}

export default WaypointControls
