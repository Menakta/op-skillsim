'use client'

/**
 * Interlucent Test Page
 *
 * A dedicated test page for the Interlucent pixel streaming integration.
 * Access at: /interlucent-test
 *
 * This allows testing the Interlucent implementation without affecting
 * the main PureWeb-based application.
 */

import dynamic from 'next/dynamic'
import { ThemeProvider } from '@/app/context/ThemeContext'
import { QuestionsProvider } from '@/app/features/questions'

// Dynamic import to avoid SSR issues
const InterlucientStreamingApp = dynamic(
  () => import('@/app/components/InterlucientStreamingApp'),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen w-screen flex items-center justify-center bg-[#1E1E1E] text-white">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-white border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-lg">Loading Interlucent Test...</p>
        </div>
      </div>
    ),
  }
)

export default function InterlucientTestPage() {
  return (
    <ThemeProvider>
      <QuestionsProvider>
        <InterlucientStreamingApp />
      </QuestionsProvider>
    </ThemeProvider>
  )
}
