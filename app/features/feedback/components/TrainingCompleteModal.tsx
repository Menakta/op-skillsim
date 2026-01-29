'use client'

/**
 * TrainingCompleteModal Component
 *
 * Displays when student completes all training phases.
 * - LTI students: Fetches data, clears session, redirects to training-results page
 * - Non-LTI students: Redirects to session-complete page
 * - Staff: Redirects back to admin dashboard
 * Supports light/dark theme via ThemeContext.
 */

import { useState } from 'react'
import Image from 'next/image'
import { CheckCircle } from "lucide-react"
import { useTheme } from '@/app/context/ThemeContext'
import { BaseModal, ModalMessage, ModalFooter } from '@/app/components/shared'
import { Button } from '@/app/components/shared'
import { redirectToSessionComplete } from '@/app/lib/sessionCompleteRedirect'
import { completeSessionCleanup } from '@/app/lib/clearSessionData'

// =============================================================================
// Props Interface
// =============================================================================

interface TrainingCompleteModalProps {
  isOpen: boolean
  totalTasks: number
  progress: number
  isLti: boolean
  returnUrl?: string | null
  role?: 'student' | 'teacher' | 'admin'
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
  role = 'student',
  onClose
}: TrainingCompleteModalProps) {
  const [isRedirecting, setIsRedirecting] = useState(false)
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const isStaff = role === 'admin' || role === 'teacher'

  const handleContinue = async () => {
    if (isStaff) {
      // Staff: redirect back to admin panel without clearing session
      window.location.href = '/admin'
      return
    }

    // LTI Students: fetch data, clear session, redirect to training-results page
    if (isLti && role === 'student') {
      setIsRedirecting(true)

      try {
        // Wait for background persistence saves to complete
        // useTrainingPersistence triggers quiz/session saves when modal opens
        // This delay ensures those async operations finish before we fetch & cleanup
        await new Promise(resolve => setTimeout(resolve, 1500))

        // Fetch training data before clearing session
        const response = await fetch('/api/training/export', {
          method: 'GET',
          credentials: 'include',
        })

        const result = await response.json()

        // Clear session data BEFORE redirecting
        await completeSessionCleanup()

        // Build URL with data encoded as base64
        const params = new URLSearchParams()
        params.set('isLti', 'true')
        if (returnUrl) {
          params.set('returnUrl', encodeURIComponent(returnUrl))
        }

        if (result.success && result.data) {
          // Encode the data as base64 to pass via URL
          const encodedData = btoa(encodeURIComponent(JSON.stringify(result.data)))
          params.set('data', encodedData)
        }

        window.location.href = `/training-results?${params.toString()}`
      } catch (error) {
        console.error('Failed to fetch training data:', error)
        // Still redirect even if fetch fails, page will show error
        await completeSessionCleanup()
        const params = new URLSearchParams()
        params.set('isLti', 'true')
        if (returnUrl) {
          params.set('returnUrl', encodeURIComponent(returnUrl))
        }
        window.location.href = `/training-results?${params.toString()}`
      }
      return
    }

    // Non-LTI Students: redirect to session-complete page for proper cleanup
    redirectToSessionComplete({
      reason: 'completed',
      role,
      progress,
      phasesCompleted: totalTasks,
      totalPhases: totalTasks,
      returnUrl,
      isLti,
    })
  }

  const getButtonText = () => {
    if (isStaff) {
      return 'Back to Dashboard'
    }
    if (isLti && role === 'student') {
      return 'View Results'
    }
    if (!isLti) {
      return 'Back to Login'
    }
    return 'Continue'
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
        <div className={`rounded-xl p-4 border ${
          isDark
            ? 'bg-[#000000]/30 border-gray-600/50'
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex justify-between items-center mb-2">
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Final Progress</span>
            <span className="text-[#39BEAE] text-2xl font-bold">{progress.toFixed(0)}%</span>
          </div>
          <div className={`w-full rounded-full h-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
            <div
              className="bg-[#39BEAE] h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Success Message */}
      <div className="p-3 rounded-xl mb-4 mx-5 bg-green-500/20 border border-green-500/40 text-green-400">
        <div className="flex items-center gap-2">
          <CheckCircle size={16} />
          <span className="text-sm">All phases completed successfully!</span>
        </div>
      </div>

      {/* Action Buttons */}
      <ModalFooter>
        <Button
          variant="primary"
          onClick={handleContinue}
          disabled={isRedirecting}
          leftIcon={
            isRedirecting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Image
                src="/icons/arrow-right.png"
                alt=""
                width={18}
                height={18}
                style={{ width: 'auto', height: 'auto' }}
              />
            )
          }
        >
          {isRedirecting ? 'Loading Results...' : getButtonText()}
        </Button>
      </ModalFooter>
    </BaseModal>
  )
}

export default TrainingCompleteModal
