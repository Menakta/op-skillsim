'use client'

/**
 * AppErrorBoundary
 *
 * Client component wrapper for using ErrorBoundary in the app layout.
 */

import { ReactNode } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import { eventBus } from '@/app/lib/events'
import { logger } from '@/app/lib/logger'

interface AppErrorBoundaryProps {
  children: ReactNode
}

export function AppErrorBoundary({ children }: AppErrorBoundaryProps) {
  const handleError = (error: Error) => {
    logger.error({ error: error.message, stack: error.stack }, 'Application error caught')
    eventBus.emit('debug:log', { message: error.message, level: 'error' })
  }

  const handleReset = () => {
    logger.info('Error boundary reset - reloading app state')
  }

  return (
    <ErrorBoundary
      onError={handleError}
      onReset={handleReset}
      featureName="Application"
    >
      {children}
    </ErrorBoundary>
  )
}

export default AppErrorBoundary
