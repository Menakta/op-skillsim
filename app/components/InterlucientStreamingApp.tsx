'use client'

/**
 * InterlucientStreamingApp - Parallel Implementation for Interlucent Pixel Streaming
 *
 * This component mirrors StreamingApp.tsx but uses Interlucent instead of PureWeb.
 * It reuses most of the existing training/messaging logic but swaps the streaming layer.
 *
 * Key differences from StreamingApp:
 * - Uses <InterlucientStream> instead of <VideoStream>
 * - Uses useInterlucientConnection instead of useStreamConnection
 * - Uses useInterlucientMessageBus for backward-compatible messaging
 * - Simpler connection flow (token-based vs multi-step PureWeb init)
 */

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'

// Interlucent-specific imports
import { InterlucientStream } from '@/app/features/streaming/components/InterlucientStream'
import type { InterlucientStreamRef } from '@/app/features/streaming/components/InterlucientStream'
import { useInterlucientConnection } from '@/app/hooks/useInterlucientConnection'
import { useInterlucientMessageBus } from '@/app/features/messaging/hooks/useInterlucientMessageBus'
import type { InterlucientStatus } from '@/app/types/interlucent.types'

// Shared imports (same as StreamingApp)
import { useQuestions } from '../features/questions'
import {
  LoadingScreen,
  StarterScreen,
  type LoadingStep,
} from '../features'
import { useIdleDetection } from '../features/idle'
import { TASK_SEQUENCE, RETRY_CONFIG } from '../config'
import { useTheme } from '../context/ThemeContext'

// =============================================================================
// Dynamic Imports
// =============================================================================

const ControlPanel = dynamic(() => import('../components/ControlPanel'), {
  ssr: false,
  loading: () => null,
})

const UnifiedSidebar = dynamic(
  () => import('../components/ControlPanel/UnifiedSidebar'),
  { ssr: false, loading: () => null }
)

const MessageLog = dynamic(() => import('../components/MessageLog'), {
  ssr: false,
  loading: () => null,
})

// =============================================================================
// Configuration
// =============================================================================

// Interlucent app configuration (from environment)
const INTERLUCENT_APP_ID = process.env.NEXT_PUBLIC_INTERLUCENT_APP_ID
const INTERLUCENT_APP_VERSION = process.env.NEXT_PUBLIC_INTERLUCENT_APP_VERSION

// =============================================================================
// Helper Functions
// =============================================================================

interface LoadingStatusParams {
  interlucientStatus: InterlucientStatus | null
  connectionStatus: 'initializing' | 'connecting' | 'connected' | 'failed' | 'retrying'
  isTokenLoading: boolean
}

function getLoadingStatus(params: LoadingStatusParams): {
  message: string
  step: LoadingStep
} {
  const { interlucientStatus, connectionStatus, isTokenLoading } = params

  if (isTokenLoading) {
    return { message: 'Authenticating...', step: 'initializing' }
  }

  // Map Interlucent status to loading steps
  switch (interlucientStatus) {
    case 'idle':
      return { message: 'Ready to connect', step: 'initializing' }
    case 'connecting':
      return { message: 'Connecting to server', step: 'connecting' }
    case 'authenticating':
      return { message: 'Authenticating session', step: 'connecting' }
    case 'connected':
      return { message: 'Requesting GPU worker', step: 'launching' }
    case 'queued':
      return { message: 'Waiting for available GPU', step: 'launching' }
    case 'rendezvoused':
      return { message: 'GPU worker assigned', step: 'launching' }
    case 'negotiating':
      return { message: 'Establishing video stream', step: 'streaming' }
    case 'streaming':
      return { message: 'Stream active', step: 'streaming' }
    case 'ready':
      return { message: 'Click to resume stream', step: 'streaming' }
    case 'interrupted':
    case 'recovering':
      return { message: 'Reconnecting...', step: 'connecting' }
    case 'failed':
      return { message: 'Connection failed', step: 'initializing' }
    case 'ended':
      return { message: 'Session ended', step: 'initializing' }
    default:
      return { message: 'Loading...', step: 'initializing' }
  }
}

// =============================================================================
// Main Component
// =============================================================================

export default function InterlucientStreamingApp() {
  // =========================================================================
  // Refs
  // =========================================================================

  const streamRef = useRef<InterlucientStreamRef>(null)

  // =========================================================================
  // Theme
  // =========================================================================

  const { theme } = useTheme()
  const isDark = theme === 'dark'

  // =========================================================================
  // Questions
  // =========================================================================

  const { questionCount } = useQuestions()

  // =========================================================================
  // Screen Flow State (simplified)
  // =========================================================================

  const [showStarterScreen, setShowStarterScreen] = useState(true)
  const [showLoadingScreen, setShowLoadingScreen] = useState(false)
  const [streamStarted, setStreamStarted] = useState(false)
  const [isCinematicMode, setIsCinematicMode] = useState(true)

  // =========================================================================
  // Interlucent Connection
  // =========================================================================

  // Error state for displaying to user
  const [connectionError, setConnectionError] = useState<string | null>(null)

  const connection = useInterlucientConnection({
    streamStarted,
    connectionConfig: {
      appId: INTERLUCENT_APP_ID,
      appVersion: INTERLUCENT_APP_VERSION,
      reconnectMode: 'recover',
      reconnectAttempts: 3,
      queueWaitTolerance: 45,
      swiftJobRequest: true,
    },
    onError: (error) => {
      console.error('❌ Connection error:', error)
      setConnectionError(error)
      setShowLoadingScreen(false)
    },
    onConnected: (isFirstConnection) => {
      console.log('✅ Connected!', isFirstConnection ? '(first)' : '(reconnect)')
      setShowLoadingScreen(false)
      setConnectionError(null)
    },
    onSessionEnd: (reason) => {
      console.log('🔌 Session ended:', reason)
    },
    onDataChannelOpen: () => {
      console.log('📡 Data channel open - ready to communicate with UE5')
    },
  })

  // =========================================================================
  // Message Bus (backward compatible with string format)
  // =========================================================================

  const messageBus = useInterlucientMessageBus(
    connection.streamRef,
    connection.isDataChannelOpen,
    { debug: true }
  )

  // =========================================================================
  // Start Stream Handler
  // =========================================================================

  const handleStartStream = useCallback(async () => {
    console.log('🚀 Starting Interlucent stream')
    setShowStarterScreen(false)
    setShowLoadingScreen(true)
    setStreamStarted(true)

    // play() must be called from user gesture for browser autoplay policy
    // We'll call it after token is fetched and set
  }, [])

  // Track if we've already called play() to avoid calling it during recovery
  const hasCalledPlayRef = useRef(false)

  // Call play() when token is ready and we've started - but only ONCE
  useEffect(() => {
    // Only call play() if:
    // 1. Stream has started (user clicked start)
    // 2. We have a token
    // 3. The stream ref is available
    // 4. We haven't already called play()
    // 5. We're in a state where play() is appropriate (idle or connected, not recovering)
    const status = connection.interlucientStatus
    const shouldCallPlay =
      streamStarted &&
      connection.admissionToken &&
      connection.streamRef.current &&
      !hasCalledPlayRef.current &&
      (status === 'idle' || status === 'connected' || status === null)

    if (shouldCallPlay) {
      console.log('🎮 Calling play() after token ready (initial connection)')
      hasCalledPlayRef.current = true
      connection.play().catch((err) => {
        console.error('Play failed:', err)
        // Reset so we can try again if user retries
        hasCalledPlayRef.current = false
      })
    }
  }, [streamStarted, connection.admissionToken, connection.interlucientStatus, connection])

  // Reset the play flag when stream is stopped/reset
  useEffect(() => {
    if (!streamStarted) {
      hasCalledPlayRef.current = false
    }
  }, [streamStarted])

  // =========================================================================
  // Loading Status
  // =========================================================================

  const loadingStatus = useMemo(() => getLoadingStatus({
    interlucientStatus: connection.interlucientStatus,
    connectionStatus: connection.connectionStatus,
    isTokenLoading: connection.isTokenLoading,
  }), [connection.interlucientStatus, connection.connectionStatus, connection.isTokenLoading])

  // =========================================================================
  // Idle Detection
  // =========================================================================

  const { isIdle, resetIdle } = useIdleDetection({
    idleTimeout: 5 * 60 * 1000, // 5 minutes
    enabled: connection.isConnected,
  })

  // =========================================================================
  // Demo Training State (simplified for now)
  // =========================================================================

  const [explosionValue, setExplosionValue] = useState(0)
  const [selectedTool, setSelectedTool] = useState<string>('None')

  // Demo message handlers
  const handleSelectTool = useCallback((tool: string) => {
    setSelectedTool(tool)
    messageBus.sendMessage('tool_select', tool)
  }, [messageBus])

  const handleSetExplosion = useCallback((value: number) => {
    setExplosionValue(value)
    messageBus.sendMessage('explosion_control', String(value))
  }, [messageBus])

  // =========================================================================
  // Force dark background
  // =========================================================================

  const forcesDarkBg = showStarterScreen || showLoadingScreen

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div
      className={`h-screen w-screen relative overflow-hidden ${
        forcesDarkBg ? 'bg-[#1E1E1E]' : isDark ? 'bg-[#1E1E1E]' : 'bg-gray-100'
      }`}
    >
      {/* Interlucent Stream Component */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
      >
        <InterlucientStream
          ref={connection.streamRef}
          admissionToken={connection.admissionToken || undefined}
          controls={false} // We use custom overlay
          reconnectMode="recover"
          reconnectAttempts={-1} // Unlimited retries for testing
          reconnectStrategy="exponential-backoff"
          queueWaitTolerance={120} // 2 min for GPU availability
          webrtcNegotiationTolerance={30} // 30s for WebRTC setup
          swiftJobRequest={true}
          flexiblePresenceAllowance={300} // 5 min reconnection grace
          rendezvousTolerance={60} // 1 min for GPU worker connection
          lingerTolerance={60} // 1 min - keep worker alive if browser drops
          forceTurn={true} // Force TURN relay to avoid firewall issues
          onStatusChange={connection.handleStatusChange}
          onDataChannelOpen={connection.handleDataChannelOpen}
          onMessage={messageBus.handleIncomingMessage}
          onSessionEnded={connection.handleSessionEnded}
          onError={connection.handleError}
        />
      </div>

      {/* Unified Sidebar - Show when connected */}
      {connection.isConnected && (
        <UnifiedSidebar
          mode={isCinematicMode ? 'cinematic' : 'training'}
          isVisible={true}
          // Explosion Controls
          explosionValue={explosionValue}
          onExplosionValueChange={handleSetExplosion}
          onExplode={() => messageBus.sendMessage('explosion_control', 'explode')}
          onAssemble={() => messageBus.sendMessage('explosion_control', 'assemble')}
          // Placeholder props (would be connected to real hooks)
          waypoints={[]}
          activeWaypointIndex={-1}
          activeWaypointName=""
          onRefreshWaypoints={() => messageBus.sendMessage('waypoint_control', 'list')}
          onActivateWaypoint={() => {}}
          onDeactivateWaypoint={() => {}}
          onWaypointProgressChange={() => {}}
          cameraPerspective="IsometricNE"
          cameraMode="Manual"
          onSetCameraPerspective={(p) => messageBus.sendMessage('camera_control', p)}
          onToggleAutoOrbit={() => messageBus.sendMessage('camera_control', 'orbit_start')}
          onResetCamera={() => messageBus.sendMessage('camera_control', 'reset')}
          hierarchicalGroups={[]}
          onRefreshLayers={() => messageBus.sendMessage('hierarchical_control', 'list')}
          onToggleMainGroup={() => {}}
          onToggleChildGroup={() => {}}
          onShowAllLayers={() => messageBus.sendMessage('hierarchical_control', 'show_all')}
          onHideAllLayers={() => messageBus.sendMessage('hierarchical_control', 'hide_all')}
          // Training controls (placeholder)
          isPaused={false}
          onPause={() => messageBus.sendMessage('training_control', 'pause')}
          onResume={() => messageBus.sendMessage('training_control', 'start')}
          onQuit={() => console.log('Quit clicked')}
          // Stream health
          onReconnectStream={connection.reconnect}
          isReconnecting={connection.isRetrying}
          streamHealthStatus="healthy"
          // Placeholder for training state
          trainingState={{} as any}
          onSelectPipe={() => {}}
          onSelectPressureTest={() => {}}
          // Settings (placeholder)
          settingsState={{
            audioEnabled: true,
            masterVolume: 1,
            ambientVolume: 1,
            sfxVolume: 1,
            graphicsQuality: 'High',
            resolution: '1080p',
            bandwidthOption: 'Auto',
            fpsTrackingEnabled: false,
            currentFps: 0,
            showFpsOverlay: false,
          }}
          settingsCallbacks={{
            setAudioEnabled: () => {},
            setMasterVolume: () => {},
            setAmbientVolume: () => {},
            setSfxVolume: () => {},
            setGraphicsQuality: () => {},
            setResolution: () => {},
            setBandwidthOption: () => {},
            setShowFpsOverlay: () => {},
          }}
          streamQuality="medium"
          streamQualityOptions={[]}
          onStreamQualityChange={() => {}}
        />
      )}

      {/* Control Panel - Show when connected and NOT in cinematic mode */}
      {connection.isConnected && !isCinematicMode && (
        <ControlPanel
          isDark={isDark}
          onSelectTool={handleSelectTool}
          onSelectPipe={() => {}}
          onSelectPressureTest={() => {}}
        />
      )}

      {/* Message Log - Show when connected */}
      {connection.isConnected && (
        <MessageLog
          messages={messageBus.messageLog}
          lastMessage={messageBus.lastMessage}
          onClear={messageBus.clearLog}
          onSendTest={(msg) => messageBus.sendRawMessage(msg)}
          isConnected={connection.isDataChannelOpen}
          connectionStatus={connection.isConnected ? 'connected' : 'connecting'}
          isDark={isDark}
        />
      )}

      {/* Starter Screen */}
      <StarterScreen
        isOpen={showStarterScreen}
        title="Interlucent Streaming"
        subtitle="Click the button below to begin (Interlucent mode)"
        onStart={handleStartStream}
        buttonText="Start"
      />

      {/* Loading Screen */}
      <LoadingScreen
        isOpen={showLoadingScreen && !connection.isConnected}
        title="Please Wait!"
        subtitle="Session is loading (Interlucent)"
        statusMessage={loadingStatus.message}
        currentStep={loadingStatus.step}
        retryCount={0}
        maxRetries={RETRY_CONFIG.maxRetries}
        showRetryInfo={false}
      />

      {/* Mode Toggle Button (for testing) */}
      {connection.isConnected && (
        <button
          onClick={() => setIsCinematicMode(!isCinematicMode)}
          className="fixed bottom-4 right-4 z-50 px-4 py-2 bg-purple-600 text-white rounded-lg shadow-lg hover:bg-purple-700"
        >
          Mode: {isCinematicMode ? 'Cinematic' : 'Training'}
        </button>
      )}

      {/* Connection Error Modal */}
      {connectionError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-gray-900 border border-red-500 rounded-lg p-6 max-w-md mx-4">
            <h2 className="text-xl font-bold text-red-500 mb-4">Connection Failed</h2>
            <p className="text-gray-300 mb-4">{connectionError}</p>
            <div className="text-sm text-gray-400 mb-4">
              <p className="mb-2">This usually means:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>The admission token is invalid or expired</li>
                <li>Missing App ID configuration</li>
                <li>SDK access not yet available</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setConnectionError(null)
                  setShowStarterScreen(true)
                  setStreamStarted(false)
                }}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                Back
              </button>
              <button
                onClick={() => {
                  setConnectionError(null)
                  connection.reconnect()
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 left-4 z-50 p-4 bg-black/80 text-white text-xs font-mono rounded-lg max-w-xs">
          <div className="mb-2 font-bold text-green-400">Interlucent Debug</div>
          <div>Status: {connection.interlucientStatus || 'null'}</div>
          <div>Connected: {connection.isConnected ? '✅' : '❌'}</div>
          <div>Data Channel: {connection.isDataChannelOpen ? '✅' : '❌'}</div>
          <div>Token: {connection.admissionToken ? '✅' : '❌'}</div>
          <div>Token Mode: {connection.admissionToken?.startsWith('eyJ') ? 'JWT' : 'mock'}</div>
          <div>Session: {connection.sessionId || 'none'}</div>
          {connection.failureReason && (
            <div className="text-red-400 mt-2">Error: {connection.failureReason}</div>
          )}
        </div>
      )}
    </div>
  )
}
