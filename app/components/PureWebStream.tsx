'use client'

import { useEffect, useState, useCallback, forwardRef, useImperativeHandle, useRef } from 'react'
import {
  PlatformNext,
  StreamerStatus,
  LaunchStatusType,
  ModelDefinition,
  DefaultStreamerOptions,
  InputEmitter
} from '@pureweb/platform-sdk'
import {
  useStreamer,
  useLaunchRequest,
  VideoStream
} from '@pureweb/platform-sdk-react'

// Message types
export type TrainingControlAction = 'start' | 'pause' | 'resume' | 'reset' | 'abort'

export interface PureWebStreamHandle {
  emitUIInteraction: (descriptor: string | object) => void
  trainingControl: (action: TrainingControlAction) => void
  requestToolChange: (toolId: string) => void
  executeToolOperation: (toolId: string, operation: string, params?: Record<string, unknown>) => void
  setCameraView: (viewId: string) => void
  requestProgress: () => void
  isConnected: boolean
  connectionStatus: 'disconnected' | 'connecting' | 'connected'
}

interface PureWebStreamProps {
  platform: PlatformNext
  modelDefinition: ModelDefinition
  streamerOptions?: typeof DefaultStreamerOptions
  onMessage?: (message: string) => void
  onConnectionChange?: (connected: boolean, status: 'disconnected' | 'connecting' | 'connected') => void
  className?: string
}

const PureWebStream = forwardRef<PureWebStreamHandle, PureWebStreamProps>(
  ({ platform, modelDefinition, streamerOptions, onMessage, onConnectionChange, className }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [launched, setLaunched] = useState(false)

    // Use provided streamer options or defaults
    const options = streamerOptions || DefaultStreamerOptions

    // Launch the model - match my-app's pattern exactly
    const [launchStatus, launchRequest, queueLaunchRequest] = useLaunchRequest(
      platform,
      modelDefinition,
      {} // LaunchRequestOptions
    )

    // Connect to the stream - pass streamerOptions like my-app does
    const [streamerStatus, emitter, videoStream, audioStream, messageSubject] = useStreamer(
      platform,
      launchRequest,
      options
    )

    // Auto-launch when component mounts (equivalent to clicking Launch button in my-app)
    // Only launch if we have a valid model (not UndefinedModelDefinition)
    useEffect(() => {
      const isValidModel = modelDefinition && modelDefinition.id && modelDefinition.id !== ''

      if (!launched && queueLaunchRequest && isValidModel) {
        console.log('🚀 Queuing launch request for model:', modelDefinition.id)
        setLaunched(true)
        queueLaunchRequest().catch((err: Error) => {
          console.error('Launch request failed:', err)
        })
      }
    }, [launched, queueLaunchRequest, modelDefinition])

    // Debug logging
    useEffect(() => {
      console.log('📊 Launch Status:', launchStatus.status, launchStatus.message || '')
    }, [launchStatus])

    useEffect(() => {
      console.log('📡 Streamer Status:', streamerStatus)
    }, [streamerStatus])

    useEffect(() => {
      console.log('🎥 Video Stream:', videoStream ? 'Available' : 'Not available')
    }, [videoStream])

    useEffect(() => {
      console.log('🚀 Launch Request:', launchRequest)
    }, [launchRequest])

    useEffect(() => {
      console.log('🎛️ Emitter:', emitter ? 'Available' : 'Not available')
    }, [emitter])

    const isConnected = streamerStatus === StreamerStatus.Connected
    const connectionStatus: 'disconnected' | 'connecting' | 'connected' =
      streamerStatus === StreamerStatus.Connected ? 'connected' :
      (streamerStatus === StreamerStatus.Checking || streamerStatus === StreamerStatus.New) ? 'connecting' : 'disconnected'

    // Notify parent of connection changes
    useEffect(() => {
      onConnectionChange?.(isConnected, connectionStatus)
    }, [isConnected, connectionStatus, onConnectionChange])

    // Listen for messages from UE5
    useEffect(() => {
      if (messageSubject) {
        const subscription = messageSubject.subscribe((message: string) => {
          console.log('📥 Received from UE5:', message)
          onMessage?.(message)
        })
        return () => subscription.unsubscribe()
      }
    }, [messageSubject, onMessage])

    // Core emit function using InputEmitter
    const emitUIInteraction = useCallback((descriptor: string | object) => {
      console.log('📤 Sending to UE5:', descriptor)
      if (emitter) {
        emitter.EmitUIInteraction(descriptor)
      } else {
        console.warn('Emitter not ready, message not sent:', descriptor)
      }
    }, [emitter])

    // Convenience methods
    const trainingControl = useCallback((action: TrainingControlAction) => {
      emitUIInteraction(`trainingControl:${action}`)
    }, [emitUIInteraction])

    const requestToolChange = useCallback((toolId: string) => {
      emitUIInteraction(`requestToolChange:${toolId}`)
    }, [emitUIInteraction])

    const executeToolOperation = useCallback((
      toolId: string,
      operation: string,
      params?: Record<string, unknown>
    ) => {
      emitUIInteraction(JSON.stringify({
        action: 'executeToolOperation',
        toolId,
        operation,
        ...params
      }))
    }, [emitUIInteraction])

    const setCameraView = useCallback((viewId: string) => {
      emitUIInteraction(`setCameraView:${viewId}`)
    }, [emitUIInteraction])

    const requestProgress = useCallback(() => {
      emitUIInteraction('requestDetailedProgress')
    }, [emitUIInteraction])

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      emitUIInteraction,
      trainingControl,
      requestToolChange,
      executeToolOperation,
      setCameraView,
      requestProgress,
      isConnected,
      connectionStatus
    }), [emitUIInteraction, trainingControl, requestToolChange, executeToolOperation, setCameraView, requestProgress, isConnected, connectionStatus])

    // Render based on streamer status - match my-app's LoadingView pattern
    if (streamerStatus === StreamerStatus.NotSupported) {
      return (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}>
          <h3 style={{ color: '#fff' }}>Your browser does not support WebRTC</h3>
        </div>
      )
    }

    if (streamerStatus === StreamerStatus.Failed) {
      return (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ color: '#fff' }}>Stream Failed</h3>
            <p style={{ color: '#888' }}>Please refresh to try again</p>
          </div>
        </div>
      )
    }

    if (streamerStatus === StreamerStatus.Disconnected) {
      return (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}>
          <h3 style={{ color: '#fff' }}>Disconnected from stream</h3>
        </div>
      )
    }

    // Show loading overlay when not connected yet
    const showLoading = streamerStatus !== StreamerStatus.Connected && streamerStatus !== StreamerStatus.Completed

    return (
      <div style={{ position: 'absolute', inset: 0, background: '#0a0a0a' }}>
        {/* Loading overlay */}
        {showLoading && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            background: '#0a0a0a'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 48,
                height: 48,
                margin: '0 auto 16px',
                border: '4px solid #333',
                borderTopColor: '#6366f1',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <p style={{ color: '#888' }}>
                {launchStatus.status === LaunchStatusType.Queued ? 'In queue... (waiting for available instance)' :
                 launchStatus.status === LaunchStatusType.Requested ? 'Starting stream...' :
                 streamerStatus === StreamerStatus.New ? 'Initializing...' :
                 streamerStatus === StreamerStatus.Checking ? 'Connecting...' :
                 'Loading...'}
              </p>
              <p style={{ color: '#666', fontSize: '12px', marginTop: '8px' }}>
                Launch: {launchStatus.status} | Stream: {streamerStatus}
              </p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          </div>
        )}

        {/* VideoStream - always render it, my-app does this too */}
        <VideoStream
          VideoRef={videoRef}
          Emitter={emitter}
          Stream={videoStream}
          UseNativeTouchEvents={true}
          UsePointerLock={false}
          PointerLockRelease={true}
        />
      </div>
    )
  }
)

PureWebStream.displayName = 'PureWebStream'

export default PureWebStream
