'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import {PlatformNext,ModelDefinition, UndefinedModelDefinition,DefaultStreamerOptions,StreamerStatus} from '@pureweb/platform-sdk'
import {useStreamer,useLaunchRequest,VideoStream} from '@pureweb/platform-sdk-react'

// Feature imports - New modular components
import { QuestionModal, useQuestions } from '../features/questions'
import { CompletionPopup } from '../features/training'
// LoadingOverlay removed - using LoadingScreen instead
import { StatusBar } from '../components/layout'
import {SessionModal,SuccessModal,ErrorModal} from '../features'
import { LoadingScreen ,StarterScreen,NavigationWalkthrough} from '../features'
import ControlPanel from '../components/ControlPanel'
import MessageLog from '../components/MessageLog'

// New composite hook that uses all the modular hooks
import { useTrainingMessagesComposite } from '../hooks/useTrainingMessagesComposite'
import type { QuestionData } from '../lib/messageTypes'
import { TASK_SEQUENCE } from '../config'

// Redux sync - bridges hook state to Redux store
import { useReduxSync } from '../store/useReduxSync'

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
  const isDark = true // Default to dark theme

  // Questions context - for getting total question count
  const { questionCount } = useQuestions()

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
  const [sessionStartTime] = useState<number>(() => Date.now()) // Track when session started
  const [showPhaseSuccess, setShowPhaseSuccess] = useState(false)
  const [completedPhase, setCompletedPhase] = useState<{ taskId: string; taskName: string; nextTaskIndex: number } | null>(null)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [showStarterScreen, setShowStarterScreen] = useState(true)
  const [showNavigationWalkthrough, setShowNavigationWalkthrough] = useState(false)
  const [streamStarted, setStreamStarted] = useState(false)

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
        setShowErrorModal(true)
      }
    }
  }, [])

  // Only initialize platform when stream is started by user
  useEffect(() => {
    if (streamStarted) {
      initializePlatform(1)
    }
  }, [streamStarted, initializePlatform])

  // Handler for closing navigation walkthrough
  const handleCloseNavigationWalkthrough = useCallback(() => {
    setShowNavigationWalkthrough(false)
  }, [])

  // Handler for starting the stream
  const handleStartStream = useCallback(() => {
    setShowStarterScreen(false)
    setStreamStarted(true)
  }, [])

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
    onTaskCompleted: (taskId, nextTaskIndex) => {
      console.log('✅ Task completed:', taskId, 'Next task index:', nextTaskIndex)
      console.log('📋 TASK_SEQUENCE:', TASK_SEQUENCE)

      // Find the completed task - try matching by taskId first, then by index
      let completedTaskDef = TASK_SEQUENCE.find(t => t.taskId === taskId)

      // If not found by taskId, use the previous task index (since nextTaskIndex is already incremented)
      if (!completedTaskDef && nextTaskIndex > 0 && nextTaskIndex <= TASK_SEQUENCE.length) {
        completedTaskDef = TASK_SEQUENCE[nextTaskIndex - 1]
        console.log('📋 Found task by index:', completedTaskDef)
      }

      // Show modal if we found the task and there are more tasks
      if (completedTaskDef && nextTaskIndex < TASK_SEQUENCE.length) {
        console.log('🎉 Showing phase success modal for:', completedTaskDef.name)
        setCompletedPhase({
          taskId: completedTaskDef.taskId,
          taskName: completedTaskDef.name,
          nextTaskIndex
        })
        setShowPhaseSuccess(true)
      } else {
        console.log('⚠️ Not showing modal - completedTaskDef:', completedTaskDef, 'nextTaskIndex:', nextTaskIndex, 'total:', TASK_SEQUENCE.length)
      }
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

  // Sync training state to Redux store
  // This allows child components to use Redux selectors instead of props
  useReduxSync(training)

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
      // Show navigation walkthrough when stream is connected
      setShowNavigationWalkthrough(true)
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
  // Submit Quiz Results when training completes
  // ==========================================================================

  useEffect(() => {
    console.log('📝 [StreamingApp] Quiz submit effect triggered:', {
      showCompletionPopup,
      quizAnswersLength: training.quizAnswers.length,
      quizAnswers: training.quizAnswers,
      questionCount
    })

    if (showCompletionPopup) {
      // Submit quiz results to quiz_responses table
      if (training.quizAnswers.length > 0) {
        console.log('📝 [StreamingApp] Submitting quiz results...')
        training.submitQuizResults(questionCount).then(saved => {
          if (saved) {
            console.log('✅ [StreamingApp] Quiz results saved to Supabase')
          } else {
            console.warn('⚠️ [StreamingApp] Failed to save quiz results')
          }
        })
      }

      // Also complete training session with all data
      import('@/app/services').then(({ trainingSessionService }) => {
        import('@/app/types').then(({ buildQuestionDataMap }) => {
          const quizData = training.quizAnswers.length > 0
            ? buildQuestionDataMap(training.quizAnswers)
            : undefined

          trainingSessionService.completeTraining({
            totalTimeMs: Date.now() - (sessionStartTime || Date.now()),
            phasesCompleted: training.state.totalTasks,
            quizData,
            totalQuestions: questionCount,
          }).then(result => {
            if (result.success) {
              console.log('✅ [StreamingApp] Training session completed in database')
            } else {
              console.warn('⚠️ [StreamingApp] Failed to complete training session:', result.error)
            }
          })
        })
      })
    }
  }, [showCompletionPopup, training.quizAnswers.length, questionCount, training, sessionStartTime])

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
  // Phase Success Handlers
  // ==========================================================================

  const handlePhaseContinue = useCallback(() => {
    setShowPhaseSuccess(false)
    // Auto-advance to next task if available
    if (completedPhase && completedPhase.nextTaskIndex < TASK_SEQUENCE.length) {
      const nextTask = TASK_SEQUENCE[completedPhase.nextTaskIndex]
      training.selectTool(nextTask.tool)
    }
    setCompletedPhase(null)
  }, [completedPhase, training])

  const handlePhaseRetry = useCallback(() => {
    setShowPhaseSuccess(false)
    // Re-select the same tool to retry the phase
    if (completedPhase) {
      const currentTaskDef = TASK_SEQUENCE.find(t => t.taskId === completedPhase.taskId)
      if (currentTaskDef) {
        training.selectTool(currentTaskDef.tool)
      }
    }
    setCompletedPhase(null)
  }, [completedPhase, training])

  // ==========================================================================
  // Training Complete Handler - Reset to Starter Screen
  // ==========================================================================

  const handleTrainingCompleteReset = useCallback(() => {
    setShowCompletionPopup(false)
    training.resetTraining()

    // Reset to starter screen
    setShowNavigationWalkthrough(false)
    setShowStarterScreen(true)
    setStreamStarted(false)

    // Reset connection state
    setAvailableModels(undefined)
    setModelDefinition(new UndefinedModelDefinition())
    setLoading(false)
    setConnectionStatus('initializing')
    setRetryCount(0)
    setInitError(null)

    // Disconnect platform
    try {
      platformRef.current?.disconnect()
    } catch (e) {
      console.log('Disconnect error (ignored):', e)
    }

    // Reinitialize platform for next session
    platformRef.current = new PlatformNext()
    platformRef.current.initialize({ endpoint: 'https://api.pureweb.io' })
  }, [training])

  // ==========================================================================
  // Derived State
  // ==========================================================================

  const isConnected = streamerStatus === StreamerStatus.Connected

  // ==========================================================================
  // Manual Retry Handler
  // ==========================================================================

  const handleManualRetry = useCallback(() => {
    setShowErrorModal(false)
    setInitError(null)
    setRetryCount(0)
    setAvailableModels(undefined)
    setModelDefinition(new UndefinedModelDefinition())
    setLoading(false)
    setConnectionStatus('initializing')
    initializePlatform(1)
  }, [initializePlatform])

  // ==========================================================================
  // Error State Handler (for refresh page action)
  // ==========================================================================

  const handleRefreshPage = useCallback(() => {
    window.location.reload()
  }, [])

  // ==========================================================================
  // Loading Status Message
  // ==========================================================================

  const getLoadingStatusMessage = () => {
    if (isRetrying) return 'Reconnecting to stream'

    // Check streamer status first for more accurate messages
    if (streamerStatus === StreamerStatus.Connected) {
      return 'Establishing video stream'
    }

    switch (connectionStatus) {
      case 'initializing':
        return 'Initializing'
      case 'connecting':
        if (availableModels) {
          return 'Launching session'
        }
        return 'Connecting to server'
      case 'retrying':
        return 'Retrying connection'
      default:
        if (loading) {
          return 'Starting stream'
        }
        return 'Loading session'
    }
  }

  // Show loading screen after user starts stream and until fully connected
  const showLoadingScreen = streamStarted && !isConnected && !showErrorModal

  // ==========================================================================
  // Main Render - Using New Modular Components
  // ==========================================================================

  return (
    <div className={`h-screen w-screen relative overflow-hidden ${isDark ? 'bg-[#1E1E1E]' : 'bg-gray-100'}`}>
      {/* Control Panel - Only show when stream is connected */}
      {/* State is now read from Redux via useReduxSync above */}
      {isConnected && (
        <ControlPanel
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
      )}

      {/* Message Log - Only show when stream is connected */}
      {isConnected && (
        <MessageLog
          messages={training.messageLog}
          lastMessage={training.lastMessage}
          onClear={training.clearLog}
          onSendTest={handleSendTestMessage}
          isConnected={training.isConnected || isConnected}
          connectionStatus={training.isConnected ? 'connected' : isConnected ? 'connected' : 'connecting'}
          isDark={isDark}
        />
      )}


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
        onReset={handleTrainingCompleteReset}
        onClose={handleTrainingCompleteReset}
      />

      {/* Phase Success Modal */}
      <SuccessModal
        isOpen={showPhaseSuccess}
        title={completedPhase ? completedPhase.taskName + ' Task Completed' : 'Task Completed'}
        message={completedPhase ? `Success!` : ''}
        successText={completedPhase ? `${completedPhase.taskName} Task completed successfully!` : 'Phase completed successfully!'}
        onContinue={handlePhaseContinue}
        onRetry={handlePhaseRetry}
        continueButtonText="Continue"
        retryButtonText="Retry"
        showRetryButton={true}
      />

      {/* Stream Error Modal */}
      <ErrorModal
        isOpen={showErrorModal}
        title="Connection Failed"
        message="Error!"
        errorText={initError || `Unable to connect to stream. Attempted ${MAX_RETRIES} automatic retries.`}
        onRetry={handleManualRetry}
        onClose={handleRefreshPage}
        retryButtonText="Try Again"
        closeButtonText="Refresh Page"
        showCloseButton={true}
      />

      {/* Navigation Walkthrough - Show first when app opens */}
      <NavigationWalkthrough
        isOpen={showNavigationWalkthrough}
        onClose={handleCloseNavigationWalkthrough}
      />

      {/* Starter Screen - Show after navigation walkthrough is closed */}
      <StarterScreen
        isOpen={showStarterScreen}
        title="Start exercise"
        subtitle="Click the button below to begin your training session"
        onStart={handleStartStream}
        buttonText="Start Session"
      />

      {/* Loading Screen - Show after user clicks start until stream is connected */}
      <LoadingScreen
        isOpen={showLoadingScreen}
        title="Please Wait!"
        subtitle="Session is loading"
        statusMessage={getLoadingStatusMessage()}
        retryCount={retryCount}
        maxRetries={MAX_RETRIES}
        showRetryInfo={retryCount > 0}
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
