'use client'

/**
 * ErrorModal Component
 *
 * Displays error messages with retry functionality.
 * Built on BaseModal for consistent styling.
 */

import { AlertTriangle } from "lucide-react"
import Image from "next/image"
import { BaseModal, ModalMessage, ModalFooter } from '@/app/components/shared'
import { Button } from '@/app/components/shared'

// =============================================================================
// Props Interface
// =============================================================================

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
  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      onRetry()
    }
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      showCloseButton={true}
      closeButtonColor="red"
    >
      {/* Content */}
      <ModalMessage
        icon={<AlertTriangle size={30} color="#FF6B6B" />}
        message={message}
        subText={errorText}
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
          variant="danger"
          onClick={onRetry}
          leftIcon={<Image src="/icons/retry.png" alt="Retry" width={20} height={20} />}
        >
          {retryButtonText}
        </Button>
      </ModalFooter>
    </BaseModal>
  )
}

export default ErrorModal
