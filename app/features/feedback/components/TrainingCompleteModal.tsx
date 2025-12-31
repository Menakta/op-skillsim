'use client'

/**
 * TrainingCompleteModal Component
 *
 * Displays when student completes all training phases.
 * Handles redirection based on LTI vs non-LTI sessions.
 */

import Image from 'next/image'
import { CheckCircle } from "lucide-react"
import { BaseModal, ModalMessage, ModalFooter } from '@/app/components/shared'
import { Button } from '@/app/components/shared'

// =============================================================================
// Props Interface
// =============================================================================

interface TrainingCompleteModalProps {
  isOpen: boolean
  totalTasks: number
  progress: number
  isLti: boolean
  returnUrl?: string | null
  onClose: () => void
}

// =============================================================================
// Component
// =============================================================================

export function TrainingCompleteModal({
  isOpen,
  totalTasks,
  progress,
  isLti,
  returnUrl,
  onClose
}: TrainingCompleteModalProps) {

  const handleContinue = () => {
    if (isLti && returnUrl) {
      // LTI user: redirect back to LMS
      window.location.href = returnUrl
    } else if (!isLti) {
      // Non-LTI user: redirect to login
      window.location.href = '/login'
    } else {
      // LTI user without return URL: just close modal
      onClose()
    }
  }

  const getButtonText = () => {
    if (isLti && returnUrl) {
      return 'Return to Course'
    } else if (!isLti) {
      return 'Back to Login'
    }
    return 'Close'
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleContinue}
      title="Training Complete"
      showCloseButton={true}
      closeButtonColor="teal"
    >
      {/* Content */}
      <ModalMessage
        icon={<CheckCircle size={30} color="#39BEAE" />}
        message="Congratulations!"
        subText={`You have successfully completed all ${totalTasks} training phases.`}
      />

      {/* Progress Display */}
      <div className="px-5 pb-4">
        <div className="bg-[#000000]/30 rounded-xl p-4 border border-gray-600/50">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400 text-sm">Final Progress</span>
            <span className="text-[#39BEAE] text-2xl font-bold">{progress.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-[#39BEAE] h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Success Message */}
      <div className="p-3 rounded-xl mb-4 mx-5 bg-green-500/20 border border-green-500/40 text-green-300">
        <div className="flex items-center gap-2">
          <CheckCircle size={16} />
          <span className="text-sm">All phases completed successfully!</span>
        </div>
      </div>

      {/* Action Button */}
      <ModalFooter>
        <Button
          variant="primary"
          onClick={handleContinue}
          leftIcon={
            <Image
              src="/icons/arrow-right.png"
              alt=""
              width={18}
              height={18}
              style={{ width: 'auto', height: 'auto' }}
            />
          }
        >
          {getButtonText()}
        </Button>
      </ModalFooter>
    </BaseModal>
  )
}

export default TrainingCompleteModal
