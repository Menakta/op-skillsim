'use client'

// =============================================================================
// Props Interface
// =============================================================================
import { X, LogOut, Clock } from "lucide-react"

interface SessionModalProps {
  isOpen: boolean
  title?: string
  message?: string
  reason?: 'expired' | 'logged_out' | 'inactive' | 'kicked' | 'other'
  onLogin: () => void
  onClose?: () => void
  loginButtonText?: string
  closeButtonText?: string
  showCloseButton?: boolean
}

// =============================================================================
// Reason Config
// =============================================================================

const REASON_CONFIG = {
  expired: {
    icon: Clock,
    iconColor: '#FFA500',
    defaultTitle: 'Session Expired',
    defaultMessage: 'Expired',
    defaultText: 'Your session has expired. Please log in again to continue.'
  },
  logged_out: {
    icon: LogOut,
    iconColor: '#39BEAE',
    defaultTitle: 'Logged Out',
    defaultMessage: 'Goodbye!',
    defaultText: 'You have been successfully logged out.'
  },
  inactive: {
    icon: Clock,
    iconColor: '#FFA500',
    defaultTitle: 'Session Timeout',
    defaultMessage: 'Timeout',
    defaultText: 'Your session has timed out due to inactivity. Please log in again.'
  },
  kicked: {
    icon: LogOut,
    iconColor: '#FF6B6B',
    defaultTitle: 'Session Ended',
    defaultMessage: 'Disconnected',
    defaultText: 'Your session was ended by an administrator. Please contact support if you need assistance.'
  },
  other: {
    icon: LogOut,
    iconColor: '#9CA3AF',
    defaultTitle: 'Session Closed',
    defaultMessage: 'Closed',
    defaultText: 'Your session has been closed. Please log in again to continue.'
  }
}

// =============================================================================
// Component
// =============================================================================

export function SessionModal({
  isOpen,
  title,
  message,
  reason = 'other',
  onLogin,
  onClose,
  loginButtonText = 'Log In',
  closeButtonText = 'Close',
  showCloseButton = false
}: SessionModalProps) {
  // Don't render if not open
  if (!isOpen) return null

  const config = REASON_CONFIG[reason]
  const Icon = config.icon
  const displayTitle = title || config.defaultTitle
  const displayMessage = message || config.defaultMessage
  const displayText = config.defaultText

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      onLogin()
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
              <h3 className="text-white font-medium text-base">{displayTitle}</h3>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-6 h-6 bg-[#000000]/70 hover:bg-[#2ea89a] rounded-full flex items-center justify-center transition-all duration-300"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 pt-3">
          <p className="text-white text-[36px] leading-relaxed font-semibold flex items-center gap-2 justify-center">
            <Icon size={30} color={config.iconColor} />
            {displayMessage}
          </p>
        </div>

        {/* Session Info - Full Width */}
        <div className="p-2 rounded-xl mb-2 mx-1 text-gray-300 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <span className="text-[18px] text-center">{displayText}</span>
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
            onClick={onLogin}
            className="py-2 px-4 rounded-full font-medium bg-[#39BEAE] text-white hover:bg-[#2ea89a] transition-all duration-200 shadow-lg shadow-[#39BEAE]/20 flex items-center gap-2"
          >
            <LogOut size={18} className="rotate-180" />
            {loginButtonText}
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

export default SessionModal
