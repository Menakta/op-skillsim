'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react'
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
  useLaunchRequest
} from '@pureweb/platform-sdk-react'
import type { InputEmitter } from '@pureweb/platform-sdk'
import type { Subject } from 'rxjs'

// =============================================================================
// Context Types
// =============================================================================

export interface StreamContextValue {
  // Connection state
  isConnected: boolean
  streamerStatus: StreamerStatus
  launchStatus: LaunchStatusType

  // SDK objects
  emitter: InputEmitter | undefined
  messageSubject: Subject<string> | undefined
  videoStream: MediaStream | undefined
  audioStream: MediaStream | undefined

  // Error state
  error: string | null

  // Actions
  launch: () => Promise<void>

  // Loading state
  isLoading: boolean
  isModelReady: boolean
}

// =============================================================================
// Context
// =============================================================================

const StreamContext = createContext<StreamContextValue | null>(null)

// =============================================================================
// Provider Props
// =============================================================================

interface StreamProviderProps {
  children: ReactNode
  projectId: string
  modelId: string
  autoLaunch?: boolean
}

// =============================================================================
// Initialize Platform (outside component to prevent re-creation)
// =============================================================================

let platformInstance: PlatformNext | null = null

function getPlatform(): PlatformNext {
  if (!platformInstance) {
    platformInstance = new PlatformNext()
    platformInstance.initialize({ endpoint: 'https://api.pureweb.io' })
  }
  return platformInstance
}

// =============================================================================
// Provider Component
// =============================================================================

export function StreamProvider({
  children,
  projectId,
  modelId,
  autoLaunch = true
}: StreamProviderProps) {
  const platform = getPlatform()
  const streamerOptions = { ...DefaultStreamerOptions }

  // State
  const [modelDefinition, setModelDefinition] = useState<ModelDefinition>(new UndefinedModelDefinition())
  const [availableModels, setAvailableModels] = useState<ModelDefinition[]>()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasInitialized = useRef(false)
  const hasLaunched = useRef(false)

  // ==========================================================================
  // Initialize Platform
  // ==========================================================================

  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true

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
        setError(String(err))
      }
    }
    init()
  }, [projectId, modelId])

  // ==========================================================================
  // Select Model
  // ==========================================================================

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
  }, [availableModels, modelId])

  // ==========================================================================
  // PureWeb Hooks
  // ==========================================================================

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

  // ==========================================================================
  // Launch Handler
  // ==========================================================================

  const launch = useCallback(async () => {
    if (hasLaunched.current) return
    console.log('Launch clicked')
    setIsLoading(true)
    try {
      await queueLaunchRequest()
      hasLaunched.current = true
    } catch (err) {
      console.error('Launch failed:', err)
      setError(String(err))
    }
  }, [queueLaunchRequest])

  // ==========================================================================
  // Auto-launch
  // ==========================================================================

  useEffect(() => {
    const isValidModel = modelDefinition && modelDefinition.id && modelDefinition.id !== ''
    if (autoLaunch && isValidModel && !isLoading && !hasLaunched.current && streamerStatus !== StreamerStatus.Connected) {
      console.log('Auto-launching for model:', modelDefinition.id)
      launch()
    }
  }, [modelDefinition, isLoading, streamerStatus, launch, autoLaunch])

  // ==========================================================================
  // Debug Logging
  // ==========================================================================

  useEffect(() => {
    console.log('Status:', launchStatus.status, '| Streamer:', streamerStatus, '| Video:', videoStream ? 'Yes' : 'No')
  }, [launchStatus.status, streamerStatus, videoStream])

  // ==========================================================================
  // Handle Disconnect
  // ==========================================================================

  useEffect(() => {
    if (streamerStatus === StreamerStatus.Failed) {
      platform.disconnect()
    }
  }, [streamerStatus])

  // ==========================================================================
  // Context Value
  // ==========================================================================

  const isConnected = streamerStatus === StreamerStatus.Connected
  const isModelReady = Boolean(modelDefinition && modelDefinition.id && modelDefinition.id !== '')

  const value: StreamContextValue = {
    isConnected,
    streamerStatus,
    launchStatus: launchStatus.status,
    emitter,
    messageSubject,
    videoStream,
    audioStream,
    error,
    launch,
    isLoading,
    isModelReady
  }

  return (
    <StreamContext.Provider value={value}>
      {children}
    </StreamContext.Provider>
  )
}

// =============================================================================
// Hook
// =============================================================================

export function useStream(): StreamContextValue {
  const context = useContext(StreamContext)
  if (!context) {
    throw new Error('useStream must be used within a StreamProvider')
  }
  return context
}
