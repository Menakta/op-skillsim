'use client'

/**
 * BaseModal Component
 *
 * Reusable modal component that serves as the foundation for all modals.
 * Provides consistent styling, animations, and behavior.
 * Supports light/dark theme via ThemeContext.
 */

import { ReactNode } from 'react'
import { X } from 'lucide-react'
import { useTheme } from '@/app/context/ThemeContext'

// =============================================================================
// Types
// =============================================================================

export interface BaseModalProps {
  /** Whether the modal is visible */
  isOpen: boolean
  /** Called when the modal should close */
  onClose?: () => void
  /** Modal title displayed in header */
  title?: string
  /** Show close button in header */
  showCloseButton?: boolean
  /** Modal content */
  children: ReactNode
  /** Additional class names for the modal container */
  className?: string
  /** Modal size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Close button hover color */
  closeButtonColor?: 'default' | 'red' | 'teal'
  /** Whether clicking backdrop closes modal */
  closeOnBackdropClick?: boolean
}

// =============================================================================
// Size Classes
// =============================================================================

const SIZE_CLASSES = {
  sm: 'max-w-[320px]',
  md: 'max-w-[440px]',
  lg: 'max-w-[560px]',
  xl: 'max-w-[720px]',
}

// =============================================================================
// Component
// =============================================================================

export function BaseModal({
  isOpen,
  onClose,
  title,
  showCloseButton = true,
  children,
  className = '',
  size = 'md',
  closeButtonColor = 'default',
  closeOnBackdropClick = true,
}: BaseModalProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  // Don't render if not open
  if (!isOpen) return null

  const handleBackdropClick = () => {
    if (closeOnBackdropClick && onClose) {
      onClose()
    }
  }

  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  // Theme-aware close button colors
  const closeButtonColors = {
    default: isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-300',
    red: 'hover:bg-red-500',
    teal: 'hover:bg-[#2ea89a]',
  }

  return (
    <div
      className={`absolute inset-0 z-30 flex items-center justify-center ${
        isDark ? 'bg-black/20' : 'bg-black/30'
      } backdrop-blur-sm`}
      onClick={handleBackdropClick}
    >
      <div
        className={`
          backdrop-blur-md rounded-2xl w-full mx-2
          shadow-2xl border
          ${isDark
            ? 'bg-[#000000]/40 border-gray-700/50'
            : 'bg-white/95 border-gray-200 shadow-xl'
          }
          ${SIZE_CLASSES[size]}
          ${className}
        `}
        style={{
          animation: 'modalFadeIn 0.3s ease-out'
        }}
        onClick={handleContentClick}
      >
        {/* Header - only show if title or close button */}
        {(title || showCloseButton) && (
          <div className={`flex items-center justify-between pb-4 border-b px-5 py-4 ${
            isDark ? 'border-gray-400' : 'border-gray-200'
          }`}>
            <div className="flex items-center gap-3">
              {title && (
                <h3 className={`font-medium text-base ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>{title}</h3>
              )}
            </div>
            {showCloseButton && onClose && (
              <button
                onClick={onClose}
                className={`
                  w-6 h-6 rounded-full
                  flex items-center justify-center
                  transition-all duration-300
                  ${isDark ? 'bg-[#000000]/70' : 'bg-gray-100'}
                  ${closeButtonColors[closeButtonColor]}
                `}
              >
                <X className={`w-4 h-4 ${isDark ? 'text-white' : 'text-gray-600'}`} />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        {children}
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

// =============================================================================
// Sub-components for Composition
// =============================================================================

export interface ModalContentProps {
  children: ReactNode
  className?: string
}

export function ModalContent({ children, className = '' }: ModalContentProps) {
  return (
    <div className={`px-5 py-4 ${className}`}>
      {children}
    </div>
  )
}

export interface ModalFooterProps {
  children: ReactNode
  className?: string
}

export function ModalFooter({ children, className = '' }: ModalFooterProps) {
  return (
    <div className={`flex items-center justify-center gap-3 px-5 pb-6 ${className}`}>
      {children}
    </div>
  )
}

export interface ModalMessageProps {
  icon?: ReactNode
  message: string
  subText?: string
  className?: string
}

export function ModalMessage({ icon, message, subText, className = '' }: ModalMessageProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className={`px-5 pt-3 ${className}`}>
      <p className={`text-[36px] leading-relaxed font-semibold flex items-center gap-2 justify-center ${
        isDark ? 'text-white' : 'text-gray-900'
      }`}>
        {icon}
        {message}
      </p>
      {subText && (
        <div className={`p-2 rounded-xl mb-2 mx-1 flex items-center justify-center ${
          isDark ? 'text-gray-300' : 'text-gray-600'
        }`}>
          <span className="text-[18px] text-center">{subText}</span>
        </div>
      )}
    </div>
  )
}

export default BaseModal
