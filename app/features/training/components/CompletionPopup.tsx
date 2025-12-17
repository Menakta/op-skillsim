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
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-2xl p-8 max-w-md w-full mx-4 text-center shadow-2xl">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-3xl font-bold text-white mb-2">Training Complete!</h2>
        <p className="text-green-100 text-lg mb-6">
          Congratulations! You have successfully completed all {totalTasks} training tasks.
        </p>
        <div className="bg-white/20 rounded-lg p-4 mb-6">
          <div className="text-green-100 text-sm">Final Progress</div>
          <div className="text-white text-4xl font-bold">{progress.toFixed(0)}%</div>
        </div>
        <button
          onClick={handleStartOver}
          className="px-8 py-3 bg-white text-green-700 rounded-lg font-bold hover:bg-green-50 transition-colors"
        >
          Start Over
        </button>
      </div>
    </div>
  )
}

export default CompletionPopup
