'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { XCircle } from 'lucide-react'
import { useTheme } from '@/app/context/ThemeContext'

interface PressureRetryToastProps {
  isVisible: boolean
  attemptCount: number
  onDismiss: () => void
}

/**
 * Toast notification shown after Q6 wrong answer.
 * Guides user to click "Conduct Test" to retry the pressure test.
 * Auto-dismisses after 5 seconds.
 */
export function PressureRetryToast({ isVisible, attemptCount, onDismiss }: PressureRetryToastProps) {
  const [show, setShow] = useState(false)
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const onDismissRef = useRef(onDismiss)
  onDismissRef.current = onDismiss

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (isVisible) {
      cleanup()
      setShow(true)
      timerRef.current = setTimeout(() => {
        setShow(false)
        timerRef.current = setTimeout(() => {
          onDismissRef.current()
        }, 300) // wait for fade-out animation
      }, 5000)
    } else {
      setShow(false)
    }

    return cleanup
  }, [isVisible, cleanup]) // onDismiss excluded — stored in ref to avoid re-triggering

  if (!isVisible) return null

  return (
    <div
      className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
    >
      <div className={`flex items-start gap-3 px-5 py-4 rounded-xl shadow-2xl border backdrop-blur-md max-w-md ${
        isDark
          ? 'bg-red-950/70 border-red-500/40 text-red-200'
          : 'bg-red-50 border-red-300 text-red-800'
      }`}>
        <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold">Wrong Answer</p>
          <p className={`text-sm mt-1 ${isDark ? 'text-red-300/80' : 'text-red-700'}`}>
            System depressurized. Click <strong>Conduct Test</strong> in the sidebar to try again.
          </p>
          <p className={`text-xs mt-1 ${isDark ? 'text-red-400/60' : 'text-red-500'}`}>
            Attempt {attemptCount}
          </p>
        </div>
      </div>
    </div>
  )
}

export default PressureRetryToast
