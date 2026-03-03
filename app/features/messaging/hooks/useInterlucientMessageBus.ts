'use client'

/**
 * Interlucent Message Bus Hook
 *
 * Parallel to useMessageBus.ts but for Interlucent pixel streaming.
 * Provides backward compatibility with PureWeb string message format.
 *
 * Key features:
 * - Sends messages in string format ("type:data") converted to JSON
 * - Receives JSON messages and converts to ParsedMessage format
 * - Compatible with existing training hooks that expect string format
 */

import { useCallback, useEffect, useState, useRef } from 'react'
import type { InterlucientStreamRef } from '@/app/features/streaming/components/InterlucientStream'
import {
  ParsedMessage,
  MessageLogEntry,
  parseMessage,
  createMessage,
} from '@/app/lib/messageTypes'

// =============================================================================
// Hook Configuration
// =============================================================================

export interface UseInterlucientMessageBusConfig {
  debug?: boolean
  maxLogSize?: number
}

// =============================================================================
// Hook Return Type (same as useMessageBus for compatibility)
// =============================================================================

export interface UseInterlucientMessageBusReturn {
  // State
  isConnected: boolean
  lastMessage: ParsedMessage | null
  messageLog: MessageLogEntry[]

  // Send functions (same API as useMessageBus)
  sendMessage: (type: string, data?: string) => void
  sendRawMessage: (message: string) => void

  // Subscribe to messages
  onMessage: (handler: (message: ParsedMessage) => void) => () => void

  // Utilities
  clearLog: () => void

  // Interlucent-specific
  handleIncomingMessage: (data: unknown) => void
}

// =============================================================================
// JSON to String Message Conversion
// =============================================================================

/**
 * Converts incoming JSON message from Interlucent/UE5 to string format
 * This allows existing message handlers to work without modification
 */
function jsonToStringFormat(data: unknown): string | null {
  if (typeof data === 'string') {
    // Already a string, return as-is
    return data
  }

  if (typeof data !== 'object' || data === null) {
    return null
  }

  const obj = data as Record<string, unknown>

  // Check for _rawMessage (we include this when sending for backward compat)
  if (obj._rawMessage && typeof obj._rawMessage === 'string') {
    return obj._rawMessage
  }

  // Check for type field
  if (!obj.type || typeof obj.type !== 'string') {
    // Try to stringify the whole object as data
    return JSON.stringify(data)
  }

  const type = obj.type as string

  // Check for data field
  if (obj.data !== undefined) {
    const dataStr = typeof obj.data === 'string' ? obj.data : JSON.stringify(obj.data)
    return `${type}:${dataStr}`
  }

  // Check for _dataParts (we include this when sending)
  if (Array.isArray(obj._dataParts) && obj._dataParts.length > 0) {
    return `${type}:${obj._dataParts.join(':')}`
  }

  // No data, just type
  return type
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useInterlucientMessageBus(
  streamRef: React.RefObject<InterlucientStreamRef>,
  isDataChannelOpen: boolean,
  config: UseInterlucientMessageBusConfig = {}
): UseInterlucientMessageBusReturn {
  const { debug = false, maxLogSize = 100 } = config

  // State
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<ParsedMessage | null>(null)
  const [messageLog, setMessageLog] = useState<MessageLogEntry[]>([])

  // Message handlers ref
  const messageHandlersRef = useRef<Set<(message: ParsedMessage) => void>>(new Set())

  // Update connected state when data channel opens
  useEffect(() => {
    setIsConnected(isDataChannelOpen)
  }, [isDataChannelOpen])

  // ==========================================================================
  // SEND: Send message to UE5 (string format, converted to JSON internally)
  // ==========================================================================

  const sendMessage = useCallback((type: string, data?: string) => {
    const message = createMessage(type, data || '')

    if (debug) {
      console.log('📤 Sending to UE (Interlucent):', message)
    }

    if (streamRef.current && isDataChannelOpen) {
      // Use sendStringMessage which handles the conversion
      streamRef.current.sendStringMessage(message)
    } else {
      if (debug) console.warn('Stream not ready - message not sent:', message)
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
  }, [streamRef, isDataChannelOpen, debug, maxLogSize])

  // ==========================================================================
  // SEND RAW: Send raw message string
  // ==========================================================================

  const sendRawMessage = useCallback((message: string) => {
    if (debug) {
      console.log('📤 Sending raw to UE (Interlucent):', message)
    }

    if (streamRef.current && isDataChannelOpen) {
      streamRef.current.sendStringMessage(message)
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
  }, [streamRef, isDataChannelOpen, debug, maxLogSize])

  // ==========================================================================
  // RECEIVE: Handle incoming message from Interlucent
  // ==========================================================================

  const handleIncomingMessage = useCallback((data: unknown) => {
    if (debug) console.log('📥 Raw message from UE (Interlucent):', data)

    // Convert JSON to string format for backward compatibility
    const rawString = jsonToStringFormat(data)
    if (!rawString) {
      if (debug) console.warn('Could not parse message:', data)
      return
    }

    if (debug) console.log('📥 Converted to string format:', rawString)

    // Use existing parseMessage function
    const message = parseMessage(rawString)
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
      raw: rawString,
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
  }, [debug, maxLogSize])

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
    clearLog,
    handleIncomingMessage,
  }
}

export default useInterlucientMessageBus
