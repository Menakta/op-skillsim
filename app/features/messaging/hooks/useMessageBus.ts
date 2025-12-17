'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import type { InputEmitter } from '@pureweb/platform-sdk'
import type { Subject } from 'rxjs'
import {
  ParsedMessage,
  MessageLogEntry,
  parseMessage,
  createMessage
} from '@/app/lib/messageTypes'

// =============================================================================
// Hook Configuration
// =============================================================================

export interface UseMessageBusConfig {
  debug?: boolean
  maxLogSize?: number
}

// =============================================================================
// Hook Return Type
// =============================================================================

export interface UseMessageBusReturn {
  // State
  isConnected: boolean
  lastMessage: ParsedMessage | null
  messageLog: MessageLogEntry[]

  // Send functions
  sendMessage: (type: string, data?: string) => void
  sendRawMessage: (message: string) => void

  // Subscribe to messages
  onMessage: (handler: (message: ParsedMessage) => void) => () => void

  // Utilities
  clearLog: () => void
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useMessageBus(
  emitter: InputEmitter | undefined,
  messageSubject: Subject<string> | undefined,
  config: UseMessageBusConfig = {}
): UseMessageBusReturn {
  const { debug = false, maxLogSize = 100 } = config

  // State
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<ParsedMessage | null>(null)
  const [messageLog, setMessageLog] = useState<MessageLogEntry[]>([])

  // Message handlers ref
  const messageHandlersRef = useRef<Set<(message: ParsedMessage) => void>>(new Set())

  // ==========================================================================
  // SEND: Send message to UE5
  // ==========================================================================

  const sendMessage = useCallback((type: string, data?: string) => {
    const message = createMessage(type, data || '')

    if (debug) {
      console.log('📤 Sending to UE:', message)
    }

    if (emitter) {
      emitter.EmitUIInteraction(message)
    } else {
      if (debug) console.warn('Emitter not ready - message not sent:', message)
    }

    // Log the message
    const entry: MessageLogEntry = {
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      direction: 'sent',
      type,
      data: data || '',
      raw: message,
      timestamp: Date.now()
    }
    setMessageLog(prev => [entry, ...prev].slice(0, maxLogSize))
  }, [emitter, debug, maxLogSize])

  // ==========================================================================
  // SEND RAW: Send raw message string
  // ==========================================================================

  const sendRawMessage = useCallback((message: string) => {
    if (debug) {
      console.log('📤 Sending raw to UE:', message)
    }

    if (emitter) {
      emitter.EmitUIInteraction(message)
    }

    const colonIndex = message.indexOf(':')
    const entry: MessageLogEntry = {
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      direction: 'sent',
      type: colonIndex > -1 ? message.substring(0, colonIndex) : message,
      data: colonIndex > -1 ? message.substring(colonIndex + 1) : '',
      raw: message,
      timestamp: Date.now()
    }
    setMessageLog(prev => [entry, ...prev].slice(0, maxLogSize))
  }, [emitter, debug, maxLogSize])

  // ==========================================================================
  // RECEIVE: Subscribe to UE5 messages
  // ==========================================================================

  useEffect(() => {
    if (!messageSubject) {
      if (debug) console.log('messageSubject not available yet')
      return
    }

    if (debug) console.log('📡 Subscribing to UE5 messages')

    const subscription = messageSubject.subscribe((raw: string) => {
      if (debug) console.log('📥 Received from UE:', raw)

      const message = parseMessage(raw)
      if (!message) return

      // Update state
      setLastMessage(message)
      setIsConnected(true)

      // Log the message
      const entry: MessageLogEntry = {
        id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        direction: 'received',
        type: message.type,
        data: message.dataString,
        raw,
        timestamp: Date.now()
      }
      setMessageLog(prev => [entry, ...prev].slice(0, maxLogSize))

      // Notify all registered handlers
      messageHandlersRef.current.forEach(handler => {
        try {
          handler(message)
        } catch (error) {
          console.error('Error in message handler:', error)
        }
      })
    })

    return () => {
      if (debug) console.log('📡 Unsubscribing from UE5 messages')
      subscription.unsubscribe()
    }
  }, [messageSubject, debug, maxLogSize])

  // ==========================================================================
  // SUBSCRIBE: Register a message handler
  // ==========================================================================

  const onMessage = useCallback((handler: (message: ParsedMessage) => void) => {
    messageHandlersRef.current.add(handler)

    // Return unsubscribe function
    return () => {
      messageHandlersRef.current.delete(handler)
    }
  }, [])

  // ==========================================================================
  // CLEAR LOG
  // ==========================================================================

  const clearLog = useCallback(() => {
    setMessageLog([])
  }, [])

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    isConnected,
    lastMessage,
    messageLog,
    sendMessage,
    sendRawMessage,
    onMessage,
    clearLog
  }
}

export default useMessageBus
