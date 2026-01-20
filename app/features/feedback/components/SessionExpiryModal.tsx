'use client'

/**
 * SessionExpiryModal Component
 *
 * Displays countdown when session is about to expire (3-5 minutes remaining).
 * Redirects to session-complete page for proper cleanup.
 */

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Clock } from "lucide-react"
import { BaseModal, ModalFooter } from '@/app/components/shared'
import { Button } from '@/app/components/shared'
import { redirectToSessionComplete } from '@/app/lib/sessionCompleteRedirect'

// =============================================================================
// Props Interface
// =============================================================================

interface SessionExpiryModalProps {
  isOpen: boolean
  expiresAt: number // timestamp in milliseconds
  isLti: boolean
  returnUrl?: string | null
  role?: 'student' | 'teacher' | 'admin'
  progress?: number
  phasesCompleted?: number
  totalPhases?: number
  onSessionEnd: () => void
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// =============================================================================
// Component
// =============================================================================

export function SessionExpiryModal({
  isOpen,
  expiresAt,
  isLti,
  returnUrl,
  role = 'student',
  progress = 0,
  phasesCompleted = 0,
  totalPhases = 6,
  onSessionEnd
}: SessionExpiryModalProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(0)

  // Update countdown every second
  useEffect(() => {
    if (!isOpen) return

    const updateRemaining = () => {
      const now = Date.now()
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000))
      setRemainingSeconds(remaining)

      // Session expired
      if (remaining <= 0) {
        handleSessionEnd()
      }
    }

    // Initial update
    updateRemaining()

    // Update every second
    const interval = setInterval(updateRemaining, 1000)

    return () => clearInterval(interval)
  }, [isOpen, expiresAt])

  const handleSessionEnd = () => {
    // Redirect to session-complete page for proper cleanup
    redirectToSessionComplete({
      reason: 'expired',
      role,
      progress,
      phasesCompleted,
      totalPhases,
      returnUrl,
      isLti,
    })
  }

  const getButtonText = () => {
    if (isLti && returnUrl) {
      return 'Return to Course Now'
    } else if (!isLti) {
      return 'Go to Login'
    }
    return 'End Session'
  }

  // Don't show close button - user must take action
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={() => {}} // No close action
      title="Session Expiring Soon"
      showCloseButton={false}
    >
      {/* Await Icon */}
      <div className="flex flex-col items-center py-6">
        <div className="mb-4">
          <Image
            src="/icons/await.png"
            alt="Session expiring"
            width={60}
            height={60}
            className="object-contain"
          />
        </div>

        {/* Countdown Display */}
        <div className="text-center">
          <p className="text-gray-400 text-sm mb-2">Time Remaining</p>
          <div className="flex items-center justify-center gap-2">
            <Clock size={24} className="text-orange-400" />
            <span className={`text-4xl font-bold ${
              remainingSeconds <= 60 ? 'text-red-400' : 'text-orange-400'
            }`}>
              {formatTime(remainingSeconds)}
            </span>
          </div>
        </div>
      </div>

      {/* Warning Message */}
      <div className="p-3 rounded-xl mb-4 mx-5 bg-orange-500/20 border border-orange-500/40 text-orange-300">
        <p className="text-sm text-center">
          {isLti
            ? 'Your session is about to expire. You will be redirected back to your course.'
            : 'Your session is about to expire. Please save your work and log in again.'}
        </p>
      </div>

      {/* Action Button */}
      <ModalFooter>
        <Button
          variant="warning"
          onClick={handleSessionEnd}
        >
          {getButtonText()}
        </Button>
      </ModalFooter>
    </BaseModal>
  )
}

export default SessionExpiryModal
