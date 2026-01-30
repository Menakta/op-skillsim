'use client'

/**
 * Stream Connection Hook
 *
 * Manages PureWeb SDK connection lifecycle:
 * - Platform initialization and pre-warming
 * - Connection state and retry logic
 * - Model selection
 * - Streamer status handling
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import {
  PlatformNext,
  ModelDefinition,
  UndefinedModelDefinition,
  DefaultStreamerOptions,
  StreamerStatus,
} from '@pureweb/platform-sdk'
import { useLaunchRequest, useStreamer } from '@pureweb/platform-sdk-react'
import { RETRY_CONFIG } from '../config'
import { getStreamErrorMessage } from '../lib/errorUtils'

// =============================================================================
// Types
// =============================================================================

export type ConnectionStatus = 'initializing' | 'connecting' | 'connected' | 'failed' | 'retrying'

export interface UseStreamConnectionConfig {
  projectId: string
  modelId: string
  streamStarted: boolean
  onError?: (error: string) => void
  onConnected?: (isFirstConnection: boolean) => void
  onSessionEnd?: (reason: 'expired' | 'logged_out' | 'inactive' | 'kicked' | 'other') => void
}

export interface UseStreamConnectionReturn {
  // Platform ref (needed by PureWeb hooks in parent)
  platformRef: React.MutableRefObject<PlatformNext | null>

  // Connection state
  connectionStatus: ConnectionStatus
  isConnected: boolean
  isRetrying: boolean
  retryCount: number
  loading: boolean

  // Model state
  modelDefinition: ModelDefinition
  availableModels: ModelDefinition[] | undefined

  // PureWeb hook returns
  launchStatus: { status: string }
  streamerStatus: StreamerStatus
  emitter: any
  videoStream: MediaStream | null
  audioStream: MediaStream | null
  messageSubject: any

  // Actions
  initializePlatform: (attempt?: number) => Promise<void>
  /** Reconnect stream without full page reload - preserves training state */
  reconnectStream: () => Promise<void>
  /** Whether a reconnection is currently in progress */
  isReconnecting: boolean

  // State setters (for connectionActions in StreamingApp)
  setRetryCount: React.Dispatch<React.SetStateAction<number>>
  setAvailableModels: React.Dispatch<React.SetStateAction<ModelDefinition[] | undefined>>
  setModelDefinition: React.Dispatch<React.SetStateAction<ModelDefinition>>
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  setConnectionStatus: React.Dispatch<React.SetStateAction<ConnectionStatus>>
}

// =============================================================================
// Streamer Options
// =============================================================================

const streamerOptions = DefaultStreamerOptions

// =============================================================================
// Hook Implementation
// =============================================================================

export function useStreamConnection(config: UseStreamConnectionConfig): UseStreamConnectionReturn {
  const { projectId, modelId, streamStarted, onError, onConnected, onSessionEnd } = config

  // Platform ref - persists across renders
  const platformRef = useRef<PlatformNext | null>(null)
  const preWarmStartedRef = useRef(false)
  const wasConnectedRef = useRef(false)

  // Initialize platform on first render
  if (!platformRef.current) {
    platformRef.current = new PlatformNext()
    platformRef.current.initialize({ endpoint: 'https://api.pureweb.io' })
  }

  // Warm environment from server-side pool
  const warmEnvRef = useRef<{ environmentId: string; agentToken: string } | null>(null)

  // Platform state
  const [modelDefinition, setModelDefinition] = useState<ModelDefinition>(new UndefinedModelDefinition())
  const [availableModels, setAvailableModels] = useState<ModelDefinition[]>()
  const [loading, setLoading] = useState(false)

  // Retry state
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('initializing')

  // ==========================================================================
  // Pre-warm platform connection on mount
  // ==========================================================================

  useEffect(() => {
    if (preWarmStartedRef.current) return
    preWarmStartedRef.current = true

    const preWarm = async () => {
      try {
        console.log('🔥 Pre-warming platform connection...')
        const platform = platformRef.current
        if (!platform) return

        // Pre-authenticate with PureWeb (doesn't launch instance yet)
        await platform.launchRequestAccess({ projectId, modelId })
        const models = await platform.getModels()

        if (models?.length) {
          console.log('✅ Platform pre-warmed, models cached:', models.length)
          setAvailableModels(models)
        }

        // Also pre-claim a warm environment from server pool
        try {
          console.log('🔥 Claiming warm environment from pool...')
          const response = await fetch('/api/stream/warm-claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })

          if (response.ok) {
            const data = await response.json()
            warmEnvRef.current = {
              environmentId: data.environmentId,
              agentToken: data.agentToken,
            }
            console.log(`✅ Warm environment claimed (${data.source}): ${data.environmentId} in ${data.claimTimeMs}ms`)
          }
        } catch (err) {
          console.log('⚠️ Warm pool claim failed (will use default flow):', err)
        }
      } catch (err) {
        console.log('⚠️ Pre-warm failed (will retry on Start):', err)
      }
    }

    preWarm()
  }, [projectId, modelId])

  // ==========================================================================
  // Platform Initialization with Retry Logic
  // ==========================================================================

  // Use ref to track available models to avoid dependency cycle
  const availableModelsRef = useRef<ModelDefinition[] | undefined>(availableModels)
  availableModelsRef.current = availableModels

  const initializePlatform = useCallback(async (attempt: number = 1) => {
    try {
      console.log(`🚀 Initializing with project (attempt ${attempt}/${RETRY_CONFIG.maxRetries}):`, projectId)
      setConnectionStatus(attempt > 1 ? 'retrying' : 'initializing')
      setIsRetrying(attempt > 1)

      // Reset platform on retry
      if (attempt > 1 && platformRef.current) {
        try {
          platformRef.current.disconnect()
        } catch (e) {
          console.log('Disconnect error (ignored):', e)
        }
        platformRef.current = new PlatformNext()
        platformRef.current.initialize({ endpoint: 'https://api.pureweb.io' })
      }

      const platform = platformRef.current
      if (!platform) {
        throw new Error('Platform not initialized')
      }

      // Skip if already pre-warmed (models already fetched) - use ref to avoid dependency
      if (availableModelsRef.current?.length && attempt === 1) {
        console.log('⚡ Using pre-warmed connection, skipping initialization')
        if (platform.agent?.serviceCredentials?.iceServers) {
          streamerOptions.iceServers = platform.agent.serviceCredentials.iceServers as RTCIceServer[]
        }
        setConnectionStatus('connecting')
        return
      }

      await platform.launchRequestAccess({
        projectId,
        modelId
      })

      console.log('✅ Agent Connected:', platform.agent?.id)

      if (platform.agent?.serviceCredentials?.iceServers) {
        streamerOptions.iceServers = platform.agent.serviceCredentials.iceServers as RTCIceServer[]
      }

      const models = await platform.getModels()
      console.log('📦 Available models:', models)
      setAvailableModels(models)
      setConnectionStatus('connecting')
      setRetryCount(0)
      setIsRetrying(false)

    } catch (err) {
      console.error(`❌ Init error (attempt ${attempt}):`, err)

      if (attempt < RETRY_CONFIG.maxRetries) {
        console.log(`⏳ Retrying in ${RETRY_CONFIG.retryDelay / 1000} seconds...`)
        setRetryCount(attempt)
        setTimeout(() => {
          initializePlatform(attempt + 1)
        }, RETRY_CONFIG.retryDelay)
      } else {
        setConnectionStatus('failed')
        setIsRetrying(false)
        onError?.(getStreamErrorMessage(err))
      }
    }
  }, [projectId, modelId, onError])

  // Track if initialization has been triggered to prevent double-init
  const initTriggeredRef = useRef(false)

  // Initialize platform when stream is started by user
  useEffect(() => {
    if (streamStarted && !initTriggeredRef.current) {
      initTriggeredRef.current = true
      initializePlatform(1)
    }
  }, [streamStarted, initializePlatform])

  // ==========================================================================
  // Reconnect Stream - Manual reconnection without page reload
  // ==========================================================================

  const reconnectStream = useCallback(async () => {
    console.log('🔄 Manual stream reconnection requested')
    setIsReconnecting(true)
    setConnectionStatus('retrying')

    try {
      // Step 1: Disconnect current stream cleanly
      if (platformRef.current) {
        try {
          console.log('🔌 Disconnecting current stream...')
          platformRef.current.disconnect()
        } catch (e) {
          console.log('Disconnect error (ignored):', e)
        }
      }

      // Step 2: Small delay to ensure clean disconnect
      await new Promise(resolve => setTimeout(resolve, 500))

      // Step 3: Reset platform instance
      console.log('🔧 Resetting platform instance...')
      platformRef.current = new PlatformNext()
      platformRef.current.initialize({ endpoint: 'https://api.pureweb.io' })

      // Step 4: Reset state for fresh connection
      setAvailableModels(undefined)
      setModelDefinition(new UndefinedModelDefinition())
      setLoading(false)
      setRetryCount(0)
      setIsRetrying(false)

      // Step 5: Re-initialize platform connection
      console.log('🚀 Re-initializing platform connection...')
      await initializePlatform(1)

      console.log('✅ Reconnection initiated successfully')
    } catch (err) {
      console.error('❌ Reconnection failed:', err)
      setConnectionStatus('failed')
      onError?.(getStreamErrorMessage(err))
    } finally {
      setIsReconnecting(false)
    }
  }, [initializePlatform, onError])

  // ==========================================================================
  // Model Selection
  // ==========================================================================

  useEffect(() => {
    if (availableModels?.length) {
      const selected = availableModels.filter((m) => m.id === modelId && m.active)
      if (selected.length) {
        console.log('✅ Selected model:', selected[0])
        setModelDefinition(selected[0])
      } else if (availableModels.length > 0) {
        console.log('📦 Using first model:', availableModels[0])
        setModelDefinition(availableModels[0])
      }
    }
  }, [availableModels, modelId])

  // ==========================================================================
  // PureWeb Hooks
  // ==========================================================================

  const [launchStatus, launchRequest, queueLaunchRequest] = useLaunchRequest(
    platformRef.current!,
    modelDefinition,
    {}
  )

  const [streamerStatus, emitter, videoStream, audioStream, messageSubject] = useStreamer(
    platformRef.current!,
    launchRequest,
    streamerOptions
  )

  // ==========================================================================
  // Launch Logic
  // ==========================================================================

  const launch = useCallback(async () => {
    console.log('🚀 Launch clicked')
    setLoading(true)
    try {
      await queueLaunchRequest()
    } catch (err) {
      console.error('❌ Launch failed:', err)
      onError?.(getStreamErrorMessage(err))
    }
  }, [queueLaunchRequest, onError])

  // Auto-launch when model is ready
  useEffect(() => {
    const isValidModel = modelDefinition && modelDefinition.id && modelDefinition.id !== ''
    if (isValidModel && !loading && streamerStatus !== StreamerStatus.Connected) {
      console.log('🚀 Auto-launching for model:', modelDefinition.id)
      launch()
    }
  }, [modelDefinition, loading, streamerStatus, launch])

  // Debug logging
  useEffect(() => {
    console.log('📡 Status:', launchStatus.status, '| Streamer:', streamerStatus, '| Video:', videoStream ? 'Yes' : 'No')
  }, [launchStatus.status, streamerStatus, videoStream])

  // ==========================================================================
  // Handle Streamer Status Changes
  // ==========================================================================

  // Use ref for initializePlatform to avoid dependency cycle in streamer status effect
  const initializePlatformRef = useRef(initializePlatform)
  initializePlatformRef.current = initializePlatform

  useEffect(() => {
    if (streamerStatus === StreamerStatus.Connected) {
      setConnectionStatus('connected')
      setRetryCount(0)
      const isFirstConnection = !wasConnectedRef.current
      wasConnectedRef.current = true
      onConnected?.(isFirstConnection)
    } else if (streamerStatus === StreamerStatus.Failed) {
      console.log('❌ Streamer failed, attempting to reconnect...')
      setConnectionStatus('failed')

      try {
        platformRef.current?.disconnect()
      } catch (e) {
        console.log('Disconnect error (ignored):', e)
      }

      // Auto-retry on stream failure if we haven't exceeded retries
      if (retryCount < RETRY_CONFIG.maxRetries) {
        setTimeout(() => {
          console.log(`🔄 Auto-retry after stream failure (${retryCount + 1}/${RETRY_CONFIG.maxRetries})`)
          setRetryCount(prev => prev + 1)
          setAvailableModels(undefined)
          setModelDefinition(new UndefinedModelDefinition())
          setLoading(false)
          initializePlatformRef.current(retryCount + 1)
        }, RETRY_CONFIG.retryDelay)
      }
    } else if (
      // Session ended - show modal only if we were previously connected
      wasConnectedRef.current &&
      (streamerStatus === StreamerStatus.Disconnected ||
       streamerStatus === StreamerStatus.Closed ||
       streamerStatus === StreamerStatus.Completed ||
       streamerStatus === StreamerStatus.Withdrawn)
    ) {
      console.log('🔌 Session ended with status:', streamerStatus)

      // Determine the reason based on status
      let reason: 'expired' | 'logged_out' | 'inactive' | 'kicked' | 'other' = 'other'
      if (streamerStatus === StreamerStatus.Closed) {
        reason = 'logged_out'
      } else if (streamerStatus === StreamerStatus.Withdrawn) {
        reason = 'kicked'
      } else if (streamerStatus === StreamerStatus.Completed) {
        reason = 'logged_out'
      }

      onSessionEnd?.(reason)
    }
  }, [streamerStatus, retryCount, onConnected, onSessionEnd])

  // ==========================================================================
  // Return
  // ==========================================================================

  const isConnected = streamerStatus === StreamerStatus.Connected

  return useMemo(() => ({
    platformRef,
    connectionStatus,
    isConnected,
    isRetrying,
    isReconnecting,
    retryCount,
    loading,
    modelDefinition,
    availableModels,
    launchStatus,
    streamerStatus,
    emitter,
    videoStream,
    audioStream,
    messageSubject,
    initializePlatform,
    reconnectStream,
    setRetryCount,
    setAvailableModels,
    setModelDefinition,
    setLoading,
    setConnectionStatus,
  }), [
    connectionStatus,
    isConnected,
    isRetrying,
    isReconnecting,
    retryCount,
    loading,
    modelDefinition,
    availableModels,
    launchStatus,
    streamerStatus,
    emitter,
    videoStream,
    audioStream,
    messageSubject,
    initializePlatform,
    reconnectStream,
  ])
}

export default useStreamConnection
