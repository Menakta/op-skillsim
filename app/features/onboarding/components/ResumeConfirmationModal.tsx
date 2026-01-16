'use client'

import { Play, RotateCcw } from 'lucide-react'
import { TASK_SEQUENCE } from '@/app/config'

// =============================================================================
// Types
// =============================================================================

interface ResumeConfirmationModalProps {
  isOpen: boolean
  phaseIndex: number
  onStartTraining: () => void
  loading?: boolean
}

// =============================================================================
// Helper Functions
// =============================================================================

function getPhaseInfo(index: number) {
  if (index < 0 || index >= TASK_SEQUENCE.length) {
    return { name: 'Start', icon: '🎯' }
  }
  const task = TASK_SEQUENCE[index]
  const icons = ['🔍', '⛏️', '📏', '🔧', '🧴', '🔬', '✅']
  return {
    name: task?.name || 'Unknown Phase',
    icon: icons[index] || '📋',
  }
}

// =============================================================================
// Component
// =============================================================================

export function ResumeConfirmationModal({
  isOpen,
  phaseIndex,
  onStartTraining,
  loading = false,
}: ResumeConfirmationModalProps) {
  if (!isOpen) return null

  const phaseInfo = getPhaseInfo(phaseIndex)
  const isFromStart = phaseIndex === 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div
        className="w-full max-w-md mx-4 bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl border border-white/20 shadow-2xl overflow-hidden"
        style={{
          animation: 'modalFadeIn 0.3s ease-out'
        }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#39BEAE]/30 to-[#44CF8A]/30 px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#39BEAE]/20 rounded-xl flex items-center justify-center text-2xl">
              {phaseInfo.icon}
            </div>
            <div>
              <h2 className="text-white text-xl font-bold">
                {isFromStart ? 'Start Training' : 'Resume Training'}
              </h2>
              <p className="text-white/60 text-sm">
                {isFromStart
                  ? 'Begin from Phase 1'
                  : `Continue from Phase ${phaseIndex + 1}`
                }
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <p className="text-white/80 text-lg mb-2">
              {isFromStart
                ? 'Ready to begin your training session?'
                : `Your progress has been saved at:`
              }
            </p>
            {!isFromStart && (
              <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg">
                <span className="text-2xl">{phaseInfo.icon}</span>
                <span className="text-[#39BEAE] font-semibold text-lg">
                  {phaseInfo.name}
                </span>
              </div>
            )}
          </div>

          {/* Progress indicator */}
          {!isFromStart && (
            <div className="mb-6">
              <div className="flex justify-between text-sm text-white/60 mb-2">
                <span>Progress</span>
                <span>{Math.round((phaseIndex / TASK_SEQUENCE.length) * 100)}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#39BEAE] to-[#44CF8A] rounded-full transition-all duration-500"
                  style={{ width: `${(phaseIndex / TASK_SEQUENCE.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Start Button */}
          <button
            onClick={onStartTraining}
            disabled={loading}
            className="w-full py-4 px-6 bg-gradient-to-r from-[#39BEAE] to-[#44CF8A] hover:from-[#2ea89a] hover:to-[#3ab87a] rounded-xl transition-all duration-300 shadow-lg shadow-[#39BEAE]/30 hover:shadow-[#39BEAE]/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="text-white text-lg font-semibold">Starting...</span>
              </>
            ) : (
              <>
                {isFromStart ? (
                  <Play className="w-6 h-6 text-white" />
                ) : (
                  <RotateCcw className="w-6 h-6 text-white" />
                )}
                <span className="text-white text-lg font-semibold">
                  {isFromStart ? 'Start Training' : 'Resume Training'}
                </span>
              </>
            )}
          </button>

          <p className="text-white/40 text-xs text-center mt-4">
            Click the button above to {isFromStart ? 'begin' : 'continue'} your training
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes modalFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  )
}

export default ResumeConfirmationModal
