'use client'

import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, MousePointer } from 'lucide-react'
import { useTheme } from '@/app/context/ThemeContext'
import { BaseModal, ModalContent, ModalFooter } from '@/app/components/shared/BaseModal'
import { Button } from '@/app/components/shared/Button'

// =============================================================================
// Props Interface
// =============================================================================

interface IdleWarningModalProps {
  /** Whether the modal is visible */
  isOpen: boolean
  /** Duration in seconds for the countdown (default: 300 = 5 minutes) */
  countdownDuration?: number
  /** Called when user clicks to stay active */
  onStayActive: () => void
  /** Called when countdown reaches zero */
  onTimeout: () => void
}

// =============================================================================
// Component
// =============================================================================

export function IdleWarningModal({
  isOpen,
  countdownDuration = 300,
  onStayActive,
  onTimeout
}: IdleWarningModalProps) {
  const [timeRemaining, setTimeRemaining] = useState(countdownDuration)
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  // Reset timer when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeRemaining(countdownDuration)
    }
  }, [isOpen, countdownDuration])

  // Countdown timer
  useEffect(() => {
    if (!isOpen) return

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          onTimeout()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isOpen, onTimeout])

  // Format time as MM:SS
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }, [])

  // Calculate progress percentage
  const progressPercentage = (timeRemaining / countdownDuration) * 100

  return (
    <BaseModal
      isOpen={isOpen}
      showCloseButton={false}
      closeOnBackdropClick={false}
      size="md"
    >
      {/* Progress bar at top */}
      <div className={`h-1 rounded-t-2xl overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
        <div
          className="h-full bg-gradient-to-r from-yellow-500 to-red-500 transition-all duration-1000 ease-linear"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      <ModalContent className="text-center">
        {/* Icon */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-500/20 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-yellow-500" />
        </div>

        {/* Title */}
        <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Session Idle Warning</h2>
        <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          You have been inactive for a while. Your session will automatically end if no action is taken.
        </p>

        {/* Countdown Timer */}
        <div className={`py-4 px-6 rounded-xl mb-4 ${isDark ? 'bg-black/30' : 'bg-gray-100'}`}>
          <div className={`text-5xl font-mono font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {formatTime(timeRemaining)}
          </div>
          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Time remaining before session ends</p>

          {/* Circular progress indicator */}
          <div className="flex justify-center mt-4">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 transform -rotate-90">
                {/* Background circle */}
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  fill="none"
                  stroke={isDark ? '#374151' : '#E5E7EB'}
                  strokeWidth="5"
                />
                {/* Progress circle */}
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  fill="none"
                  stroke={timeRemaining > 60 ? '#EAB308' : '#EF4444'}
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 36}`}
                  strokeDashoffset={`${2 * Math.PI * 36 * (1 - progressPercentage / 100)}`}
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-base font-bold ${timeRemaining > 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {Math.ceil(timeRemaining / 60)}m
                </span>
              </div>
            </div>
          </div>
        </div>
      </ModalContent>

      <ModalFooter>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          leftIcon={<MousePointer className="w-5 h-5" />}
          onClick={onStayActive}
        >
          I&apos;m Still Here
        </Button>
      </ModalFooter>

      <p className={`text-center text-xs pb-4 px-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        Click the button above to continue your session
      </p>
    </BaseModal>
  )
}

export default IdleWarningModal
