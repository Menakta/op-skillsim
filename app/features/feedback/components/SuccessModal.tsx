'use client'

/**
 * SuccessModal Component
 *
 * Displays success messages with continue/retry options.
 * Built on BaseModal for consistent styling.
 */

import { Check } from "lucide-react"
import Image from "next/image"
import { BaseModal, ModalMessage, ModalFooter } from '@/app/components/shared'
import { Button } from '@/app/components/shared'

// =============================================================================
// Props Interface
// =============================================================================

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
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onContinue}
      title={title}
      showCloseButton={true}
      closeButtonColor="teal"
    >
      {/* Content */}
      <ModalMessage
        icon={<Check size={30} color="#70FFC6" />}
        message={message}
        subText={successText}
      />

      {/* Action Buttons */}
      <ModalFooter>
        {showRetryButton && onRetry && (
          <Button
            variant="secondary"
            onClick={onRetry}
            leftIcon={<Image src="/icons/retry.png" alt="Retry" width={20} height={20} />}
          >
            {retryButtonText}
          </Button>
        )}
        <Button
          variant="primary"
          onClick={onContinue}
        >
          {continueButtonText}
        </Button>
      </ModalFooter>
    </BaseModal>
  )
}

export default SuccessModal
