'use client'

import { useAppSelector } from '@/app/store/hooks'
import { selectExplosionState, selectTrainingMode } from '@/app/store/slices/trainingSlice'

// =============================================================================
// Props Interface - Only actions, state from Redux
// =============================================================================

interface CinematicTabProps {
  onSetExplosionLevel: (level: number) => void
  onExplodeBuilding: () => void
  onAssembleBuilding: () => void
  onStartTraining: () => void
}

// =============================================================================
// Component
// =============================================================================

export function CinematicTab({
  onSetExplosionLevel,
  onExplodeBuilding,
  onAssembleBuilding,
  onStartTraining
}: CinematicTabProps) {
  // Get state from Redux
  const { explosionValue, isAnimating } = useAppSelector(selectExplosionState)
  const mode = useAppSelector(selectTrainingMode)
  const isCinematicMode = mode === 'cinematic'

  return (
    <div className="space-y-4">
      <div className="bg-[#1e2a4a] rounded-lg p-4 border border-[#2c3e50]">
        <h3 className="text-blue-400 text-sm font-medium border-b border-[#2c3e50] pb-2 mb-3">🏗️ Building Explosion</h3>

        {/* Explosion Slider */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Explosion Level</span>
            <span>{Math.round(explosionValue)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={explosionValue}
            onChange={(e) => onSetExplosionLevel(parseInt(e.target.value))}
            className="w-full h-2 bg-[#2c3e50] rounded appearance-none cursor-pointer accent-blue-400"
          />
        </div>

        {/* Explode/Assemble Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onExplodeBuilding}
            className="p-3 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
          >
            💥 Explode
          </button>
          <button
            onClick={onAssembleBuilding}
            className="p-3 bg-gray-600 text-white rounded text-sm hover:bg-gray-500 transition-colors"
          >
            🔧 Assemble
          </button>
        </div>

        {/* Animation Status */}
        {isAnimating && (
          <div className="text-yellow-400 text-xs mt-3 animate-pulse text-center">
            🔄 Animating...
          </div>
        )}
      </div>

      {/* Start Training Button - Only show in cinematic mode */}
      {isCinematicMode && (
        <button
          onClick={onStartTraining}
          className="w-full p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-bold text-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg shadow-blue-500/30"
        >
          🎯 Start Training
        </button>
      )}
    </div>
  )
}

export default CinematicTab
