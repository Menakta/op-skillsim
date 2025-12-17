'use client'

import { createContext, useContext, ReactNode } from 'react'
import type { InputEmitter } from '@pureweb/platform-sdk'
import type { Subject } from 'rxjs'

// =============================================================================
// Context Types
// =============================================================================

export interface MessagingContextValue {
  emitter: InputEmitter | undefined
  messageSubject: Subject<string> | undefined
  isConnected: boolean
}

// =============================================================================
// Context
// =============================================================================

const MessagingContext = createContext<MessagingContextValue | null>(null)

// =============================================================================
// Provider Props
// =============================================================================

interface MessagingProviderProps {
  children: ReactNode
  emitter: InputEmitter | undefined
  messageSubject: Subject<string> | undefined
  isConnected: boolean
}

// =============================================================================
// Provider Component
// =============================================================================

export function MessagingProvider({
  children,
  emitter,
  messageSubject,
  isConnected
}: MessagingProviderProps) {
  return (
    <MessagingContext.Provider value={{ emitter, messageSubject, isConnected }}>
      {children}
    </MessagingContext.Provider>
  )
}

// =============================================================================
// Hook
// =============================================================================

export function useMessaging(): MessagingContextValue {
  const context = useContext(MessagingContext)
  if (!context) {
    throw new Error('useMessaging must be used within a MessagingProvider')
  }
  return context
}

// =============================================================================
// Optional Hook (doesn't throw if outside provider)
// =============================================================================

export function useMessagingOptional(): MessagingContextValue | null {
  return useContext(MessagingContext)
}
