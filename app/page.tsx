'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import {
  PlatformNext,
  ModelDefinition,
  UndefinedModelDefinition,
  DefaultStreamerOptions,
  StreamerStatus,
  LaunchStatusType
} from '@pureweb/platform-sdk'
import {
  useStreamer,
  useLaunchRequest,
  VideoStream
} from '@pureweb/platform-sdk-react'
import ControlPanel from './components/ControlPanel'
import { TrainingControlAction } from './components/PureWebStream'

// Configuration - same as my-app's client.json
const projectId = '94adc3ba-7020-49f0-9a7c-bb8f1531536a'
const modelId = '26c1dfea-9845-46bb-861d-fb90a22b28df'

// Initialize platform OUTSIDE component (like my-app does)
const platform = new PlatformNext()
platform.initialize({ endpoint: 'https://api.pureweb.io' })

// Streamer options (like my-app)
const streamerOptions = DefaultStreamerOptions

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null)

  // State - match my-app exactly
  const [modelDefinition, setModelDefinition] = useState<ModelDefinition>(new UndefinedModelDefinition())
  const [availableModels, setAvailableModels] = useState<ModelDefinition[]>()
  const [loading, setLoading] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)

  // Initialize platform - match my-app's useAsyncEffect
  useEffect(() => {
    async function init() {
      try {
        console.log('Initializing with project:', projectId)

        await platform.launchRequestAccess({
          projectId,
          modelId
        })

        console.log('Agent Connected:', platform.agent?.id)

        if (platform.agent?.serviceCredentials?.iceServers) {
          streamerOptions.iceServers = platform.agent.serviceCredentials.iceServers as RTCIceServer[]
        }

        const models = await platform.getModels()
        console.log('Available models:', models)
        setAvailableModels(models)

      } catch (err) {
        console.error('Init error:', err)
        setInitError(String(err))
      }
    }
    init()
  }, [])

  // Select model when available - match my-app pattern
  useEffect(() => {
    if (availableModels?.length) {
      const selected = availableModels.filter((m) => m.id === modelId && m.active)
      if (selected.length) {
        console.log('Selected model:', selected[0])
        setModelDefinition(selected[0])
      } else if (availableModels.length > 0) {
        console.log('Using first model:', availableModels[0])
        setModelDefinition(availableModels[0])
      }
    }
  }, [availableModels])

  // HOOKS AT TOP LEVEL - like my-app (lines 321-330)
  // These are called every render, even with UndefinedModelDefinition
  const [launchStatus, launchRequest, queueLaunchRequest] = useLaunchRequest(
    platform,
    modelDefinition,
    {}
  )

  const [streamerStatus, emitter, videoStream, audioStream, messageSubject] = useStreamer(
    platform,
    launchRequest,
    streamerOptions
  )

  // Launch function - called like my-app's launch() on line 363
  const launch = useCallback(async () => {
    console.log('Launch clicked')
    setLoading(true)
    try {
      await queueLaunchRequest()
    } catch (err) {
      console.error('Launch failed:', err)
      setInitError(String(err))
    }
  }, [queueLaunchRequest])

  // Auto-launch when model is ready (instead of requiring button click)
  useEffect(() => {
    const isValidModel = modelDefinition && modelDefinition.id && modelDefinition.id !== ''
    if (isValidModel && !loading && streamerStatus !== StreamerStatus.Connected) {
      console.log('Auto-launching for model:', modelDefinition.id)
      launch()
    }
  }, [modelDefinition, loading, streamerStatus, launch])

  // Debug logging
  useEffect(() => {
    console.log('Status:', launchStatus.status, '| Streamer:', streamerStatus, '| Video:', videoStream ? 'Yes' : 'No')
  }, [launchStatus.status, streamerStatus, videoStream])

  // Handle disconnect
  useEffect(() => {
    if (streamerStatus === StreamerStatus.Failed) {
      platform.disconnect()
    }
  }, [streamerStatus])

  // Control handlers
  const handleTrainingControl = useCallback((action: TrainingControlAction) => {
    if (emitter) emitter.EmitUIInteraction(`trainingControl:${action}`)
  }, [emitter])

  const handleToolChange = useCallback((toolId: string) => {
    if (emitter) emitter.EmitUIInteraction(`requestToolChange:${toolId}`)
  }, [emitter])

  const handleToolOperation = useCallback((toolId: string, operation: string, params?: Record<string, unknown>) => {
    if (emitter) emitter.EmitUIInteraction(JSON.stringify({ action: 'executeToolOperation', toolId, operation, ...params }))
  }, [emitter])

  const handleCameraChange = useCallback((viewId: string) => {
    if (emitter) emitter.EmitUIInteraction(`setCameraView:${viewId}`)
  }, [emitter])

  const handleRequestProgress = useCallback(() => {
    if (emitter) emitter.EmitUIInteraction('requestDetailedProgress')
  }, [emitter])

  const isConnected = streamerStatus === StreamerStatus.Connected
  const connectionStatus = isConnected ? 'connected' : 'connecting'

  // Error state
  if (initError) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-xl text-white">Error</h2>
          <p className="text-gray-400">{initError}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-indigo-600 text-white rounded">
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Waiting for models
  if (!availableModels) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 mx-auto border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Connecting to PureWeb...</p>
        </div>
      </div>
    )
  }

  // Main view - always render VideoStream (like my-app's EmbeddedView)
  return (
    <div className="h-screen w-screen bg-gray-950 relative overflow-hidden">
      {/* Control Panel */}
      <ControlPanel
        onTrainingControl={handleTrainingControl}
        onToolChange={handleToolChange}
        onToolOperation={handleToolOperation}
        onCameraChange={handleCameraChange}
        onRequestProgress={handleRequestProgress}
        isConnected={isConnected}
        connectionStatus={connectionStatus as 'disconnected' | 'connecting' | 'connected'}
      />

      {/* Loading overlay - shown when not connected */}
      {streamerStatus !== StreamerStatus.Connected && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-950">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 mx-auto border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400">
              {launchStatus.status === LaunchStatusType.Queued ? 'In queue...' :
               launchStatus.status === LaunchStatusType.Requested ? 'Starting stream...' :
               streamerStatus === StreamerStatus.New ? 'Initializing...' :
               streamerStatus === StreamerStatus.Checking ? 'Connecting...' :
               'Loading...'}
            </p>
            <p className="text-gray-600 text-xs">
              Launch: {launchStatus.status} | Stream: {streamerStatus}
            </p>
          </div>
        </div>
      )}

      {/* VideoStream - ALWAYS render it like my-app does */}
      <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <VideoStream
          VideoRef={videoRef}
          Emitter={emitter}
          Stream={videoStream}
          UseNativeTouchEvents={true}
          UsePointerLock={false}
          PointerLockRelease={true}
        />
      </div>

      {/* CSS to make video fill container */}
      <style jsx global>{`
        video {
          width: 100% !important;
          height: 100% !important;
          object-fit: contain;
          position: absolute;
          top: 0;
          left: 0;
        }
      `}</style>

      {/* Top overlay */}
      <div className="absolute top-4 left-16 right-4 flex justify-between items-center pointer-events-none z-20">
        <div className="flex items-center gap-3 px-3 py-2 bg-black/50 backdrop-blur-sm rounded-lg pointer-events-auto">
          <span className="text-white/80 text-sm font-medium">OP Skillsim</span>
          <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-white/20">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
            <span className="text-xs text-gray-400">{isConnected ? 'Live' : 'Connecting'}</span>
          </div>
        </div>
        <button
          onClick={() => document.documentElement.requestFullscreen()}
          className="p-2 bg-black/50 backdrop-blur-sm rounded-lg text-white/70 hover:text-white pointer-events-auto"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </div>
    </div>
  )
}
