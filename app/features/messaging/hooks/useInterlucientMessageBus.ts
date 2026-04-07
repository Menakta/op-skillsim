'use client'

/**
 * Interlucent Message Bus Hook
 *
 * Message bus for Interlucent pixel streaming using native JSON format.
 *
 * Key features:
 * - Sends messages as JSON objects (Interlucent native format)
 * - Receives JSON messages from UE5
 * - Converts between string format (for backward compat) and JSON
 *
 * Message Format (Interlucent):
 * - sendUIInteraction({ type: 'tool_select', tool: 'XRay' })
 * - sendUIInteraction({ type: 'training_control', action: 'start' })
 * - sendUIInteraction({ type: 'camera_control', preset: 'IsometricNE' })
 */

import { useCallback, useEffect, useState, useRef } from 'react'
import type { InterlucientStreamRef } from '@/app/features/streaming/components/InterlucientStream'
import {
  ParsedMessage,
  MessageLogEntry,
  parseMessage,
} from '@/app/lib/messageTypes'

// =============================================================================
// Hook Configuration
// =============================================================================

export interface UseInterlucientMessageBusConfig {
  debug?: boolean
  maxLogSize?: number
}

// =============================================================================
// Hook Return Type
// =============================================================================

export interface UseInterlucientMessageBusReturn {
  // State
  isConnected: boolean
  lastMessage: ParsedMessage | null
  messageLog: MessageLogEntry[]

  // Send functions - JSON format (Interlucent native)
  sendJson: (payload: Record<string, unknown>) => void

  // Send functions - String format (backward compatible with existing code)
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
// String to JSON Conversion Utilities
// =============================================================================

/**
 * Convert a string message (PureWeb format) to JSON object (Interlucent format)
 *
 * Examples:
 *   "tool_select:XRay" -> { type: "tool_select", tool: "XRay" }
 *   "training_control:start" -> { type: "training_control", action: "start" }
 *   "explosion_control:50" -> { type: "explosion_control", level: 50 }
 *   "question_answer:Q1:2:true" -> { type: "question_answer", questionId: "Q1", tryCount: 2, isCorrect: true }
 */
function stringToJson(messageString: string): Record<string, unknown> {
  const colonIndex = messageString.indexOf(':')

  if (colonIndex === -1) {
    // No data, just type (e.g., "task_complete")
    return { type: messageString }
  }

  const type = messageString.substring(0, colonIndex)
  const dataString = messageString.substring(colonIndex + 1)
  const parts = dataString.split(':')

  // Convert based on message type
  switch (type) {
    // Training Control: "training_control:start" -> { type, action }
    case 'training_control':
      return { type, action: parts[0] }

    // Tool Selection: "tool_select:XRay" -> { type, tool }
    case 'tool_select':
      return { type, tool: parts[0] }

    // Pipe Selection: "pipe_select:100mm" -> { type, pipeType }
    case 'pipe_select':
      return { type, pipeType: parts[0] }

    // Task Start: "task_start:PipeConnection:100mm" -> { type, tool, pipeType }
    case 'task_start':
      return parts.length > 1
        ? { type, tool: parts[0], pipeType: parts[1] }
        : { type, tool: parts[0] }

    // Start From Task: "start_from_task:3" -> { type, phaseIndex }
    case 'start_from_task':
      return { type, phaseIndex: parseInt(parts[0]) || 0 }

    // Camera Control: "camera_control:IsometricNE" -> { type, preset }
    case 'camera_control':
      return { type, preset: parts[0] }

    // Explosion Control: "explosion_control:50" -> { type, level }
    case 'explosion_control':
      const levelOrAction = parts[0]
      if (levelOrAction === 'explode' || levelOrAction === 'assemble') {
        return { type, action: levelOrAction }
      }
      return { type, level: parseFloat(levelOrAction) || 0 }

    // Question Answer: "question_answer:Q1:2:true" -> { type, questionId, tryCount, isCorrect }
    case 'question_answer':
      return {
        type,
        questionId: parts[0],
        tryCount: parseInt(parts[1]) || 1,
        isCorrect: parts[2] === 'true'
      }

    // Question Hint: "question_hint:Q1" -> { type, questionId }
    case 'question_hint':
      return { type, questionId: parts[0] }

    // Question Close: "question_close:Q1" -> { type, questionId }
    case 'question_close':
      return { type, questionId: parts[0] }

    // Test Plug Select: "test_plug_select:AirPlug" -> { type, plugType }
    case 'test_plug_select':
      return { type, plugType: parts[0] }

    // Pressure Test Start: "pressure_test_start:air_test" -> { type, testType }
    case 'pressure_test_start':
      return { type, testType: parts[0] }

    // X-Ray Slider: "xray_slider:Floor:0.5" -> { type, sliderName, value }
    case 'xray_slider':
      return { type, sliderName: parts[0], value: parseFloat(parts[1]) || 0 }

    // Waypoint Control: "waypoint_control:activate:0" -> { type, action, index }
    case 'waypoint_control':
      if (parts[0] === 'activate' || parts[0] === 'deactivate') {
        return { type, action: parts[0], index: parseInt(parts[1]) || 0 }
      }
      return { type, action: parts[0] }

    // Layer Control: "layer_control:toggle:0" -> { type, action, index }
    case 'layer_control':
      if (parts[0] === 'toggle' || parts[0] === 'isolate') {
        return { type, action: parts[0], index: parseInt(parts[1]) || 0 }
      }
      if (parts[0] === 'show' || parts[0] === 'hide') {
        return { type, action: parts[0], name: parts[1] }
      }
      return { type, action: parts[0] }

    // Hierarchical Control: "hierarchical_control:toggle_main:GroupName" -> { type, action, name }
    case 'hierarchical_control':
      if (parts[0] === 'toggle_main') {
        return { type, action: 'toggle_main', groupName: parts[1] }
      }
      if (parts[0] === 'toggle_child') {
        return { type, action: 'toggle_child', parentName: parts[1], childIndex: parseInt(parts[2]) || 0 }
      }
      return { type, action: parts[0] }

    // Settings Control: "settings_control:resolution:1920:1080" -> { type, setting, ... }
    case 'settings_control':
      const settingType = parts[0]
      switch (settingType) {
        case 'resolution':
          return { type, setting: 'resolution', width: parseInt(parts[1]) || 1920, height: parseInt(parts[2]) || 1080 }
        case 'graphics_quality':
          return { type, setting: 'graphics_quality', quality: parts[1] }
        case 'audio_volume': {
          const parsedVolume = parseFloat(parts[2])
          // Use isNaN check instead of || to properly handle volume 0 (mute)
          return { type, setting: 'audio_volume', group: parts[1], volume: isNaN(parsedVolume) ? 1.0 : parsedVolume }
        }
        case 'bandwidth':
          return { type, setting: 'bandwidth', option: parts[1] }
        case 'fps_tracking':
          return { type, setting: 'fps_tracking', enabled: parts[1] === 'start' }
        default:
          return { type, setting: settingType, value: parts.slice(1).join(':') }
      }

    // Application Control: "application_control:quit" -> { type, action }
    case 'application_control':
      return { type, action: parts[0] }

    // Default: Include raw data for unknown types
    default:
      return { type, data: dataString, _raw: messageString }
  }
}

// =============================================================================
// Message Extraction from UE5 Response
// =============================================================================

/**
 * Convert JSON object from UE5 to string format for parseMessage()
 *
 * UE5 might send JSON in same format we send:
 *   { type: 'training_progress', progress: 50, taskName: 'TaskName', ... }
 *
 * We convert back to string format for parseMessage() compatibility:
 *   "training_progress:50:TaskName:phase1:3:8:true"
 */
function jsonToString(obj: Record<string, unknown>): string | null {
  const type = obj.type as string
  if (!type) return null

  switch (type) {
    case 'training_progress':
      // { type, progress, taskName, phase, currentTask, totalTasks, isActive }
      return `${type}:${obj.progress ?? 0}:${obj.taskName ?? ''}:${obj.phase ?? ''}:${obj.currentTask ?? 0}:${obj.totalTasks ?? 5}:${obj.isActive ?? false}`

    case 'tool_change':
      return `${type}:${obj.toolName ?? obj.tool ?? ''}`

    case 'task_completed':
      return `${type}:${obj.taskId ?? ''}`

    case 'task_start':
      return `${type}:${obj.toolName ?? obj.tool ?? ''}`

    case 'task_complete':
      return type

    case 'question_request':
      return `${type}:${obj.questionId ?? ''}`

    case 'pressure_test_result':
      return `${type}:${obj.passed ?? false}:${obj.pressure ?? 0}:${obj.testType ?? 'air_test'}`

    case 'explosion_update':
      return `${type}:${obj.value ?? obj.level ?? 0}:${obj.isAnimating ?? false}`

    case 'camera_update':
      return `${type}:${obj.mode ?? 'Manual'}:${obj.perspective ?? obj.preset ?? 'IsometricNE'}:${obj.distance ?? 1500}:${obj.isTransitioning ?? false}`

    case 'error':
      return `${type}:${obj.code ?? 'UNKNOWN'}:${obj.details ?? obj.message ?? ''}`

    case 'fps_update':
      return `${type}:${obj.fps ?? obj.value ?? 0}`

    case 'setting_applied':
      return `${type}:${obj.settingType ?? obj.setting ?? ''}:${obj.value ?? ''}:${obj.success ?? false}`

    case 'xray_slider_update':
      return `${type}:${obj.sliderName ?? ''}:${obj.value ?? 0}`

    default:
      // Unknown type - include what we have
      if (obj.data !== undefined) {
        const dataStr = typeof obj.data === 'string' ? obj.data : JSON.stringify(obj.data)
        return `${type}:${dataStr}`
      }
      return type
  }
}

/**
 * Extracts string message from UE5 response
 *
 * UE5 can send messages in multiple formats:
 * 1. Raw string: "training_progress:50:TaskName:phase1"
 * 2. JSON with type field: { "type": "training_progress", "progress": 50, ... }
 * 3. JSON with message field: { "message": "training_progress:50:TaskName:phase1" }
 * 4. JSON with type/data: { "type": "training_progress", "data": "50:TaskName:phase1" }
 *
 * This function normalizes all formats to a string for existing parseMessage() to handle.
 */
function extractStringMessage(data: unknown): string | null {
  // Case 1: Already a string - return as-is
  if (typeof data === 'string') {
    return data
  }

  // Case 2: Not an object - can't process
  if (typeof data !== 'object' || data === null) {
    return null
  }

  const obj = data as Record<string, unknown>

  // Case 3: JSON with "type" field - native JSON format (preferred)
  if (obj.type && typeof obj.type === 'string') {
    // Check if this is a structured JSON (has fields other than type/data/_raw)
    const keys = Object.keys(obj).filter(k => !['type', 'data', '_raw', '_dataParts', '_rawMessage'].includes(k))

    if (keys.length > 0) {
      // Has structured fields - convert JSON to string
      const converted = jsonToString(obj)
      if (converted) return converted
    }

    // Fallback: simple type + data format
    const type = obj.type as string
    if (obj.data !== undefined) {
      const dataStr = typeof obj.data === 'string' ? obj.data : JSON.stringify(obj.data)
      return `${type}:${dataStr}`
    }
    if (Array.isArray(obj._dataParts) && obj._dataParts.length > 0) {
      return `${type}:${obj._dataParts.join(':')}`
    }
    return type
  }

  // Case 4: JSON with "message" field (wrapped string)
  if (obj.message && typeof obj.message === 'string') {
    return obj.message
  }

  // Case 5: JSON with "_rawMessage" field (backward compat)
  if (obj._rawMessage && typeof obj._rawMessage === 'string') {
    return obj._rawMessage
  }

  // Case 6: Unknown format - try to stringify for debugging
  console.warn('⚠️ Unknown message format from UE5:', obj)
  return null
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useInterlucientMessageBus(
  streamRef: React.RefObject<InterlucientStreamRef | null>,
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
  // SEND JSON: Send JSON payload directly to UE5 (Interlucent native format)
  // ==========================================================================

  const sendJson = useCallback((payload: Record<string, unknown>) => {
    if (debug) {
      console.log('📤 Sending JSON to UE5:', payload)
    }

    if (streamRef.current && isDataChannelOpen) {
      streamRef.current.sendUIInteraction(payload)
    } else {
      if (debug) console.warn('⏳ Stream not ready - message not sent:', payload)
    }

    // Log the message
    const type = (payload.type as string) || 'unknown'
    const entry: MessageLogEntry = {
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      direction: 'sent',
      type,
      data: JSON.stringify(payload),
      raw: JSON.stringify(payload),
      timestamp: Date.now()
    }
    setMessageLog(prev => [entry, ...prev].slice(0, maxLogSize))
  }, [streamRef, isDataChannelOpen, debug, maxLogSize])

  // ==========================================================================
  // SEND: Send message (converts string format to JSON)
  // ==========================================================================

  const sendMessage = useCallback((type: string, data?: string) => {
    // Build string format for conversion
    const messageString = data ? `${type}:${data}` : type

    // Convert to JSON format
    const payload = stringToJson(messageString)

    if (debug) {
      console.log('📤 Sending to UE5 (converted):', messageString, '→', payload)
    }

    if (streamRef.current && isDataChannelOpen) {
      streamRef.current.sendUIInteraction(payload)
    } else {
      if (debug) console.warn('⏳ Stream not ready - message not sent:', messageString)
    }

    // Log the message
    const entry: MessageLogEntry = {
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      direction: 'sent',
      type,
      data: data || '',
      raw: JSON.stringify(payload),
      timestamp: Date.now()
    }
    setMessageLog(prev => [entry, ...prev].slice(0, maxLogSize))
  }, [streamRef, isDataChannelOpen, debug, maxLogSize])

  // ==========================================================================
  // SEND RAW: Send raw message string (converts to JSON)
  // ==========================================================================

  const sendRawMessage = useCallback((message: string) => {
    // Convert string to JSON format
    const payload = stringToJson(message)

    // Always log audio and bandwidth messages for debugging
    if (debug || message.includes('audio_volume') || message.includes('bandwidth')) {
      console.log('📤 Sending raw to UE5 (converted):', message, '→', payload)
      console.log('📤 Stream ready:', !!streamRef.current, '| Data channel open:', isDataChannelOpen)
    }

    if (streamRef.current && isDataChannelOpen) {
      streamRef.current.sendUIInteraction(payload)
    } else {
      console.warn('⚠️ Cannot send message - stream not ready:', message, { streamReady: !!streamRef.current, dataChannelOpen: isDataChannelOpen })
    }

    const colonIndex = message.indexOf(':')
    const entry: MessageLogEntry = {
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      direction: 'sent',
      type: colonIndex > -1 ? message.substring(0, colonIndex) : message,
      data: colonIndex > -1 ? message.substring(colonIndex + 1) : '',
      raw: JSON.stringify(payload),
      timestamp: Date.now()
    }
    setMessageLog(prev => [entry, ...prev].slice(0, maxLogSize))
  }, [streamRef, isDataChannelOpen, debug, maxLogSize])

  // ==========================================================================
  // RECEIVE: Handle incoming message from Interlucent
  // ==========================================================================

  const handleIncomingMessage = useCallback((data: unknown) => {
    if (debug) console.log('📥 Raw message from UE5 (Interlucent):', data)

    // Extract string message from whatever format UE5 sends
    const rawString = extractStringMessage(data)
    if (!rawString) {
      if (debug) console.warn('Could not extract message from:', data)
      return
    }

    if (debug) console.log('📥 Extracted string message:', rawString)

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
    sendJson,
    sendMessage,
    sendRawMessage,
    onMessage,
    clearLog,
    handleIncomingMessage,
  }
}

export default useInterlucientMessageBus
