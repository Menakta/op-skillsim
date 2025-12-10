'use client'

import { useCallback, useEffect, useState } from 'react'

// Message types from Web → UE5
export type WebToUE5MessageType =
  | 'session'
  | 'assessment'
  | 'toolSystem'
  | 'fittingSelection'
  | 'taskProgress'
  | 'camera'
  | 'system'

// Actions for each message type
export type SessionAction = 'initSession' | 'trainingControl'
export type TrainingControlAction = 'start' | 'pause' | 'resume' | 'reset' | 'abort'
export type AssessmentAction = 'submitAnswer'
export type ToolSystemAction = 'requestToolChange' | 'executeToolOperation'
export type FittingSelectionAction = 'selectFitting'
export type TaskProgressAction = 'requestDetailedProgress'
export type CameraAction = 'setCameraView'
export type SystemAction = 'heartbeat'

// UE5 → Web message types
export type UE5ToWebMessageType =
  | 'session'
  | 'assessment'
  | 'taskProgress'
  | 'toolSystem'
  | 'fittingSelection'
  | 'pipeConnection'
  | 'glueApplication'
  | 'pressureTesting'
  | 'error'
  | 'system'

export interface UE5Message {
  messageType: UE5ToWebMessageType
  action: string
  payload?: Record<string, unknown>
  timestamp: number
}

interface UseStreamMessagingReturn {
  // Send structured message to UE5
  sendToUE5: (messageType: WebToUE5MessageType, action: string, payload?: Record<string, unknown>) => void
  // Convenience methods
  initSession: (userId: string, userName?: string) => void
  trainingControl: (action: TrainingControlAction) => void
  submitAnswer: (questionId: string, answer: string) => void
  requestToolChange: (toolId: string) => void
  executeToolOperation: (toolId: string, operation: string, params?: Record<string, unknown>) => void
  selectFitting: (fittingId: string) => void
  requestProgress: () => void
  setCameraView: (viewId: string) => void
  sendHeartbeat: () => void
  // State
  lastMessage: UE5Message | null
  isConnected: boolean
  connectionStatus: 'disconnected' | 'connecting' | 'connected'
}

export function useStreamMessaging(iframeRef: React.RefObject<HTMLIFrameElement | null>): UseStreamMessagingReturn {
  // Default to connected since we assume the stream is ready when this hook is used
  const [isConnected, setIsConnected] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('connected')
  const [lastMessage, setLastMessage] = useState<UE5Message | null>(null)

  // Core send function for PureWeb hosted player iframe
  const sendToUE5 = useCallback((messageType: WebToUE5MessageType, action: string, payload?: Record<string, unknown>) => {
    const fullMessage = {
      messageType,
      action,
      payload: payload || {},
      timestamp: Date.now()
    }

    console.log('📤 Sending to UE5:', fullMessage)

    if (iframeRef.current?.contentWindow) {
      try {
        // Format 1: PureWeb emitUIInteraction format
        // The hosted player forwards this to UE5's OnUIInteraction event
        const uiInteraction = {
          type: 'input',
          input: {
            type: 'UIInteraction',
            descriptor: action,
            data: JSON.stringify({ messageType, ...payload })
          }
        }
        iframeRef.current.contentWindow.postMessage(uiInteraction, '*')

        // Format 2: Direct UIInteraction format (alternative)
        const directUIInteraction = {
          type: 'UIInteraction',
          Descriptor: action,
          Data: JSON.stringify({ messageType, ...payload })
        }
        iframeRef.current.contentWindow.postMessage(directUIInteraction, '*')

        // Format 3: PureWeb command format
        const purewebCommand = {
          type: 'pureweb:command',
          command: 'emitUIInteraction',
          payload: {
            descriptor: action,
            data: { messageType, ...payload }
          }
        }
        iframeRef.current.contentWindow.postMessage(purewebCommand, '*')

        // Format 4: Simple string command (some setups expect this)
        const stringCommand = JSON.stringify({
          Descriptor: action,
          Data: { messageType, ...payload }
        })
        iframeRef.current.contentWindow.postMessage(stringCommand, '*')

      } catch (err) {
        console.error('Failed to send message to UE5:', err)
      }
    } else {
      console.warn('Iframe not ready, message not sent:', fullMessage)
    }
  }, [iframeRef])

  // Convenience methods
  const initSession = useCallback((userId: string, userName?: string) => {
    sendToUE5('session', 'initSession', { userId, userName })
  }, [sendToUE5])

  const trainingControl = useCallback((action: TrainingControlAction) => {
    sendToUE5('session', 'trainingControl', { control: action })
  }, [sendToUE5])

  const submitAnswer = useCallback((questionId: string, answer: string) => {
    sendToUE5('assessment', 'submitAnswer', { questionId, answer })
  }, [sendToUE5])

  const requestToolChange = useCallback((toolId: string) => {
    sendToUE5('toolSystem', 'requestToolChange', { toolId })
  }, [sendToUE5])

  const executeToolOperation = useCallback((toolId: string, operation: string, params?: Record<string, unknown>) => {
    sendToUE5('toolSystem', 'executeToolOperation', { toolId, operation, ...params })
  }, [sendToUE5])

  const selectFitting = useCallback((fittingId: string) => {
    sendToUE5('fittingSelection', 'selectFitting', { fittingId })
  }, [sendToUE5])

  const requestProgress = useCallback(() => {
    sendToUE5('taskProgress', 'requestDetailedProgress', {})
  }, [sendToUE5])

  const setCameraView = useCallback((viewId: string) => {
    sendToUE5('camera', 'setCameraView', { viewId })
  }, [sendToUE5])

  const sendHeartbeat = useCallback(() => {
    sendToUE5('system', 'heartbeat', {})
  }, [sendToUE5])

  // Listen for messages from UE5
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      let data = event.data

      // Try to parse if string
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data)
        } catch {
          return
        }
      }

      if (data && typeof data === 'object') {
        // Handle UE5 messages
        if (data.messageType) {
          console.log('📥 Received from UE5:', data)

          const ue5Message: UE5Message = {
            messageType: data.messageType,
            action: data.action,
            payload: data.payload || data,
            timestamp: Date.now()
          }

          setLastMessage(ue5Message)

          // Handle connection status
          if (data.messageType === 'system' && data.action === 'connectionStatus') {
            const status = data.payload?.status
            if (status === 'connected') {
              setIsConnected(true)
              setConnectionStatus('connected')
            } else if (status === 'disconnected') {
              setIsConnected(false)
              setConnectionStatus('disconnected')
            }
          }

          // Handle errors
          if (data.messageType === 'error') {
            console.error('UE5 Error:', data.action, data.payload)
          }
        }

        // Handle PureWeb connection events
        if (data.type === 'ready' || data.type === 'connected' || data.source === 'pureweb') {
          setIsConnected(true)
          setConnectionStatus('connected')
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // Auto-connect when iframe loads
  useEffect(() => {
    const iframe = iframeRef.current

    const handleLoad = () => {
      console.log('🔌 Stream iframe loaded')
      setConnectionStatus('connecting')

      // Give PureWeb time to initialize, then assume connected
      setTimeout(() => {
        setIsConnected(true)
        setConnectionStatus('connected')
      }, 2000)
    }

    if (iframe) {
      iframe.addEventListener('load', handleLoad)

      // Fallback timeout
      const timeout = setTimeout(() => {
        if (connectionStatus === 'disconnected') {
          setConnectionStatus('connecting')
          setTimeout(() => {
            setIsConnected(true)
            setConnectionStatus('connected')
          }, 1000)
        }
      }, 3000)

      return () => {
        iframe.removeEventListener('load', handleLoad)
        clearTimeout(timeout)
      }
    }
  }, [iframeRef, connectionStatus])

  // Heartbeat interval
  useEffect(() => {
    if (isConnected) {
      const interval = setInterval(() => {
        sendHeartbeat()
      }, 30000) // Every 30 seconds

      return () => clearInterval(interval)
    }
  }, [isConnected, sendHeartbeat])

  return {
    sendToUE5,
    initSession,
    trainingControl,
    submitAnswer,
    requestToolChange,
    executeToolOperation,
    selectFitting,
    requestProgress,
    setCameraView,
    sendHeartbeat,
    lastMessage,
    isConnected,
    connectionStatus
  }
}
