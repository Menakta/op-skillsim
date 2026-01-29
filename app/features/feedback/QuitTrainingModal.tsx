'use client'

/**
 * QuitTrainingModal Component
 *
 * Confirmation modal shown when user clicks the quit button during training.
 * Warns user that progress will be saved and they can resume later.
 */

import { AlertTriangle, X } from 'lucide-react'
import { useTheme } from '@/app/context/ThemeContext'

// =============================================================================
// Props Interface
// =============================================================================

interface QuitTrainingModalProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  currentPhase: number
  totalPhases: number
  isLti?: boolean
}

// =============================================================================
// Component
// =============================================================================

export function QuitTrainingModal({
  isOpen,
  onConfirm,
  onCancel,
  currentPhase,
  totalPhases,
  isLti = true
}: QuitTrainingModalProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 2147483647 }}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 backdrop-blur-sm ${isDark ? 'bg-black/70' : 'bg-black/40'}`}
        onClick={onCancel}
      />

      {/* Modal Content */}
      <div className={`relative w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden ${
        isDark
          ? 'bg-[#1A1A1A] border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        {/* Close Button */}
        <button
          onClick={onCancel}
          className={`absolute top-4 right-4 p-1 rounded-full transition-colors ${
            isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-200'
          }`}
          aria-label="Close"
        >
          <X className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
        </button>

        {/* Header with Warning Icon */}
        <div className="pt-8 pb-4 px-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Quit Training?</h2>
        </div>

        {/* Body */}
        <div className="px-6 pb-6">
          <p className={`text-center mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Are you sure you want to quit the training session?
          </p>

          {/* Progress Info */}
          <div className={`rounded-lg p-4 mb-6 ${isDark ? 'bg-gray-800/50' : 'bg-gray-100'}`}>
            <div className="flex justify-between items-center mb-2">
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Current Progress</span>
              <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Phase {currentPhase + 1} of {totalPhases}
              </span>
            </div>
            <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`}>
              <div
                className="h-full bg-[#39BEAE] rounded-full transition-all duration-300"
                style={{ width: `${((currentPhase + 1) / totalPhases) * 100}%` }}
              />
            </div>
          </div>

          {/* Info Text */}
          <div className={`rounded-lg p-3 mb-6 border ${
            isDark
              ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
              : 'bg-blue-50 border-blue-200 text-blue-700'
          }`}>
            <p className="text-sm">
              Your progress will be saved. You can resume from Phase {currentPhase + 1} when you return.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className={`flex-1 px-4 py-3 font-medium rounded-lg transition-colors ${
                isDark
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
            >
              Continue Training
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
            >
              Quit
            </button>
          </div>

          {/* Additional Info for LTI users */}
          {isLti && (
            <p className={`text-xs text-center mt-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              You will be redirected back to your learning platform.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default QuitTrainingModal
