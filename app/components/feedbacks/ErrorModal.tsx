'use client'

// =============================================================================
// Props Interface
// =============================================================================
import { X, AlertTriangle } from "lucide-react"
import Image from "next/image"

interface ErrorModalProps {
  isOpen: boolean
  title: string
  message: string
  errorText?: string
  onRetry: () => void
  onClose?: () => void
  retryButtonText?: string
  closeButtonText?: string
  showCloseButton?: boolean
}

// =============================================================================
// Component
// =============================================================================

export function ErrorModal({
  isOpen,
  title,
  message,
  errorText = 'Task failed. Please try again.',
  onRetry,
  onClose,
  retryButtonText = 'Retry',
  closeButtonText = 'Close',
  showCloseButton = true
}: ErrorModalProps) {
  // Don't render if not open
  if (!isOpen) return null

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      onRetry()
    }
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div
        className="bg-[#000000]/40 backdrop-blur-md rounded-2xl max-w-[440px] w-full max-h-[313px] mx-2 shadow-2xl border border-gray-700/50"
        style={{
          animation: 'modalFadeIn 0.3s ease-out'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-400 px-5 py-4">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-white font-medium text-base">{title}</h3>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-6 h-6 bg-[#000000]/70 hover:bg-red-500 rounded-full flex items-center justify-center transition-all duration-300"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 pt-3">
          <p className="text-white text-[36px] leading-relaxed font-semibold flex items-center gap-2 justify-center">
            <AlertTriangle size={30} color="#FF6B6B" />
            {message}
          </p>
        </div>

        {/* Error Indicator - Full Width */}
        <div className="p-2 rounded-xl mb-2 mx-1 text-gray-300 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <span className="text-[18px]">{errorText}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3 px-5 pb-6">
          {showCloseButton && onClose && (
            <button
              onClick={onClose}
              className="py-2 px-4 rounded-full font-medium bg-black/20 text-white hover:bg-black/30 transition-all duration-200 border border-gray-500/50 flex items-center gap-2"
            >
              {closeButtonText}
            </button>
          )}
          <button
            onClick={onRetry}
            className="py-2 px-4 rounded-full font-medium bg-red-500 text-white hover:bg-red-600 transition-all duration-200 shadow-lg shadow-red-500/20 flex items-center gap-2"
          >
            <Image src="/icons/retry.png" alt="Retry" width={20} height={20} />
            {retryButtonText}
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

export default ErrorModal
