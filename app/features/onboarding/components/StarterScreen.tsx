'use client'

import Image from 'next/image'
import { Play } from 'lucide-react'

// =============================================================================
// Props Interface
// =============================================================================

interface StarterScreenProps {
  isOpen: boolean
  title?: string
  subtitle?: string
  onStart: () => void
  onHover?: () => void  // Called when user hovers on start button (for prefetching)
  buttonText?: string
}

// =============================================================================
// Component
// =============================================================================

export function StarterScreen({
  isOpen,
  title = 'Start Exercise',
  subtitle = 'Click the button below to begin your training session',
  onStart,
  onHover,
  buttonText = 'Start'
}: StarterScreenProps) {
  // Don't render if not open
  if (!isOpen) return null

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        className=""
        style={{
          animation: 'modalFadeIn 0.3s ease-out'
        }}
      >
        {/* Content */}
        <div className="px-8 py-10 flex flex-col items-center">

          {/* Title */}
          <h1 className="text-white text-[50px] font-bold mb-10 text-center">{title}</h1>
          {/* Start Button */}
          <button
            onClick={onStart}
            onMouseEnter={onHover}
            onFocus={onHover}
            className="py-3 px-8 rounded-full font-medium bg-[#44CF8A] text-white  transition-all duration-300 shadow-lg shadow-[#39BEAE]/30 flex items-center gap-3 text-lg cursor-pointer hover:bg-[#39BEAE] hover:shadow-[#44CF8A]/30"
          >
            <Play size={30} />
            {buttonText}
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

export default StarterScreen
