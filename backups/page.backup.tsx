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
import MessageLog from './components/MessageLog'
import { useTrainingMessages } from './hooks/useTrainingMessages'
import type { QuestionData } from './lib/messageTypes'

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

  // Quiz display state (matching player(2).html showQuestion/hideQuestion)
  const [showingQuestion, setShowingQuestion] = useState<QuestionData | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [answerFeedback, setAnswerFeedback] = useState<{ correct: boolean; message: string } | null>(null)

  // Training complete popup state
  const [showCompletionPopup, setShowCompletionPopup] = useState(false)

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
  const [launchStatus, launchRequest, queueLaunchRequest] = useLaunchRequest(
    platform,
    modelDefinition,
    {}
  )

  // useStreamer returns: [status, emitter, videoStream, audioStream, messageSubject]
  const [streamerStatus, emitter, videoStream, audioStream, messageSubject] = useStreamer(
    platform,
    launchRequest,
    streamerOptions
  )

  // ==========================================================================
  // BIDIRECTIONAL MESSAGING - Using useTrainingMessages hook
  // Matching player(2).html initialization and message handling
  // ==========================================================================
  const training = useTrainingMessages(emitter, messageSubject, {
    // Question callback - show the question modal (matching player(2).html showQuestion)
    onQuestionRequest: (questionId, question) => {
      console.log('🎯 Question requested:', questionId)
      setShowingQuestion(question)
      setSelectedAnswer(null)
      setAnswerFeedback(null)
    },

    // Training progress callback
    onTrainingProgress: (data) => {
      console.log('📊 Progress:', data.progress + '%', data.taskName, data.phase)
    },

    // Training complete callback
    onTrainingComplete: (progress, currentTask, totalTasks) => {
      console.log('🎉 Training Complete!', { progress, currentTask, totalTasks })
      setShowCompletionPopup(true)
    },

    // Task callbacks
    onTaskCompleted: (taskId) => {
      console.log('✅ Task completed:', taskId)
    },

    onTaskStart: (toolName) => {
      console.log('🚀 Task started:', toolName)
    },

    // Tool callback
    onToolChange: (toolName) => {
      console.log('🔧 Tool changed to:', toolName)
    },

    // Generic message callback
    onMessage: (message) => {
      console.log('📨 Message:', message.type, message.dataString)
    }
  }, {
    debug: true
  })

  // ==========================================================================
  // LAUNCH
  // ==========================================================================

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

  // Auto-launch when model is ready
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

  // ==========================================================================
  // INITIALIZATION - Matching player(2).html window.onload behavior
  // ==========================================================================
  useEffect(() => {
    if (streamerStatus === StreamerStatus.Connected) {
      // Request initial data after connection (matching player(2).html)
      console.log('📤 Connection established - Requesting initial data from UE5...')

      setTimeout(() => {
        // Send test connection
        training.testConnection()

        // Request waypoint list
        training.refreshWaypoints()

        // Request hierarchical layer list
        training.refreshHierarchicalLayers()

        console.log('📤 Initial data requests sent')
      }, 1000)
    }
  }, [streamerStatus])

  // ==========================================================================
  // QUESTION HANDLING (matching player(2).html submitAnswer, hideQuestion)
  // ==========================================================================

  const handleAnswerSubmit = useCallback(() => {
    if (selectedAnswer === null || !showingQuestion) return

    // Submit answer and get result
    const result = training.submitQuestionAnswer(selectedAnswer)

    if (result?.correct) {
      setAnswerFeedback({
        correct: true,
        message: 'Correct! ' + showingQuestion.explanation
      })

      // For Q6, don't auto-close - user must click Close button
      // Matching player(2).html: "User must manually close Q6 to trigger pressure test"
      if (showingQuestion.id !== 'Q6') {
        // Auto-close after showing correct feedback (except Q6)
        setTimeout(() => {
          handleCloseQuestion()
        }, 2500)
      }
    } else {
      setAnswerFeedback({
        correct: false,
        message: result?.message || 'Incorrect. Try again!'
      })
      setSelectedAnswer(null)
    }
  }, [selectedAnswer, showingQuestion, training])

  // Close question handler (matching player(2).html hideQuestion)
  const handleCloseQuestion = useCallback(() => {
    console.log('Closing question modal')

    // This will trigger the Q6 special handling in the hook
    training.closeQuestion()

    // Clear local state
    setShowingQuestion(null)
    setSelectedAnswer(null)
    setAnswerFeedback(null)
  }, [training])

  // ==========================================================================
  // MESSAGE LOG HANDLERS
  // ==========================================================================

  const handleSendTestMessage = useCallback((message: string) => {
    training.sendRawMessage(message)
  }, [training])

  const isConnected = streamerStatus === StreamerStatus.Connected

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
          <p className="text-gray-400">Connecting to Stream...</p>
        </div>
      </div>
    )
  }

  // Main view
  return (
    <div className="h-screen w-screen bg-gray-950 relative overflow-hidden">
      {/* Control Panel - Updated Props matching player(2).html flow */}
      <ControlPanel
        state={training.state}
        isConnected={training.isConnected || isConnected}
        // Training Control
        onStartTraining={training.startTraining}
        onPauseTraining={training.pauseTraining}
        onResetTraining={training.resetTraining}
        // Tool Selection (matching player(2).html selectTool)
        onSelectTool={training.selectTool}
        // Pipe Selection (matching player(2).html selectPipe)
        onSelectPipe={training.selectPipe}
        // Pressure Testing (matching player(2).html selectPressureTest)
        onSelectPressureTest={training.selectPressureTest}
        // Camera Control
        onSetCameraPerspective={training.setCameraPerspective}
        onToggleAutoOrbit={training.toggleAutoOrbit}
        onResetCamera={training.resetCamera}
        // Explosion Control
        onSetExplosionLevel={training.setExplosionLevel}
        onExplodeBuilding={training.explodeBuilding}
        onAssembleBuilding={training.assembleBuilding}
        // Waypoint Control
        onRefreshWaypoints={training.refreshWaypoints}
        onActivateWaypoint={training.activateWaypoint}
        onDeactivateWaypoint={training.deactivateWaypoint}
        // Layer Control
        onRefreshLayers={training.refreshLayers}
        onRefreshHierarchicalLayers={training.refreshHierarchicalLayers}
        onToggleLayer={training.toggleLayer}
        onShowAllLayers={training.showAllLayers}
        onHideAllLayers={training.hideAllLayers}
        onToggleMainGroup={training.toggleMainGroup}
        onToggleChildGroup={training.toggleChildGroup}
        // Application Control
        onQuitApplication={training.quitApplication}
      />

      {/* Message Log - for debugging bidirectional communication */}
      <MessageLog
        messages={training.messageLog}
        lastMessage={training.lastMessage}
        onClear={training.clearLog}
        onSendTest={handleSendTestMessage}
        isConnected={training.isConnected || isConnected}
        connectionStatus={training.isConnected ? 'connected' : isConnected ? 'connected' : 'connecting'}
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

      {/* Question Modal - Matching player(2).html question handling */}
      {showingQuestion && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#16213e] rounded-2xl p-6 max-w-lg w-full mx-4 border border-[#2c3e50] shadow-2xl">
            {/* Question Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <span className="text-blue-400 font-bold text-lg">{showingQuestion.id}</span>
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Assessment Question</h3>
                <p className="text-gray-500 text-xs">
                  Attempt {training.state.questionTryCount} - Select the correct answer
                </p>
              </div>
            </div>

            {/* Question Text */}
            <p className="text-white text-lg mb-6">{showingQuestion.text}</p>

            {/* Answer Options */}
            <div className="space-y-2 mb-4">
              {showingQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedAnswer(index)}
                  disabled={answerFeedback?.correct}
                  className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                    selectedAnswer === index
                      ? answerFeedback
                        ? answerFeedback.correct
                          ? 'bg-green-500/20 border-green-500 text-green-300'
                          : 'bg-red-500/20 border-red-500 text-red-300'
                        : 'bg-blue-500/20 border-blue-500 text-white'
                      : 'bg-[#1e2a4a] border-[#2c3e50] text-white hover:bg-[#2c3e50] hover:border-blue-500'
                  }`}
                >
                  <span className="text-blue-400 font-bold mr-3">{String.fromCharCode(65 + index)}.</span>
                  {option}
                </button>
              ))}
            </div>

            {/* Feedback Message */}
            {answerFeedback && (
              <div className={`p-3 rounded-lg mb-4 ${
                answerFeedback.correct
                  ? 'bg-green-500/20 border border-green-500/50 text-green-300'
                  : 'bg-red-500/20 border border-red-500/50 text-red-300'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{answerFeedback.correct ? '✓' : '✗'}</span>
                  <span className="text-sm">{answerFeedback.message}</span>
                </div>
              </div>
            )}

            {/* Q6 Special Notice */}
            {showingQuestion.id === 'Q6' && answerFeedback?.correct && (
              <div className="bg-yellow-500/20 border border-yellow-500/50 text-yellow-300 p-3 rounded-lg mb-4">
                <div className="text-sm font-bold">⚠️ Click "Close" to start pressure testing!</div>
                <div className="text-xs opacity-80">The pressure test will begin when you close this question.</div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              {!answerFeedback?.correct ? (
                <button
                  onClick={handleAnswerSubmit}
                  disabled={selectedAnswer === null}
                  className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                    selectedAnswer !== null
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 cursor-pointer'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Submit Answer
                </button>
              ) : (
                <button
                  onClick={handleCloseQuestion}
                  className="flex-1 py-3 rounded-lg font-bold bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 transition-all"
                >
                  {showingQuestion.id === 'Q6' ? '✓ Close & Start Pressure Test' : '✓ Continue'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Training Completion Popup */}
      {showCompletionPopup && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-2xl p-8 max-w-md w-full mx-4 text-center shadow-2xl">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-white mb-2">Training Complete!</h2>
            <p className="text-green-100 text-lg mb-6">
              Congratulations! You have successfully completed all {training.state.totalTasks} training tasks.
            </p>
            <div className="bg-white/20 rounded-lg p-4 mb-6">
              <div className="text-green-100 text-sm">Final Progress</div>
              <div className="text-white text-4xl font-bold">{training.state.progress.toFixed(0)}%</div>
            </div>
            <button
              onClick={() => {
                setShowCompletionPopup(false)
                training.resetTraining()
              }}
              className="px-8 py-3 bg-white text-green-700 rounded-lg font-bold hover:bg-green-50 transition-colors"
            >
              Start Over
            </button>
          </div>
        </div>
      )}

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

      {/* Top overlay - Status Bar */}
      <div className="absolute top-4 left-4 right-24 flex justify-between items-center pointer-events-none z-20">
        <div className="flex items-center gap-3 px-3 py-2 bg-black/50 backdrop-blur-sm rounded-lg pointer-events-auto">
          <span className="text-white/80 text-sm font-medium">OP SkillSim</span>
          <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-white/20">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
            <span className="text-xs text-gray-400">{isConnected ? 'Live' : 'Connecting'}</span>
          </div>
          <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-white/20">
            <span className="text-xs text-gray-500">Mode:</span>
            <span className="text-xs text-white">{training.state.mode}</span>
          </div>
          {training.state.progress > 0 && (
            <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-white/20">
              <span className="text-xs text-indigo-400">{training.state.progress.toFixed(0)}%</span>
            </div>
          )}
          {training.state.mode === 'training' && (
            <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-white/20">
              <span className="text-xs text-green-400">{training.state.phase}</span>
            </div>
          )}
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
