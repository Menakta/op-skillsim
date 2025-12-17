'use client'

// =============================================================================
// Props Interface
// =============================================================================

interface StatusBarProps {
  isConnected: boolean
  mode: 'cinematic' | 'training'
  phase: string
  progress: number
  isDark?: boolean
}

// =============================================================================
// Component
// =============================================================================

export function StatusBar({
  isConnected,
  mode,
  phase,
  progress,
  isDark = true
}: StatusBarProps) {
  const handleFullscreen = () => {
    document.documentElement.requestFullscreen()
  }

  const bgColor = isDark ? 'bg-gray-900/80' : 'bg-white/80'
  const textColor = isDark ? 'text-white' : 'text-gray-900'
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-600'
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-300'
  const accentColor = '#39BEAE'

  return (
    <div className="absolute top-4 left-20 right-24 flex justify-between items-center pointer-events-none z-20">
      <div className={`flex items-center gap-3 px-4 py-2.5 ${bgColor} backdrop-blur-sm rounded-xl pointer-events-auto shadow-lg`}>
        <span className={`${textColor} text-sm font-bold`} style={{ color: accentColor }}>OP Skillsim</span>

        {/* Connection Status */}
        <div className={`flex items-center gap-1.5 ml-2 pl-3 border-l ${borderColor}`}>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'animate-pulse' : ''}`} style={{ backgroundColor: isConnected ? accentColor : '#eab308' }} />
          <span className={`text-xs ${textSecondary}`}>{isConnected ? 'Live' : 'Connecting'}</span>
        </div>

        {/* Mode */}
        <div className={`flex items-center gap-1.5 ml-2 pl-3 border-l ${borderColor}`}>
          <span className={`text-xs ${textSecondary}`}>Mode:</span>
          <span className={`text-xs font-medium ${textColor}`}>{mode}</span>
        </div>

        {/* Progress */}
        {progress > 0 && (
          <div className={`flex items-center gap-1.5 ml-2 pl-3 border-l ${borderColor}`}>
            <span className="text-xs font-bold" style={{ color: accentColor }}>{progress.toFixed(0)}%</span>
          </div>
        )}

        {/* Phase (only in training mode) */}
        {mode === 'training' && (
          <div className={`flex items-center gap-1.5 ml-2 pl-3 border-l ${borderColor}`}>
            <span className="text-xs font-medium" style={{ color: accentColor }}>{phase}</span>
          </div>
        )}
      </div>

      {/* Fullscreen Button */}
      <button
        onClick={handleFullscreen}
        className={`p-2.5 ${bgColor} backdrop-blur-sm rounded-xl shadow-lg pointer-events-auto transition-all hover:scale-105`}
        style={{ color: isDark ? 'white' : accentColor }}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      </button>
    </div>
  )
}

export default StatusBar
