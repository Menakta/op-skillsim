'use client'

/**
 * Session Complete Page
 *
 * Displayed when a user's session ends (training complete, session expired, etc.)
 * Shows a thank you message and clears all session data.
 *
 * URL Parameters:
 * - reason: 'completed' | 'expired' | 'idle' | 'quit' | 'logged_out'
 * - role: 'student' | 'teacher' | 'admin'
 * - progress: number (0-100) - final progress percentage
 * - phases: number - phases completed
 * - returnUrl: string - optional URL to return to (encoded)
 */

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { CheckCircle, Clock, LogOut, UserX, AlertCircle } from 'lucide-react'
import { completeSessionCleanup } from '@/app/lib/clearSessionData'

// =============================================================================
// Types
// =============================================================================

type SessionEndReason = 'completed' | 'expired' | 'idle' | 'quit' | 'logged_out' | 'other'
type UserRole = 'student' | 'teacher' | 'admin'

interface SessionCompleteData {
  reason: SessionEndReason
  role: UserRole
  progress: number
  phasesCompleted: number
  totalPhases: number
  returnUrl: string | null
  isLti: boolean
}

// =============================================================================
// Content Configuration
// =============================================================================

const REASON_CONFIG: Record<SessionEndReason, {
  icon: React.ReactNode
  title: string
  studentMessage: string
  staffMessage: string
  color: string
}> = {
  completed: {
    icon: <CheckCircle size={48} className="text-green-400" />,
    title: 'Training Complete!',
    studentMessage: 'Congratulations! You have successfully completed your plumbing training session.',
    staffMessage: 'Your testing session has ended. Thank you for reviewing the training module.',
    color: 'green',
  },
  expired: {
    icon: <Clock size={48} className="text-orange-400" />,
    title: 'Session Expired',
    studentMessage: 'Your training session has expired. Your progress has been saved and you can resume later.',
    staffMessage: 'Your session has expired. Please log in again to continue.',
    color: 'orange',
  },
  idle: {
    icon: <AlertCircle size={48} className="text-yellow-400" />,
    title: 'Session Ended - Inactivity',
    studentMessage: 'Your session ended due to inactivity. Your progress has been saved.',
    staffMessage: 'Your session ended due to inactivity. Please log in again to continue.',
    color: 'yellow',
  },
  quit: {
    icon: <LogOut size={48} className="text-blue-400" />,
    title: 'Session Saved',
    studentMessage: 'Your training progress has been saved. You can resume where you left off next time.',
    staffMessage: 'Your session has been saved. Thank you for using OP SkillSim.',
    color: 'blue',
  },
  logged_out: {
    icon: <UserX size={48} className="text-gray-400" />,
    title: 'Logged Out',
    studentMessage: 'You have been logged out. Thank you for using OP SkillSim.',
    staffMessage: 'You have been logged out. Thank you for using OP SkillSim.',
    color: 'gray',
  },
  other: {
    icon: <AlertCircle size={48} className="text-gray-400" />,
    title: 'Session Ended',
    studentMessage: 'Your session has ended. Thank you for using OP SkillSim.',
    staffMessage: 'Your session has ended. Thank you for using OP SkillSim.',
    color: 'gray',
  },
}

// =============================================================================
// Session Complete Content Component
// =============================================================================

function SessionCompleteContent() {
  const searchParams = useSearchParams()
  const [isClearing, setIsClearing] = useState(true)
  const [data, setData] = useState<SessionCompleteData>({
    reason: 'other',
    role: 'student',
    progress: 0,
    phasesCompleted: 0,
    totalPhases: 6,
    returnUrl: null,
    isLti: false,
  })

  // Parse URL parameters
  useEffect(() => {
    const reason = (searchParams.get('reason') || 'other') as SessionEndReason
    const role = (searchParams.get('role') || 'student') as UserRole
    const progress = parseInt(searchParams.get('progress') || '0', 10)
    const phases = parseInt(searchParams.get('phases') || '0', 10)
    const totalPhases = parseInt(searchParams.get('total') || '6', 10)
    const returnUrl = searchParams.get('returnUrl')
    const isLti = searchParams.get('isLti') === 'true'

    setData({
      reason,
      role,
      progress,
      phasesCompleted: phases,
      totalPhases,
      returnUrl: returnUrl ? decodeURIComponent(returnUrl) : null,
      isLti,
    })
  }, [searchParams])

  // Clear all session data on mount
  useEffect(() => {
    const cleanup = async () => {
      setIsClearing(true)
      await completeSessionCleanup()
      setIsClearing(false)
    }
    cleanup()
  }, [])

  const config = REASON_CONFIG[data.reason]
  const isStaff = data.role === 'teacher' || data.role === 'admin'
  const message = isStaff ? config.staffMessage : config.studentMessage

  const handleReturnToCourse = () => {
    if (data.returnUrl) {
      window.location.href = data.returnUrl
    }
  }

  const handleLogin = () => {
    window.location.href = '/login'
  }

  const handleCloseBrowser = () => {
    // Try to close the window (works if opened by script)
    window.close()
    // If window.close() doesn't work, show a message
    alert('Please close this browser tab to return to your course.')
  }

  return (
    <div className="min-h-screen bg-[#1E1E1E] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <Image
            src="/logos/Dark_logo.png"
            alt="OP SkillSim"
            width={120}
            height={40}
            className="mx-auto"
            style={{ width: 'auto', height: 'auto' }}
            priority
          />
        </div>

        {/* Main Card */}
        <div className="bg-[#2A2A2A] rounded-2xl p-8 shadow-xl border border-gray-700">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            {config.icon}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-white text-center mb-4">
            {config.title}
          </h1>

          {/* Message */}
          <p className="text-gray-400 text-center mb-6">
            {message}
          </p>

          {/* Progress Summary (Students only, for completed/quit) */}
          {!isStaff && (data.reason === 'completed' || data.reason === 'quit' || data.reason === 'idle') && data.progress > 0 && (
            <div className="bg-[#1E1E1E] rounded-xl p-4 mb-6 border border-gray-600">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Your Progress</h3>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-400">Overall Progress</span>
                  <span className="text-lg font-bold text-[#39BEAE]">{data.progress}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-[#39BEAE] h-2 rounded-full transition-all duration-500"
                    style={{ width: `${data.progress}%` }}
                  />
                </div>
              </div>

              {/* Phases Completed */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Phases Completed</span>
                <span className="text-sm font-medium text-white">
                  {data.phasesCompleted} / {data.totalPhases}
                </span>
              </div>
            </div>
          )}

          {/* Clearing Status */}
          {isClearing && (
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-2 text-gray-500 text-sm">
                <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                <span>Clearing session data...</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Return to Course (if returnUrl exists) */}
            {data.returnUrl && (
              <button
                onClick={handleReturnToCourse}
                disabled={isClearing}
                className="w-full py-3 px-4 bg-[#39BEAE] hover:bg-[#2da89a] disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Image
                  src="/icons/arrow-right.png"
                  alt=""
                  width={18}
                  height={18}
                  style={{ width: 'auto', height: 'auto' }}
                />
                Return to Course
              </button>
            )}

            {/* Login Button (for non-LTI or staff) */}
            {(!data.isLti || isStaff) && (
              <button
                onClick={handleLogin}
                disabled={isClearing}
                className={`w-full py-3 px-4 ${data.returnUrl ? 'bg-gray-700 hover:bg-gray-600' : 'bg-[#39BEAE] hover:bg-[#2da89a]'} disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors`}
              >
                {isStaff ? 'Back to Login' : 'Login Again'}
              </button>
            )}

            {/* Close Tab Message (for LTI without returnUrl) */}
            {data.isLti && !data.returnUrl && !isStaff && (
              <button
                onClick={handleCloseBrowser}
                disabled={isClearing}
                className="w-full py-3 px-4 bg-[#39BEAE] hover:bg-[#2da89a] disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
              >
                Close & Return to Course
              </button>
            )}
          </div>

          {/* Help Text */}
          {data.isLti && !data.returnUrl && (
            <p className="text-gray-500 text-xs text-center mt-4">
              If the window doesn&apos;t close automatically, please close this browser tab manually to return to your course.
            </p>
          )}
        </div>

        {/* Footer */}
        <p className="text-gray-600 text-xs text-center mt-6">
          Open Polytechnic New Zealand Te Pukenga
        </p>
      </div>
    </div>
  )
}

// =============================================================================
// Main Page Component with Suspense
// =============================================================================

export default function SessionCompletePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#1E1E1E] flex items-center justify-center">
        <div className="text-center">
          <Image
            src="/icons/loading.png"
            alt="Loading"
            width={60}
            height={60}
            className="animate-spin-slow mx-auto"
            style={{ width: 'auto', height: 'auto' }}
            priority
          />
          <p className="text-gray-400 mt-4">Loading...</p>
        </div>
      </div>
    }>
      <SessionCompleteContent />
    </Suspense>
  )
}
