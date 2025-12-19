'use client'

// =============================================================================
// Props Interface
// =============================================================================
import { Check, X } from "lucide-react"
import Image from "next/image"
interface SuccessModalProps {
  isOpen: boolean
  title: string
  message: string
  successText?: string
  onContinue: () => void
  onRetry?: () => void
  continueButtonText?: string
  retryButtonText?: string
  showRetryButton?: boolean
}

// =============================================================================
// Component
// =============================================================================

export function SuccessModal({
  isOpen,
  title,
  message,
  successText = 'Phase completed successfully!',
  onContinue,
  onRetry,
  continueButtonText = 'Continue',
  retryButtonText = 'Retry',
  showRetryButton = true
}: SuccessModalProps) {
  // Don't render if not open
  if (!isOpen) return null

  return (
    <div className="absolute inset-0 z-30 flex items-center  justify-center bg-black/20 backdrop-blur-sm">
      <div
        className="bg-[#000000]/40 backdrop-blur-md rounded-2xl max-w-[440px] w-full max-h-[313px]  mx-2 shadow-2xl border border-gray-700/50"
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
            onClick={onContinue}
            className="w-6 h-6 bg-[#000000]/70 hover:bg-[#2ea89a] rounded-full flex items-center justify-center transition-all duration-300"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 pt-3">
          <p className="text-white text-[36px] leading-relaxed font-semibold flex items-center gap-2 justify-center"> <Check size={30} color="#70FFC6" />{message}</p>
        </div>

        {/* Success Indicator - Full Width */}
        <div className="p-2 rounded-xl mb-2 mx-1 text-gray-300 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <span className="text-[18px]">{successText}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3 px-5 pb-6">
          {showRetryButton && onRetry && (
            <button
              onClick={onRetry}
              className="py-2 px-4 rounded-full font-medium bg-black/20 text-white hover:bg-black/30 transition-all duration-200 border border-gray-500/50 flex items-center gap-2"
            >
              <Image src="/icons/retry.png" alt="Retry" width={20} height={20} />{retryButtonText}
            </button>
          )}
          <button
            onClick={onContinue}
            className="py-2 px-4 rounded-full font-medium bg-[#39BEAE] text-white hover:bg-[#2ea89a] transition-all duration-200 shadow-lg shadow-[#39BEAE]/20"
          >
            {continueButtonText}
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

export default SuccessModal
