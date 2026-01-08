'use client'

import { X } from 'lucide-react'
import Image from 'next/image'

// =============================================================================
// Props Interface
// =============================================================================

interface NavigationWalkthroughProps {
  isOpen: boolean
  onClose: () => void
}

// =============================================================================
// Component
// =============================================================================

export function NavigationWalkthrough({
  isOpen,
  onClose
}: NavigationWalkthroughProps) {
  // Don't render if not open
  if (!isOpen) return null

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div
        className="bg-black/40 rounded-2xl max-w-[550px] w-full mx-4 shadow-2xl overflow-hidden"
        style={{
          animation: 'modalFadeIn 0.3s ease-out'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#2a2a2a]">
          <h3 className="text-white font-semibold text-lg">Navigation instruction</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 bg-[#1a1a1a] hover:bg-[#39BEAE] rounded-full flex items-center justify-center transition-all duration-300"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Content - Desktop Only */}
        <div className="p-6">
          <div className="grid grid-cols-3 gap-6 max-w-[500px] mx-auto">
            {/* Choose */}
            <div className="flex flex-col items-center">
              <div className="h-[80px] flex items-center justify-center">
                <Image
                  src="/icons/choose-mouse-button.png"
                  alt="Choose"
                  width={50}
                  height={80}
                  style={{ width: 'auto', height: 'auto' }}
                />
              </div>
              <span className="text-gray-300 text-sm mt-2">Choose</span>
            </div>
            {/* Zoom In/Out */}
            <div className="flex flex-col items-center">
              <div className="h-[80px] flex items-center justify-center">
                <Image
                  src="/icons/zoom-in-out-mouse-button.png"
                  alt="Zoom In/Out"
                  width={50}
                  height={80}
                  style={{ width: 'auto', height: 'auto' }}
                />
              </div>
              <span className="text-gray-300 text-sm mt-2">Zoom In/Out</span>
            </div>
            {/* Empty space for alignment */}
            <div></div>
            {/* Rotate */}
            <div className="flex flex-col items-center">
              <div className="h-[80px] flex items-center justify-center">
                <Image
                  src="/icons/rotate-mouse.png"
                  alt="Rotate"
                  width={70}
                  height={80}
                  style={{ width: 'auto', height: 'auto' }}
                />
              </div>
              <span className="text-gray-300 text-sm mt-2">Rotate</span>
            </div>
            {/* Pan */}
            <div className="flex flex-col items-center">
              <div className="h-[80px] flex items-center justify-center">
                <Image
                  src="/icons/pan-mouse.png"
                  alt="Pan"
                  width={70}
                  height={80}
                  style={{ width: 'auto', height: 'auto' }}
                />
              </div>
              <span className="text-gray-300 text-sm mt-2">Pan</span>
            </div>
            {/* Pan with keyboard */}
            <div className="flex flex-col items-center">
              <div className="h-[80px] flex items-center justify-center">
                <Image
                  src="/icons/pan.png"
                  alt="Pan with WASD"
                  width={80}
                  height={70}
                  style={{ width: 'auto', height: 'auto' }}
                />
              </div>
              <span className="text-gray-300 text-sm mt-2">Pan</span>
            </div>
          </div>
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

export default NavigationWalkthrough
