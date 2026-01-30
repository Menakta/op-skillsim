'use client'

/**
 * SessionModal Component
 *
 * Displays session-related messages (expired, logged out, etc.).
 * Built on BaseModal for consistent styling.
 */

import Image from 'next/image'
import { LogOut, Clock } from "lucide-react"
import { BaseModal, ModalMessage, ModalFooter } from '@/app/components/shared'
import { Button } from '@/app/components/shared'

// Off-button icon component
const OffButtonIcon = ({ size = 30 }: { size?: number }) => (
  <Image
    src="/icons/off-button 1.png"
    alt="Session ended"
    width={size}
    height={size}
    className="object-contain"
  />
)

// =============================================================================
// Props Interface
// =============================================================================

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
    useOffButton: false,
    defaultTitle: 'Session Expired',
    defaultMessage: 'Expired',
    defaultText: 'Your session has expired. Please log in again to continue.'
  },
  logged_out: {
    icon: LogOut,
    iconColor: '#39BEAE',
    useOffButton: true,
    defaultTitle: 'Session Ended',
    defaultMessage: 'Disconnected',
    defaultText: 'Your session has ended. Please log in again to continue.'
  },
  inactive: {
    icon: Clock,
    iconColor: '#FFA500',
    useOffButton: false,
    defaultTitle: 'Session Timeout',
    defaultMessage: 'Timeout',
    defaultText: 'Your session has timed out due to inactivity. Please log in again.'
  },
  kicked: {
    icon: LogOut,
    iconColor: '#FF6B6B',
    useOffButton: true,
    defaultTitle: 'Session Ended',
    defaultMessage: 'Disconnected',
    defaultText: 'Your session was ended due to unexpected issue. Please contact support if you need assistance.'
  },
  other: {
    icon: LogOut,
    iconColor: '#9CA3AF',
    useOffButton: true,
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
  const config = REASON_CONFIG[reason]
  const Icon = config.icon
  const displayTitle = title || config.defaultTitle
  const displayMessage = message || config.defaultMessage
  const displayText = config.defaultText

  // Use off-button icon for session end states, otherwise use lucide icon
  const renderIcon = () => {
    if (config.useOffButton) {
      return <OffButtonIcon size={30} />
    }
    return <Icon size={30} color={config.iconColor} />
  }

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      onLogin()
    }
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={displayTitle}
      showCloseButton={true}
      closeButtonColor="teal"
    >
      {/* Content */}
      <ModalMessage
        icon={renderIcon()}
        message={displayMessage}
        subText={displayText}
      />

      {/* Action Buttons */}
      <ModalFooter>
        {showCloseButton && onClose && (
          <Button
            variant="secondary"
            onClick={onClose}
          >
            {closeButtonText}
          </Button>
        )}
        <Button
          variant="primary"
          onClick={onLogin}
          leftIcon={<LogOut size={18} className="rotate-180" />}
        >
          {loginButtonText}
        </Button>
      </ModalFooter>
    </BaseModal>
  )
}

export default SessionModal
