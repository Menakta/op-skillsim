'use client'

import { Layers, Minimize2, Maximize2 } from 'lucide-react'
import { useTheme } from '@/app/context/ThemeContext'

// =============================================================================
// Props Interface
// =============================================================================

interface ExplosionControlsProps {
  /** Current explosion value (0-100) */
  value: number
  /** Called when explosion value changes */
  onValueChange: (value: number) => void
  /** Called when explode button is clicked */
  onExplode: () => void
  /** Called when assemble button is clicked */
  onAssemble: () => void
  /** Whether the controls are visible */
  isVisible: boolean
}

// =============================================================================
// Component
// =============================================================================

export function ExplosionControls({
  value,
  onValueChange,
  onExplode,
  onAssemble,
  isVisible
}: ExplosionControlsProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  if (!isVisible) return null

  return (
    <div className={`fixed left-4 top-20 z-30 w-53 backdrop-blur-md rounded-xl border overflow-hidden ${
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
        <div className="flex items-center gap-2">
          <Layers className="w-3 h-4 text-[#39BEAE]" />
          <h3 className={`font-semibold text-xs ${isDark ? 'text-white' : 'text-gray-900'}`}>Building Explosion</h3>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className={`text-sm ${isDark ? 'text-white/70' : 'text-gray-600'}`}>Explosion Level</label>
            <span className="text-[#39BEAE] font-mono font-semibold">{Math.round(value)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={value}
            onChange={(e) => onValueChange(Number(e.target.value))}
            className={`w-full h-2 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#39BEAE] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-[#39BEAE]/30 ${
              isDark ? 'bg-gray-700' : 'bg-gray-300'
            }`}
          />
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-1 gap-1">
          <button
            onClick={onExplode}
            className="flex items-center justify-center gap-2 px-2 py-2 bg-[#39BEAE] hover:bg-[#2ea89a] text-white rounded-lg transition-all duration-200 text-sm font-medium"
          >
            <Maximize2 className="w-4 h-4" />
            Explode
          </button>
          <button
            onClick={onAssemble}
            className={`flex items-center justify-center gap-2 px-2 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
              isDark
                ? 'bg-gray-600 hover:bg-gray-500 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            }`}
          >
            <Minimize2 className="w-4 h-4" />
            Assemble
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExplosionControls
