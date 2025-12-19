'use client'

// =============================================================================
// Props Interface
// =============================================================================

interface CompletionPopupProps {
  isVisible: boolean
  totalTasks: number
  progress: number
  onReset: () => void
  onClose: () => void
}

// =============================================================================
// Component
// =============================================================================

export function CompletionPopup({
  isVisible,
  totalTasks,
  progress,
  onReset,
  onClose
}: CompletionPopupProps) {
  if (!isVisible) return null

  const handleStartOver = () => {
    onClose()
    onReset()
  }

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div
        className="bg-[#000000]/40 backdrop-blur-md rounded-2xl max-w-md w-full mx-4 shadow-2xl border border-gray-700/50"
        style={{
          animation: 'modalFadeIn 0.3s ease-out'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-400 px-5 py-4">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-white font-medium text-base">Training Complete</h3>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 py-5">
          <p className="text-gray-300 text-sm leading-relaxed">
            Congratulations! You have successfully completed all {totalTasks} training tasks.
          </p>
        </div>

        {/* Progress Display */}
        <div className="px-5 pb-4">
          <div className="bg-[#000000]/30 rounded-xl p-4 border border-gray-600/50">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400 text-sm">Final Progress</span>
              <span className="text-[#39BEAE] text-2xl font-bold">{progress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-[#39BEAE] h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Success Message - Full Width */}
        <div className="p-3 rounded-xl mb-4 mx-2.5 bg-green-500/20 border border-green-500/40 text-green-300">
          <div className="flex items-center gap-2">
            <span className="text-sm">All tasks completed successfully!</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-center gap-3 px-5 pb-6">
          <button
            onClick={handleStartOver}
            className="py-2 px-4 rounded-full font-medium bg-[#39BEAE] text-white hover:bg-[#2ea89a] transition-all duration-200 shadow-lg shadow-[#39BEAE]/20"
          >
            Start Over
          </button>
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

export default CompletionPopup
