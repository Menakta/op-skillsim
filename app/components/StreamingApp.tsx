'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import {
  PlatformNext,
  ModelDefinition,
  UndefinedModelDefinition,
  DefaultStreamerOptions,
  StreamerStatus
} from '@pureweb/platform-sdk'
import {
  useStreamer,
  useLaunchRequest,
  VideoStream
} from '@pureweb/platform-sdk-react'

// Theme support
import { useTheme } from '../context/ThemeContext'

// Feature imports - New modular components
import { QuestionModal } from '../features/questions'
import { CompletionPopup } from '../features/training'
import { LoadingOverlay } from '../features/streaming'
import { StatusBar } from '../components/layout'
import ControlPanel from '../components/ControlPanel'
import MessageLog from '../components/MessageLog'
import { TrainingWalkthrough } from '../components/ui/WalkThrough/TrainingWalkthrough'

// New composite hook that uses all the modular hooks
import { useTrainingMessagesComposite } from '../hooks/useTrainingMessagesComposite'
import type { QuestionData } from '../lib/messageTypes'

// =============================================================================
// Configuration
// =============================================================================

const projectId = '94adc3ba-7020-49f0-9a7c-bb8f1531536a'
const modelId = '26c1dfea-9845-46bb-861d-fb90a22b28df'

// Retry configuration
const MAX_RETRIES = 3
const RETRY_DELAY = 2000 // 2 seconds between retries

// Streamer options
const streamerOptions = DefaultStreamerOptions

// =============================================================================
// Main Streaming App Component - Using New Modular Architecture
// =============================================================================

export default function StreamingApp() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  // Platform ref - persists across renders
  const platformRef = useRef<PlatformNext | null>(null)

  // Initialize platform on first render
  if (!platformRef.current) {
    platformRef.current = new PlatformNext()
    platformRef.current.initialize({ endpoint: 'https://api.pureweb.io' })
  }

  // Platform state
  const [modelDefinition, setModelDefinition] = useState<ModelDefinition>(new UndefinedModelDefinition())
  const [availableModels, setAvailableModels] = useState<ModelDefinition[]>()
  const [loading, setLoading] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)

  // Retry state
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'initializing' | 'connecting' | 'connected' | 'failed' | 'retrying'>('initializing')

  // UI state
  const [showingQuestion, setShowingQuestion] = useState<QuestionData | null>(null)
  const [showCompletionPopup, setShowCompletionPopup] = useState(false)
  const [showWalkthrough, setShowWalkthrough] = useState(false)
  const [hasSeenWalkthrough, setHasSeenWalkthrough] = useState(false)

  // Check if user has seen walkthrough before
  useEffect(() => {
    const seen = localStorage.getItem('hasSeenWalkthrough')
    if (!seen) {
      setShowWalkthrough(true)
    } else {
      setHasSeenWalkthrough(true)
    }
  }, [])

  // ==========================================================================
  // Platform Initialization with Retry Logic
  // ==========================================================================

  const initializePlatform = useCallback(async (attempt: number = 1) => {
    try {
      console.log(`🚀 Initializing with project (attempt ${attempt}/${MAX_RETRIES}):`, projectId)
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

      if (attempt < MAX_RETRIES) {
        console.log(`⏳ Retrying in ${RETRY_DELAY / 1000} seconds...`)
        setRetryCount(attempt)
        setTimeout(() => {
          initializePlatform(attempt + 1)
        }, RETRY_DELAY)
      } else {
        setInitError(String(err))
        setConnectionStatus('failed')
        setIsRetrying(false)
      }
    }
  }, [])

  useEffect(() => {
    initializePlatform(1)
  }, [initializePlatform])

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
  }, [availableModels])

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
  // NEW: Composite Training Hook (uses all modular hooks internally)
  // ==========================================================================

  const training = useTrainingMessagesComposite(emitter, messageSubject, {
    onQuestionRequest: (questionId, question) => {
      console.log('❓ Question requested:', questionId)
      setShowingQuestion(question)
    },
    onTrainingProgress: (data) => {
      console.log('📊 Progress:', data.progress + '%', data.taskName, data.phase)
    },
    onTrainingComplete: (progress, currentTask, totalTasks) => {
      console.log('🎉 Training Complete!', { progress, currentTask, totalTasks })
      setShowCompletionPopup(true)
    },
    onTaskCompleted: (taskId) => {
      console.log('✅ Task completed:', taskId)
    },
    onTaskStart: (toolName) => {
      console.log('🚀 Task started:', toolName)
    },
    onToolChange: (toolName) => {
      console.log('🔧 Tool changed to:', toolName)
    },
    onMessage: (message) => {
      console.log('📨 Message:', message.type, message.dataString)
    }
  }, {
    debug: true
  })

  // ==========================================================================
  // Launch
  // ==========================================================================

  const launch = useCallback(async () => {
    console.log('🚀 Launch clicked')
    setLoading(true)
    try {
      await queueLaunchRequest()
    } catch (err) {
      console.error('❌ Launch failed:', err)
      setInitError(String(err))
    }
  }, [queueLaunchRequest])

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

  // Handle streamer status changes
  useEffect(() => {
    if (streamerStatus === StreamerStatus.Connected) {
      setConnectionStatus('connected')
      setRetryCount(0)
    } else if (streamerStatus === StreamerStatus.Failed) {
      console.log('❌ Streamer failed, attempting to reconnect...')
      setConnectionStatus('failed')

      try {
        platformRef.current?.disconnect()
      } catch (e) {
        console.log('Disconnect error (ignored):', e)
      }

      // Auto-retry on stream failure if we haven't exceeded retries
      if (retryCount < MAX_RETRIES) {
        setTimeout(() => {
          console.log(`🔄 Auto-retry after stream failure (${retryCount + 1}/${MAX_RETRIES})`)
          setRetryCount(prev => prev + 1)
          setAvailableModels(undefined)
          setModelDefinition(new UndefinedModelDefinition())
          setLoading(false)
          setInitError(null)
          initializePlatform(retryCount + 1)
        }, RETRY_DELAY)
      }
    }
  }, [streamerStatus, retryCount, initializePlatform])

  // ==========================================================================
  // Initial Data Request (after connection)
  // ==========================================================================

  useEffect(() => {
    if (streamerStatus === StreamerStatus.Connected) {
      console.log('📤 Connection established - Requesting initial data from UE5...')
      setTimeout(() => {
        training.testConnection()
        training.refreshWaypoints()
        training.refreshHierarchicalLayers()
        console.log('📤 Initial data requests sent')
      }, 1000)
    }
  }, [streamerStatus])

  // ==========================================================================
  // Question Handlers
  // ==========================================================================

  const handleSubmitAnswer = useCallback((selectedAnswer: number) => {
    return training.submitQuestionAnswer(selectedAnswer)
  }, [training])

  const handleCloseQuestion = useCallback(() => {
    training.closeQuestion()
    setShowingQuestion(null)
  }, [training])

  // ==========================================================================
  // Message Log Handlers
  // ==========================================================================

  const handleSendTestMessage = useCallback((message: string) => {
    training.sendRawMessage(message)
  }, [training])

  // ==========================================================================
  // Derived State
  // ==========================================================================

  const isConnected = streamerStatus === StreamerStatus.Connected

  // ==========================================================================
  // Walkthrough Handler
  // ==========================================================================

  const handleWalkthroughComplete = useCallback(() => {
    localStorage.setItem('hasSeenWalkthrough', 'true')
    setShowWalkthrough(false)
    setHasSeenWalkthrough(true)
  }, [])

  // ==========================================================================
  // Manual Retry Handler
  // ==========================================================================

  const handleManualRetry = useCallback(() => {
    setInitError(null)
    setRetryCount(0)
    setAvailableModels(undefined)
    setModelDefinition(new UndefinedModelDefinition())
    setLoading(false)
    setConnectionStatus('initializing')
    initializePlatform(1)
  }, [initializePlatform])

  // ==========================================================================
  // Error State
  // ==========================================================================

  if (initError) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="text-center space-y-4 max-w-md px-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Connection Failed</h2>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {initError}
          </p>
          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            Attempted {MAX_RETRIES} automatic retries
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={handleManualRetry}
              className="px-6 py-2.5 bg-[#39BEAE] hover:bg-[#2ea89a] text-white rounded-lg transition-colors font-medium"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className={`px-6 py-2.5 rounded-lg transition-colors font-medium ${
                isDark
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ==========================================================================
  // Loading State (waiting for models)
  // ==========================================================================

  if (!availableModels) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="text-center space-y-4">
          <div className="w-14 h-14 mx-auto border-4 border-[#39BEAE] border-t-transparent rounded-full animate-spin" />
          <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {isRetrying ? 'Reconnecting...' : 'Connecting to Stream...'}
          </p>
          {retryCount > 0 && (
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Retry attempt {retryCount}/{MAX_RETRIES}
            </p>
          )}
          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            This may take a few moments
          </p>
        </div>
      </div>
    )
  }

  // ==========================================================================
  // Main Render - Using New Modular Components
  // ==========================================================================

  return (
    <div className={`h-screen w-screen relative overflow-hidden ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {/* Walkthrough Overlay - Shows for first-time users */}
      {showWalkthrough && (
        <TrainingWalkthrough
          onComplete={handleWalkthroughComplete}
          onSkip={handleWalkthroughComplete}
        />
      )}

      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="fixed top-5 left-5 z-50 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all"
        style={{
          zIndex: 2147483647,
          backgroundColor: isDark ? '#374151' : '#e5e7eb'
        }}
        title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      >
        {isDark ? (
          <span className="text-yellow-400 text-lg">☀️</span>
        ) : (
          <span className="text-gray-700 text-lg">🌙</span>
        )}
      </button>

      {/* Help Button - Show Walkthrough Again */}
      {hasSeenWalkthrough && !showWalkthrough && (
        <button
          onClick={() => setShowWalkthrough(true)}
          className="fixed top-5 left-18 z-50 px-3 py-2 rounded-full text-sm font-medium shadow-lg transition-all"
          style={{
            zIndex: 2147483647,
            left: '4.5rem',
            backgroundColor: '#39BEAE',
            color: 'white'
          }}
          title="Show tutorial"
        >
          ?
        </button>
      )}

      {/* Status Bar - New Component */}
     
      {/* Control Panel - New Modular Version with Tabs */}
      <ControlPanel
        state={training.state}
        isConnected={training.isConnected || isConnected}
        isDark={isDark}
        onStartTraining={training.startTraining}
        onPauseTraining={training.pauseTraining}
        onResetTraining={training.resetTraining}
        onSelectTool={training.selectTool}
        onSelectPipe={training.selectPipe}
        onSelectPressureTest={training.selectPressureTest}
        onSetCameraPerspective={training.setCameraPerspective}
        onToggleAutoOrbit={training.toggleAutoOrbit}
        onResetCamera={training.resetCamera}
        onSetExplosionLevel={training.setExplosionLevel}
        onExplodeBuilding={training.explodeBuilding}
        onAssembleBuilding={training.assembleBuilding}
        onRefreshWaypoints={training.refreshWaypoints}
        onActivateWaypoint={training.activateWaypoint}
        onDeactivateWaypoint={training.deactivateWaypoint}
        onRefreshLayers={training.refreshLayers}
        onRefreshHierarchicalLayers={training.refreshHierarchicalLayers}
        onToggleLayer={training.toggleLayer}
        onShowAllLayers={training.showAllLayers}
        onHideAllLayers={training.hideAllLayers}
        onToggleMainGroup={training.toggleMainGroup}
        onToggleChildGroup={training.toggleChildGroup}
        onQuitApplication={training.quitApplication}
      />

      {/* Message Log */}
      <MessageLog
        messages={training.messageLog}
        lastMessage={training.lastMessage}
        onClear={training.clearLog}
        onSendTest={handleSendTestMessage}
        isConnected={training.isConnected || isConnected}
        connectionStatus={training.isConnected ? 'connected' : isConnected ? 'connected' : 'connecting'}
        isDark={isDark}
      />

      {/* Loading Overlay - New Component */}
      <LoadingOverlay
        streamerStatus={streamerStatus}
        launchStatus={launchStatus.status}
        isVisible={!isConnected}
      />

      {/* Video Stream */}
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

      {/* Question Modal - New Component */}
      <QuestionModal
        question={showingQuestion}
        tryCount={training.state.questionTryCount}
        onSubmitAnswer={handleSubmitAnswer}
        onClose={handleCloseQuestion}
      />

      {/* Completion Popup - New Component */}
      <CompletionPopup
        isVisible={showCompletionPopup}
        totalTasks={training.state.totalTasks}
        progress={training.state.progress}
        onReset={training.resetTraining}
        onClose={() => setShowCompletionPopup(false)}
      />

      {/* Video Styles */}
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
    </div>
  )
}
