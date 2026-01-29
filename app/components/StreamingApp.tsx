'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import {PlatformNext,ModelDefinition, UndefinedModelDefinition,DefaultStreamerOptions,StreamerStatus} from '@pureweb/platform-sdk'
import {useStreamer,useLaunchRequest,VideoStream} from '@pureweb/platform-sdk-react'

// Critical path imports - needed immediately
import { useQuestions } from '../features/questions'
import { LoadingScreen, StarterScreen, SessionSelectionScreen, ResumeConfirmationModal, CinematicTimer, CinematicMobileControls, type LoadingStep, type ActiveSession } from '../features'
import { IdleWarningModal, useIdleDetection } from '../features/idle'
import { useStatePersistence } from '../features/training'
import type { QuestionData } from '../lib/messageTypes'
import type { PersistedTrainingState, TrainingSession } from '../types'
import { TASK_SEQUENCE, RETRY_CONFIG } from '../config'
import { useTheme } from '../context/ThemeContext'
import { trainingSessionService } from '../services'

// =============================================================================
// Dynamic Imports - Lazy loaded when stream connects
// =============================================================================

// Component imports
const ControlPanel = dynamic(() => import('../components/ControlPanel'), { ssr: false, loading: () => null })
const ThemeToggle = dynamic(() => import('../components/ThemeToggle'), { ssr: false, loading: () => null })
const TrainingSidebar = dynamic(() => import('../components/ControlPanel/TrainingSidebar'), { ssr: false, loading: () => null })
const MessageLog = dynamic(() => import('../components/MessageLog'), { ssr: false, loading: () => null })
const TrainingActionButtons = dynamic(() => import('../components/ControlPanel/TrainingActionButtons'), { ssr: false, loading: () => null })

// Feature modal imports (from barrel export)
const QuestionModal = dynamic(() => import('../features/questions').then(mod => ({ default: mod.QuestionModal })), { ssr: false, loading: () => null })
const NavigationWalkthrough = dynamic(() => import('../features').then(mod => ({ default: mod.NavigationWalkthrough })), { ssr: false, loading: () => null })
const SuccessModal = dynamic(() => import('../features').then(mod => ({ default: mod.SuccessModal })), { ssr: false, loading: () => null })
const ErrorModal = dynamic(() => import('../features').then(mod => ({ default: mod.ErrorModal })), { ssr: false, loading: () => null })
const SessionModal = dynamic(() => import('../features').then(mod => ({ default: mod.SessionModal })), { ssr: false, loading: () => null })
const TrainingCompleteModal = dynamic(() => import('../features').then(mod => ({ default: mod.TrainingCompleteModal })), { ssr: false, loading: () => null })
const SessionExpiryModal = dynamic(() => import('../features').then(mod => ({ default: mod.SessionExpiryModal })), { ssr: false, loading: () => null })
const QuitTrainingModal = dynamic(() => import('../features').then(mod => ({ default: mod.QuitTrainingModal })), { ssr: false, loading: () => null })

// Lazy load hooks - deferred until needed
import { useTrainingMessagesComposite } from '../hooks/useTrainingMessagesComposite'
import { useModalManager } from '../hooks/useModalManager'
import { useScreenFlow } from '../hooks/useScreenFlow'

// Redux sync - bridges hook state to Redux store
import { useReduxSync } from '../store/useReduxSync'

// Session complete redirect helper
import { redirectToSessionComplete } from '../lib/sessionCompleteRedirect'

// =============================================================================
// Configuration
// =============================================================================

const projectId = process.env.NEXT_PUBLIC_PUREWEB_PROJECT_ID
const modelId = process.env.NEXT_PUBLIC_PUREWEB_MODEL_ID

// Validate required environment variables
if (!projectId || !modelId) {
  console.error('❌ Missing PureWeb environment variables:', { projectId, modelId })
}

// Streamer options
const streamerOptions = DefaultStreamerOptions

// =============================================================================
// Helper Functions
// =============================================================================

type ConnectionStatus = 'initializing' | 'connecting' | 'connected' | 'failed' | 'retrying'

interface LoadingStatusParams {
  isRetrying: boolean
  streamerStatus: StreamerStatus
  connectionStatus: ConnectionStatus
  availableModels: ModelDefinition[] | undefined
  loading: boolean
}

/**
 * Determines the loading status message and step based on connection state.
 * Pure function extracted for testability and clarity.
 */
function getLoadingStatus(params: LoadingStatusParams): { message: string; step: LoadingStep } {
  const { isRetrying, streamerStatus, connectionStatus, availableModels, loading } = params

  if (isRetrying) {
    return { message: 'Reconnecting to stream', step: 'connecting' }
  }

  if (streamerStatus === StreamerStatus.Connected) {
    return { message: 'Establishing video stream', step: 'streaming' }
  }

  switch (connectionStatus) {
    case 'initializing':
      return { message: 'Initializing platform', step: 'initializing' }
    case 'connecting':
      if (availableModels) {
        return { message: 'Launching', step: 'launching' }
      }
      return { message: 'Connecting to server', step: 'connecting' }
    case 'retrying':
      return { message: 'Retrying connection', step: 'connecting' }
    default:
      if (loading) {
        return { message: 'Starting stream', step: 'launching' }
      }
      return { message: 'Loading session', step: 'initializing' }
  }
}

// =============================================================================
// Main Streaming App Component - Using New Modular Architecture
// =============================================================================

export default function StreamingApp() {
  const videoRef = useRef<HTMLVideoElement>(null)

  // Theme context
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  // Questions context - for getting total question count
  const { questionCount } = useQuestions()

  // Platform ref - persists across renders
  const platformRef = useRef<PlatformNext | null>(null)
  const preWarmStartedRef = useRef(false)

  // Initialize platform on first render
  if (!platformRef.current) {
    platformRef.current = new PlatformNext()
    platformRef.current.initialize({ endpoint: 'https://api.pureweb.io' })
  }

  // Warm environment from server-side pool
  const warmEnvRef = useRef<{ environmentId: string; agentToken: string } | null>(null)

  // Pre-warm platform connection AND claim warm environment on mount
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
  }, [])

  // Platform state
  const [modelDefinition, setModelDefinition] = useState<ModelDefinition>(new UndefinedModelDefinition())
  const [availableModels, setAvailableModels] = useState<ModelDefinition[]>()
  const [loading, setLoading] = useState(false)

  // Retry state
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('initializing')

  // ==========================================================================
  // Modal Manager - Centralized modal state
  // ==========================================================================
  const modals = useModalManager()

  // ==========================================================================
  // Screen Flow - State machine for screen transitions
  // ==========================================================================
  const screenFlow = useScreenFlow()

  // UI state
  const [sessionStartTime] = useState<number>(() => Date.now())

  // Session selection state
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [selectedSession, setSelectedSession] = useState<ActiveSession | null>(null)
  const [startNewSessionAfterStream, setStartNewSessionAfterStream] = useState(false)

  // Session tracking state
  const wasConnectedRef = useRef(false)
  const [isTestUser, setIsTestUser] = useState(false)
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null)
  const [sessionReturnUrl, setSessionReturnUrl] = useState<string | null>(null)
  const [isLtiSession, setIsLtiSession] = useState(true)
  const [userRole, setUserRole] = useState<'student' | 'teacher' | 'admin'>('student')

  // Explosion controls visibility (cinematic mode feature)
  const [showExplosionControls, setShowExplosionControls] = useState(true)

  // Training pause state
  const [isTrainingPaused, setIsTrainingPaused] = useState(false)

  // State persistence - for session resume
  const [restoredState, setRestoredState] = useState<PersistedTrainingState | null>(null)
  const [cinematicTimeRemaining, setCinematicTimeRemaining] = useState<number | null>(null)
  const hasRestoredStateRef = useRef(false)

  // ==========================================================================
  // Check session info and track expiry on mount
  // ==========================================================================

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/session')
        if (response.ok) {
          const data = await response.json()
          if (data.session) {
            // Test user = isLti is false (coming from direct login, not LTI)
            const isLti = data.session.isLti !== false
            setIsLtiSession(isLti)
            setIsTestUser(!isLti)

            // Store user role
            if (data.session.role) {
              setUserRole(data.session.role)
            }

            // Store session expiry info
            if (data.session.expiresAt) {
              setSessionExpiresAt(data.session.expiresAt)
            }
            if (data.session.returnUrl) {
              setSessionReturnUrl(data.session.returnUrl)
            }

          }
        }
      } catch (err) {
        console.log('Failed to check session:', err)
      }
    }
    checkSession()
  }, [])

  // ==========================================================================
  // Track session expiry and show warning modal
  // ==========================================================================

  useEffect(() => {
    if (!sessionExpiresAt) return

    const SESSION_WARNING_THRESHOLD = 5 * 60 * 1000 // 5 minutes in milliseconds

    const checkExpiry = () => {
      const now = Date.now()
      const timeRemaining = sessionExpiresAt - now

      // Show warning modal when 5 minutes or less remain
      if (timeRemaining <= SESSION_WARNING_THRESHOLD && timeRemaining > 0) {
        if (!modals.isOpen('sessionExpiry')) {
          console.log('⏰ Session expiring soon, showing warning modal')
          modals.openSessionExpiry()
        }
      }
    }

    // Check immediately
    checkExpiry()

    // Check every 30 seconds
    const interval = setInterval(checkExpiry, 30000)

    return () => clearInterval(interval)
  }, [sessionExpiresAt, modals])

  // ==========================================================================
  // Platform Initialization with Retry Logic
  // ==========================================================================

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

      // Skip if already pre-warmed (models already fetched)
      if (availableModels?.length && attempt === 1) {
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
        modals.openError(String(err))
      }
    }
  }, [availableModels])

  // Only initialize platform when stream is started by user
  useEffect(() => {
    if (screenFlow.streamStarted) {
      initializePlatform(1)
    }
  }, [screenFlow.streamStarted, initializePlatform])

  // Handler for closing navigation walkthrough
  const handleCloseNavigationWalkthrough = useCallback(() => {
    modals.closeModal('navigationWalkthrough')
  }, [modals])

  // Handler for starting the stream - checks for active sessions first (students only)
  const handleStartStream = useCallback(async () => {
    // For non-LTI or non-student users, skip session selection but still show cinematic mode
    if (!isLtiSession || userRole !== 'student') {
      screenFlow.goToLoadingForCinematic()
      return
    }

    // Check for active sessions
    setSessionsLoading(true)
    try {
      const result = await trainingSessionService.getActiveSessions()
      if (result.success && result.data.length > 0) {
        // Has active sessions - show session selection screen
        setActiveSessions(result.data as ActiveSession[])
        screenFlow.goToSessionSelection()
      } else {
        // No active sessions - proceed to cinematic mode
        // Session will be created when user clicks "Skip to Training"
        console.log('🆕 No active sessions found - proceeding to cinematic mode')
        setStartNewSessionAfterStream(true)
        screenFlow.goToLoadingForCinematic()
      }
    } catch (error) {
      console.error('Failed to check active sessions:', error)
      // On error, proceed to cinematic mode
      screenFlow.goToLoadingForCinematic()
    }
    setSessionsLoading(false)
  }, [isLtiSession, userRole, screenFlow])

  // Prefetch heavy components when user hovers on Start button
  const prefetchedRef = useRef(false)
  const handleStartHover = useCallback(() => {
    if (prefetchedRef.current) return
    prefetchedRef.current = true

    console.log('🚀 Prefetching components on hover...')

    // Prefetch dynamic imports
    import('../components/ControlPanel')
    import('../components/ThemeToggle')
    import('../components/MessageLog')
    import('../features/questions')
    import('../features/training')
    import('../features')
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
      modals.openQuestion(question)
    },
    onTrainingProgress: (data) => {
      console.log('📊 Progress:', data.progress + '%', data.taskName, data.phase)
    },
    onTrainingComplete: (progress, currentTask, totalTasks) => {
      console.log('🎉 Training Complete!', { progress, currentTask, totalTasks })
      modals.openTrainingComplete()
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
        modals.openPhaseSuccess({
          taskId: completedTaskDef.taskId,
          taskName: completedTaskDef.name,
          nextTaskIndex
        })
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
  // State Persistence - Save and Restore training state
  // ==========================================================================

  const statePersistence = useStatePersistence({
    enabled: isLtiSession && userRole === 'student',
    saveInterval: 5000,
    onStateRestored: (state) => {
      console.log('📂 State restored callback:', state)
      setRestoredState(state)
    }
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
      modals.openError(String(err))
    }
  }, [queueLaunchRequest, modals])

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
      screenFlow.setConnected(true)
      // Show navigation walkthrough only on FIRST connection, not on reconnection
      if (!wasConnectedRef.current) {
        modals.openNavigationWalkthrough()
      }
      wasConnectedRef.current = true // Mark that we were connected
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
          initializePlatform(retryCount + 1)
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

      modals.openSessionEnd(reason)
    }
  }, [streamerStatus, retryCount, initializePlatform, modals])

  // ==========================================================================
  // Initial Data Request (after connection)
  // ==========================================================================

  useEffect(() => {
    if (streamerStatus === StreamerStatus.Connected) {
      console.log('📤 Connection established - Requesting initial data from UE5...')
      // Initial request after connection stabilizes
      const initialTimer = setTimeout(() => {
        training.testConnection()
        training.refreshWaypoints()
        training.refreshHierarchicalLayers()
        console.log('📤 Initial data requests sent')
      }, 1500)

      // Retry waypoints after a bit more time in case first request was missed
      const retryTimer = setTimeout(() => {
        if (training.state.waypoints.length === 0) {
          console.log('📤 Retrying waypoint fetch...')
          training.refreshWaypoints()
        }
      }, 3500)

      return () => {
        clearTimeout(initialTimer)
        clearTimeout(retryTimer)
      }
    }
  }, [streamerStatus, training])

  // Track if we've sent the resume command for this session
  const hasResumedSessionRef = useRef<string | null>(null)

  // ==========================================================================
  // Handle Session Resume on Connection
  // ==========================================================================

  /**
   * When stream connects and user selected a session to resume,
   * show confirmation modal with button to start training.
   */
  useEffect(() => {
    if (streamerStatus !== StreamerStatus.Connected) return

    // If user selected a session to resume from SessionSelectionScreen
    if (selectedSession) {
      // Only show the resume modal once per session
      if (hasResumedSessionRef.current === selectedSession.id) {
        console.log('📂 Already showed resume modal for this session, skipping')
        return
      }

      const phaseIndex = parseInt(selectedSession.current_training_phase, 10) || 0
      console.log(`📂 Stream connected - showing resume confirmation for phase ${phaseIndex}`)
      console.log(`📂 Session ID: ${selectedSession.id}`)

      // Mark this session as handled
      hasResumedSessionRef.current = selectedSession.id
      hasRestoredStateRef.current = true

      // Set training state
      training.hooks.trainingState.setPhase(selectedSession.current_training_phase)
      training.hooks.trainingState.setCurrentTaskIndex(phaseIndex)
      screenFlow.goToTraining()
      setShowExplosionControls(false)

      // Show the resume confirmation modal
      modals.openResumeConfirmation(phaseIndex)

      // Skip navigation walkthrough for resumed sessions
      modals.closeModal('navigationWalkthrough')
      return
    }

    // If starting a new session (no selected session), cinematic mode will be shown
    // Training will start when user clicks "Skip to Training"
    if (startNewSessionAfterStream) {
      console.log('🆕 New session - cinematic mode active, waiting for user to skip to training')
      hasRestoredStateRef.current = true
      modals.closeModal('navigationWalkthrough')
      return
    }

    // Fallback for non-student or non-LTI users
    if (!isLtiSession || userRole !== 'student') {
      hasRestoredStateRef.current = true
      return
    }

    // Legacy behavior: Check for saved training state (for backwards compatibility)
    if (hasRestoredStateRef.current) return

    const restoreSession = async () => {
      console.log('📂 Checking for saved training state (legacy)...')
      hasRestoredStateRef.current = true

      const restoredData = await statePersistence.restoreState()

      if (restoredData) {
        const { trainingState, currentTrainingPhase, overallProgress } = restoredData

        console.log('📂 Restoring training session (legacy):', {
          currentTrainingPhase,
          overallProgress,
          hasTrainingState: !!trainingState,
        })

        const phaseToRestore = currentTrainingPhase || trainingState?.phase
        const taskIndexToRestore = trainingState?.currentTaskIndex
        const modeToRestore = trainingState?.mode || 'training'

        const shouldResumeTraining = modeToRestore === 'training' ||
          (phaseToRestore && phaseToRestore !== '0') ||
          (overallProgress && overallProgress > 0)

        if (shouldResumeTraining) {
          screenFlow.goToTraining()
          setShowExplosionControls(false)

          const phaseIndex = parseInt(phaseToRestore || '0', 10)

          if (phaseToRestore) {
            training.hooks.trainingState.setPhase(phaseToRestore)
          }

          if (taskIndexToRestore !== undefined && taskIndexToRestore > 0) {
            training.hooks.trainingState.setCurrentTaskIndex(taskIndexToRestore)
          }
          if (phaseIndex > 0) {
            console.log(`🔄 Resuming training from phase ${phaseIndex}`)
            training.startFromTask(phaseIndex)
          } else {
            training.startTraining()
          }

          console.log('📂 Training resumed:', {
            phase: phaseToRestore,
            phaseIndex,
            taskIndex: taskIndexToRestore,
            progress: overallProgress
          })
        } else if (trainingState?.mode === 'cinematic') {
          screenFlow.goToCinematic()
          setShowExplosionControls(true)
          // Restore cinematic timer if available
          if (trainingState.cinematicTimeRemaining !== null) {
            setCinematicTimeRemaining(trainingState.cinematicTimeRemaining)
          }
        }

        // Skip navigation walkthrough on session resume
        modals.closeModal('navigationWalkthrough')
      }
    }

    // Give a small delay for connection to stabilize
    const timer = setTimeout(restoreSession, 2000)
    return () => clearTimeout(timer)
  }, [streamerStatus, isLtiSession, userRole, statePersistence, training, selectedSession, startNewSessionAfterStream, modals, screenFlow])

  // ==========================================================================
  // Auto-Save State on Changes
  // ==========================================================================

  useEffect(() => {
    if (streamerStatus !== StreamerStatus.Connected) return
    if (!isLtiSession || userRole !== 'student') return

    // Don't auto-save until we've attempted to restore state
    // This prevents overwriting saved state with initial "Phase A" on mount
    if (!hasRestoredStateRef.current) return

    // Save current state
    statePersistence.saveState({
      mode: screenFlow.isCinematicMode ? 'cinematic' : 'training',
      uiMode: training.state.uiMode,
      currentTaskIndex: training.state.currentTaskIndex,
      taskName: training.state.taskName,
      phase: training.state.phase,
      progress: training.state.progress,
      selectedTool: training.state.selectedTool,
      selectedPipe: training.state.selectedPipe,
      airPlugSelected: training.state.airPlugSelected,
      cameraMode: training.state.cameraMode,
      cameraPerspective: training.state.cameraPerspective,
      explosionLevel: training.state.explosionValue,
      cinematicTimeRemaining: cinematicTimeRemaining
    })
  }, [
    streamerStatus,
    isLtiSession,
    userRole,
    screenFlow.isCinematicMode,
    training.state.uiMode,
    training.state.currentTaskIndex,
    training.state.taskName,
    training.state.phase,
    training.state.progress,
    training.state.selectedTool,
    training.state.selectedPipe,
    training.state.airPlugSelected,
    training.state.cameraMode,
    training.state.cameraPerspective,
    training.state.explosionValue,
    cinematicTimeRemaining,
    statePersistence
  ])

  // ==========================================================================
  // Submit Quiz Results when training completes (students only)
  // ==========================================================================

  const isTrainingComplete = modals.isOpen('trainingComplete')

  useEffect(() => {
    // Skip saving progress for admin/teacher - they are just testing
    if (userRole !== 'student') {
      if (isTrainingComplete) {
        console.log('📝 [StreamingApp] Skipping progress save for', userRole, '(test mode)')
      }
      return
    }

    console.log('📝 [StreamingApp] Quiz submit effect triggered:', {
      isTrainingComplete,
      quizAnswersLength: training.quizAnswers.length,
      quizAnswers: training.quizAnswers,
      questionCount
    })

    if (isTrainingComplete) {
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
  }, [isTrainingComplete, training.quizAnswers.length, questionCount, training, sessionStartTime, userRole])

  // ==========================================================================
  // Derived State
  // ==========================================================================

  const isConnected = streamerStatus === StreamerStatus.Connected

  // Idle detection - only active when stream is connected
  const { isIdle, resetIdle } = useIdleDetection({
    idleTimeout: 5 * 60 * 1000, // 5 minutes
    enabled: isConnected // Only detect idle when connected
  })

  // ==========================================================================
  // Consolidated Action Handlers
  // Groups related handlers to reduce declaration overhead
  // ==========================================================================

  // Question handlers
  const questionActions = useMemo(() => ({
    submit: (selectedAnswer: number) => training.submitQuestionAnswer(selectedAnswer),
    close: () => { training.closeQuestion(); modals.closeModal('question') },
  }), [training, modals])

  // Phase success handlers
  const phaseActions = useMemo(() => ({
    continue: () => {
      const completedPhase = modals.completedPhase
      if (completedPhase && completedPhase.nextTaskIndex < TASK_SEQUENCE.length) {
        const nextTask = TASK_SEQUENCE[completedPhase.nextTaskIndex]
        training.selectTool(nextTask.tool)
      }
      modals.closeModal('phaseSuccess')
    },
    retry: () => {
      const completedPhase = modals.completedPhase
      if (completedPhase) {
        const currentTaskDef = TASK_SEQUENCE.find(t => t.taskId === completedPhase.taskId)
        if (currentTaskDef) training.selectTool(currentTaskDef.tool)
      }
      modals.closeModal('phaseSuccess')
    },
  }), [modals, training])

  // Session selection handlers
  const sessionActions = useMemo(() => ({
    resume: async (session: ActiveSession) => {
      console.log('📂 Resuming session:', session.id, 'at phase:', session.current_training_phase)
      setSessionsLoading(true)
      try {
        const result = await trainingSessionService.resumeSession(session.id)
        if (!result.success) console.error('Failed to resume session:', result.error)
      } catch (error) {
        console.error('Error resuming session:', error)
      }
      setSelectedSession(session)
      screenFlow.goToLoadingForTraining()
      setSessionsLoading(false)
    },
    startNew: () => {
      console.log('🆕 Starting new training session - cinematic mode first')
      setSelectedSession(null)
      setStartNewSessionAfterStream(true)
      screenFlow.goToLoadingForCinematic()
    },
    confirmResume: () => {
      const phaseIndex = modals.resumePhaseIndex
      console.log(`🚀 User clicked resume - sending start_from_task:${phaseIndex} to UE5`)
      modals.closeModal('resumeConfirmation')
      phaseIndex > 0 ? training.startFromTask(phaseIndex) : training.startTraining()
    },
    skipToTraining: async () => {
      console.log('⏭️ Skipping to training mode - starting from phase 0')
      screenFlow.goToTraining()
      setShowExplosionControls(false)
      if (isLtiSession && userRole === 'student' && startNewSessionAfterStream) {
        console.log('🆕 Creating new training session before starting training')
        try {
          const result = await trainingSessionService.createNewSession()
          if (result.success) console.log('✅ Training session created:', result.data?.id)
          else console.error('Failed to create training session:', result.error)
        } catch (error) {
          console.error('Error creating training session:', error)
        }
      }
      training.startTraining()
    },
  }), [modals, training, screenFlow, isLtiSession, userRole, startNewSessionAfterStream])

  // Connection/error handlers
  const connectionActions = useMemo(() => ({
    retry: () => {
      modals.closeModal('error')
      setRetryCount(0)
      setAvailableModels(undefined)
      setModelDefinition(new UndefinedModelDefinition())
      setLoading(false)
      setConnectionStatus('initializing')
      initializePlatform(1)
    },
    refresh: () => window.location.reload(),
    sendTestMessage: (message: string) => training.sendRawMessage(message),
  }), [initializePlatform, modals, training])

  // Session end/expiry handlers
  const sessionEndActions = useMemo(() => ({
    login: () => {
      modals.closeModal('sessionEnd')
      redirectToSessionComplete({
        reason: 'logged_out',
        role: userRole,
        progress: training.state.progress,
        phasesCompleted: training.state.currentTaskIndex,
        totalPhases: training.state.totalTasks,
        returnUrl: sessionReturnUrl,
        isLti: isLtiSession,
      })
    },
    expiry: () => modals.closeModal('sessionExpiry'),
    idle: () => {
      console.log('⏰ [StreamingApp] Idle timeout - ending session due to inactivity')
      import('@/app/services').then(({ trainingSessionService }) => {
        trainingSessionService.completeTraining({
          totalTimeMs: Date.now() - (sessionStartTime || Date.now()),
          phasesCompleted: training.state.totalTasks
        }).then(result => {
          if (result.success) console.log('✅ [StreamingApp] Training session ended due to idle timeout')
        })
      })
      redirectToSessionComplete({
        reason: 'idle',
        role: userRole,
        progress: training.state.progress,
        phasesCompleted: training.state.currentTaskIndex,
        totalPhases: training.state.totalTasks,
        returnUrl: sessionReturnUrl,
        isLti: isLtiSession,
      })
    },
    trainingComplete: () => modals.closeModal('trainingComplete'),
  }), [modals, userRole, training.state, sessionReturnUrl, isLtiSession, sessionStartTime])

  // Training control handlers (pause/resume/quit)
  const trainingControlActions = useMemo(() => ({
    pause: () => { console.log('⏸️ Pausing training'); training.pauseTraining(); setIsTrainingPaused(true) },
    resume: () => { console.log('▶️ Resuming training'); training.resumeTraining(); setIsTrainingPaused(false) },
    quitClick: () => modals.openQuitTraining(),
    quitConfirm: async () => {
      console.log('🚪 Quitting training - saving progress')
      modals.closeModal('quitTraining')
      if (sessionStartTime) {
        const timeSpentMs = Date.now() - sessionStartTime
        await trainingSessionService.recordTimeSpent(timeSpentMs)
      }
      redirectToSessionComplete({
        reason: 'quit',
        role: userRole,
        progress: training.state.progress,
        phasesCompleted: training.state.currentTaskIndex,
        totalPhases: training.state.totalTasks,
        returnUrl: sessionReturnUrl,
        isLti: isLtiSession,
      })
    },
    quitCancel: () => modals.closeModal('quitTraining'),
  }), [training, modals, sessionStartTime, userRole, sessionReturnUrl, isLtiSession])

  // ==========================================================================
  // Loading Status (computed from pure function)
  // ==========================================================================

  const loadingStatus = getLoadingStatus({
    isRetrying,
    streamerStatus,
    connectionStatus,
    availableModels,
    loading
  })

  // Force dark background when starter or loading screen is visible
  const forcesDarkBg = screenFlow.showStarterScreen || screenFlow.showLoadingScreen || screenFlow.showSessionSelection

  // ==========================================================================
  // Main Render - Using New Modular Components
  // ==========================================================================

  return (
    <div className={`h-screen w-screen relative overflow-hidden ${forcesDarkBg ? 'bg-[#1E1E1E]' : isDark ? 'bg-[#1E1E1E]' : 'bg-gray-100'}`}>
      {/* Theme Toggle - Hidden when connected (both cinematic and training sidebars have their own toggle) */}
      {/* ThemeToggle is only shown when NOT connected yet, as a standalone button */}

      {/* Training Sidebar - Slim left sidebar with theme/pause/quit buttons (desktop only) */}
      {/* Also includes TaskTools that auto-opens when PipeConnection or PressureTester is selected */}
      {isConnected && !screenFlow.isCinematicMode && (
        <TrainingSidebar
          isPaused={isTrainingPaused}
          isVisible={training.state.trainingStarted || training.state.isActive || training.state.mode === 'training'}
          onPause={trainingControlActions.pause}
          onResume={trainingControlActions.resume}
          onQuit={trainingControlActions.quitClick}
          trainingState={training.state}
          onSelectPipe={training.selectPipe}
          onSelectPressureTest={training.selectPressureTest}
        />
      )}

      {/* Cinematic Mode Timer - Show when connected and in cinematic mode */}
      {isConnected && screenFlow.isCinematicMode && (
        <CinematicTimer
          duration={7200} // 2 hours
          initialTimeRemaining={cinematicTimeRemaining}
          onSkipToTraining={sessionActions.skipToTraining}
          onTimeChange={setCinematicTimeRemaining}
          isActive={screenFlow.isCinematicMode}
        />
      )}

      {/* Cinematic Controls - Mobile toggle buttons + Desktop panels */}
      {isConnected && screenFlow.isCinematicMode && (
        <CinematicMobileControls
          // Explosion Controls Props
          explosionValue={training.state.explosionValue}
          onExplosionValueChange={training.setExplosionLevel}
          onExplode={training.explodeBuilding}
          onAssemble={training.assembleBuilding}
          // Waypoint Controls Props
          waypoints={training.state.waypoints}
          activeWaypointIndex={training.state.activeWaypointIndex}
          activeWaypointName={training.state.activeWaypointName}
          onRefreshWaypoints={training.refreshWaypoints}
          onActivateWaypoint={training.activateWaypoint}
          onDeactivateWaypoint={training.deactivateWaypoint}
          onWaypointProgressChange={training.setExplosionLevel}
          // Camera Controls Props
          cameraPerspective={training.state.cameraPerspective}
          cameraMode={training.state.cameraMode}
          onSetCameraPerspective={training.setCameraPerspective}
          onToggleAutoOrbit={training.toggleAutoOrbit}
          onResetCamera={training.resetCamera}
          // Layer Controls Props
          hierarchicalGroups={training.state.hierarchicalGroups}
          onRefreshLayers={training.refreshHierarchicalLayers}
          onToggleMainGroup={training.toggleMainGroup}
          onToggleChildGroup={training.toggleChildGroup}
          onShowAllLayers={training.showAllLayers}
          onHideAllLayers={training.hideAllLayers}
          isVisible={true}
        />
      )}

      {/* Control Panel (ToolBar) - Only show when stream is connected and NOT in cinematic mode */}
      {isConnected && !screenFlow.isCinematicMode && (
        <ControlPanel
          isDark={isDark}
          onSelectTool={training.selectTool}
          onSelectPipe={training.selectPipe}
          onSelectPressureTest={training.selectPressureTest}
        />
      )}

      {/* Training Action Buttons (Pause/Resume, Quit) - Mobile only (desktop uses TrainingSidebar) */}
      <div className="sm:hidden">
        <TrainingActionButtons
          isPaused={isTrainingPaused}
          isVisible={isConnected && !screenFlow.isCinematicMode && (training.state.trainingStarted || training.state.isActive || training.state.mode === 'training')}
          onPause={trainingControlActions.pause}
          onResume={trainingControlActions.resume}
          onQuit={trainingControlActions.quitClick}
        />
      </div>

      {/* Message Log - Only show when stream is connected and NOT in cinematic mode */}
      {isConnected && !screenFlow.isCinematicMode && (
        <MessageLog
          messages={training.messageLog}
          lastMessage={training.lastMessage}
          onClear={training.clearLog}
          onSendTest={connectionActions.sendTestMessage}
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

      {/* Question Modal */}
      <QuestionModal
        question={modals.showingQuestion}
        tryCount={training.state.questionTryCount}
        onSubmitAnswer={questionActions.submit}
        onClose={questionActions.close}
      />

      {/* Training Complete Modal - Shows when all phases are completed */}
      <TrainingCompleteModal
        isOpen={modals.isOpen('trainingComplete')}
        totalTasks={training.state.totalTasks}
        progress={training.state.progress}
        isLti={isLtiSession}
        returnUrl={sessionReturnUrl}
        role={userRole}
        onClose={sessionEndActions.trainingComplete}
      />

      {/* Phase Success Modal */}
      <SuccessModal
        isOpen={modals.isOpen('phaseSuccess')}
        title={modals.completedPhase ? modals.completedPhase.taskName + ' Task Completed' : 'Task Completed'}
        message={modals.completedPhase ? `Success!` : ''}
        successText={modals.completedPhase ? `${modals.completedPhase.taskName} Task completed successfully!` : 'Phase completed successfully!'}
        onContinue={phaseActions.continue}
        onRetry={phaseActions.retry}
        continueButtonText="Continue"
        retryButtonText="Retry"
        showRetryButton={true}
      />

      {/* Stream Error Modal */}
      <ErrorModal
        isOpen={modals.isOpen('error')}
        title="Connection Failed"
        message="Error!"
        errorText={modals.initError || `Unable to connect to stream. Attempted ${RETRY_CONFIG.maxRetries} automatic retries.`}
        onRetry={connectionActions.retry}
        onClose={connectionActions.refresh}
        retryButtonText="Try Again"
        closeButtonText="Refresh Page"
        showCloseButton={true}
      />

      {/* Navigation Walkthrough - Show first when app opens */}
      <NavigationWalkthrough
        isOpen={modals.isOpen('navigationWalkthrough')}
        onClose={handleCloseNavigationWalkthrough}
      />

      {/* Starter Screen - Show after navigation walkthrough is closed */}
      <StarterScreen
        isOpen={screenFlow.showStarterScreen}
        title="Start Streaming"
        subtitle="Click the button below to begin your training session"
        onStart={handleStartStream}
        onHover={handleStartHover}
        buttonText="Start"
      />

      {/* Session Selection Screen - Show when student has active sessions */}
      <SessionSelectionScreen
        isOpen={screenFlow.showSessionSelection}
        sessions={activeSessions}
        onResumeSession={sessionActions.resume}
        onStartNewSession={sessionActions.startNew}
        loading={sessionsLoading}
      />

      {/* Loading Screen - Show after user clicks start until stream is connected */}
      <LoadingScreen
        isOpen={screenFlow.showLoadingScreen && !modals.isOpen('error')}
        title="Please Wait!"
        subtitle="Session is loading"
        statusMessage={loadingStatus.message}
        currentStep={loadingStatus.step}
        retryCount={retryCount}
        maxRetries={RETRY_CONFIG.maxRetries}
        showRetryInfo={retryCount > 0}
      />

      {/* Resume Confirmation Modal - Show after stream connects when resuming */}
      <ResumeConfirmationModal
        isOpen={modals.isOpen('resumeConfirmation')}
        phaseIndex={modals.resumePhaseIndex}
        onStartTraining={sessionActions.confirmResume}
        loading={sessionsLoading}
      />

      {/* Session End Modal - Show when session is disconnected/closed */}
      <SessionModal
        isOpen={modals.isOpen('sessionEnd')}
        reason={modals.sessionEndReason}
        onLogin={sessionEndActions.login}
        loginButtonText={isTestUser ? "Back to Login" : "Close"}
      />

      {/* Session Expiry Modal - Shows countdown when session is about to expire */}
      <SessionExpiryModal
        isOpen={modals.isOpen('sessionExpiry')}
        expiresAt={sessionExpiresAt || Date.now()}
        isLti={isLtiSession}
        returnUrl={sessionReturnUrl}
        role={userRole}
        progress={training.state.progress}
        phasesCompleted={training.state.currentTaskIndex}
        totalPhases={training.state.totalTasks}
        onSessionEnd={sessionEndActions.expiry}
      />

      {/* Idle Warning Modal - Shows when user is inactive for 5 minutes */}
      <IdleWarningModal
        isOpen={isIdle}
        countdownDuration={300}
        onStayActive={resetIdle}
        onTimeout={sessionEndActions.idle}
      />

      {/* Quit Training Modal - Confirmation when user clicks quit */}
      <QuitTrainingModal
        isOpen={modals.isOpen('quitTraining')}
        onConfirm={trainingControlActions.quitConfirm}
        onCancel={trainingControlActions.quitCancel}
        currentPhase={training.state.currentTaskIndex}
        totalPhases={training.state.totalTasks}
        isLti={isLtiSession}
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
