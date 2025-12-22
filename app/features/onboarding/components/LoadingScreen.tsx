'use client'

import Image from 'next/image'

// =============================================================================
// Props Interface
// =============================================================================

interface LoadingScreenProps {
  isOpen: boolean
  title?: string
  subtitle?: string
  statusMessage?: string
  retryCount?: number
  maxRetries?: number
  showRetryInfo?: boolean
}

// =============================================================================
// Component
// =============================================================================

export function LoadingScreen({
  isOpen,
  title = 'Please Wait!',
  subtitle = 'Session is loading',
  statusMessage = 'Connecting to stream',
  retryCount = 0,
  maxRetries = 3,
  showRetryInfo = false
}: LoadingScreenProps) {
  // Don't render if not open
  if (!isOpen) return null

  return (
    <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm">
      <div
        className="backdrop-blur-md rounded-2xl w-full mx-2"
        style={{
          animation: 'modalFadeIn 0.3s ease-out'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-center">
          <h1 className="text-white text-[36px] text-base">{title}</h1>
        </div>

        {/* Content */}
        <div className="px-5 py-8 flex flex-col items-center">
          {/* Loading Icon with Animation */}
          

          {/* Subtitle */}
          <p className="text-white text-xl font-semibold mb-2">{subtitle}</p>

          {/* Status Message with animated dots */}
          <div className="flex items-center gap-1 text-gray-300 text-xs mt-5 mb-2">
            <span>{statusMessage}</span>
            <span className="inline-flex">
              <span className="animate-dot-1">.</span>
              <span className="animate-dot-2">.</span>
              <span className="animate-dot-3">.</span>
            </span>
          </div>
          <div className="relative w-16 h-16 mt-6">
            <Image
              src="/icons/loading.png"
              alt="Loading"
              width={80}
              height={80}
              className="animate-spin-slow"
            />
          </div>

          {/* Retry Info */}
          {showRetryInfo && retryCount > 0 && (
            <p className="text-gray-500 text-xs mt-4">
              Retry attempt {retryCount}/{maxRetries}
            </p>
          )}
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

        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes dot-bounce {
          0%, 80%, 100% {
            opacity: 0;
          }
          40% {
            opacity: 1;
          }
        }

        :global(.animate-spin-slow) {
          animation: spin-slow 2s linear infinite;
        }

        .animate-dot-1 {
          animation: dot-bounce 1.4s ease-in-out infinite;
          animation-delay: 0s;
        }

        .animate-dot-2 {
          animation: dot-bounce 1.4s ease-in-out infinite;
          animation-delay: 0.2s;
        }

        .animate-dot-3 {
          animation: dot-bounce 1.4s ease-in-out infinite;
          animation-delay: 0.4s;
        }
      `}</style>
    </div>
  )
}

export default LoadingScreen
