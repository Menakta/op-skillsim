"use client";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { StreamerStatus } from "@pureweb/platform-sdk";
import { VideoStream } from "@pureweb/platform-sdk-react";
// Critical path imports - needed immediately
import { useQuestions } from "../features/questions";
import {
  LoadingScreen,
  StarterScreen,
  SessionSelectionScreen,
  CinematicTimer,
  CinematicWalkthrough,
  TrainingModeWalkthrough,
  type LoadingStep,
  type ActiveSession,
} from "../features";
import { useIdleDetection } from "../features/idle";
import { TASK_SEQUENCE, RETRY_CONFIG } from "../config";
import { useTheme } from "../context/ThemeContext";
import { trainingSessionService } from "../services";
// =============================================================================
// Dynamic Imports - Lazy loaded when stream connects
// =============================================================================

// Component imports
const ControlPanel = dynamic(() => import("../components/ControlPanel"), {
  ssr: false,
  loading: () => null,
});
const ThemeToggle = dynamic(() => import("../components/ThemeToggle"), {
  ssr: false,
  loading: () => null,
});
const UnifiedSidebar = dynamic(
  () => import("../components/ControlPanel/UnifiedSidebar"),
  { ssr: false, loading: () => null },
);
const MessageLog = dynamic(() => import("../components/MessageLog"), {
  ssr: false,
  loading: () => null,
});
const ModalContainer = dynamic(() => import("../components/ModalContainer"), {
  ssr: false,
  loading: () => null,
});
// Note: Feature modals moved to ModalContainer component
// Lazy load hooks - deferred until needed
import { useTrainingMessagesComposite } from "../hooks/useTrainingMessagesComposite";
import { useModalManager } from "../hooks/useModalManager";
import { useScreenFlow } from "../hooks/useScreenFlow";
import { useStreamConnection } from "../hooks/useStreamConnection";
// Settings hook - UE5 settings communication
import { useSettings, SettingsDebugPanel } from "../features/settings";
// Redux sync - bridges hook state to Redux store
import { useReduxSync } from "../store/useReduxSync";
// Session complete redirect helper
import { redirectToSessionComplete } from "../lib/sessionCompleteRedirect";
// Session info hook - manages session state and expiry tracking
import { useSessionInfo } from "../hooks/useSessionInfo";
// Session selection hook - manages active sessions and resume flow
import { useSessionSelection } from "../hooks/useSessionSelection";
// Training persistence hook - auto-save and quiz submission
import { useTrainingPersistence } from "../hooks/useTrainingPersistence";
// Note: useStreamHealthMonitor is available but disabled due to hot reload issues
// import { useStreamHealthMonitor } from "../hooks/useStreamHealthMonitor";
// =============================================================================
// Configuration
// =============================================================================
const projectId = process.env.NEXT_PUBLIC_PUREWEB_PROJECT_ID || "";
const modelId = process.env.NEXT_PUBLIC_PUREWEB_MODEL_ID || "";
// =============================================================================
// Helper Functions
// =============================================================================
import type { ConnectionStatus } from "../hooks/useStreamConnection";
interface LoadingStatusParams {
  isRetrying: boolean;
  streamerStatus: StreamerStatus;
  connectionStatus: ConnectionStatus;
  availableModels: unknown[] | undefined;
  loading: boolean;
}

/**
 * Determines the loading status message and step based on connection state.
 * Pure function extracted for testability and clarity.
 */
function getLoadingStatus(params: LoadingStatusParams): {
  message: string;
  step: LoadingStep;
} {
  const {
    isRetrying,
    streamerStatus,
    connectionStatus,
    availableModels,
    loading,
  } = params;
  if (isRetrying) {
    return { message: "Reconnecting to stream", step: "connecting" };
  }

  if (streamerStatus === StreamerStatus.Connected) {
    return { message: "Establishing video stream", step: "streaming" };
  }
  switch (connectionStatus) {
    case "initializing":
      return { message: "Initializing platform", step: "initializing" };
    case "connecting":
      if (availableModels) {
        return { message: "Launching", step: "launching" };
      }
      return { message: "Connecting to server", step: "connecting" };
    case "retrying":
      return { message: "Retrying connection", step: "connecting" };
    default:
      if (loading) {
        return { message: "Starting stream", step: "launching" };
      }
      return { message: "Loading session", step: "initializing" };
  }
}
// =============================================================================
// Main Streaming App Component - Using New Modular Architecture
// =============================================================================
export default function StreamingApp() {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Ref to track if TrainingComplete modal should be shown after question closes
  const pendingTrainingCompleteRef = useRef(false);

  // Theme context
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Questions context - for getting total question count
  const { questionCount } = useQuestions();
  // ==========================================================================
  // Modal Manager - Centralized modal state
  // ==========================================================================
  const modals = useModalManager();
  // ==========================================================================
  // Screen Flow - State machine for screen transitions
  // ==========================================================================
  const screenFlow = useScreenFlow();
  // ==========================================================================
  // Stream Connection - PureWeb SDK connection lifecycle
  // ==========================================================================
  const stream = useStreamConnection({
    projectId,
    modelId,
    streamStarted: screenFlow.streamStarted,
    onError: (error) => modals.openError(error),
    onConnected: (isFirstConnection) => {
      screenFlow.setConnected(true);
      // NavigationWalkthrough will be shown after CinematicWalkthrough completes
    },
    onSessionEnd: (reason) => modals.openSessionEnd(reason),
  });

  // ==========================================================================
  // Audio Stream Handler - Ensure audio tracks are included and unmuted
  // ==========================================================================
  useEffect(() => {
    if (stream.isConnected && videoRef.current && stream.videoStream) {
      const video = videoRef.current;

      console.log('🔊 Audio Debug Info:');
      console.log('  - videoStream:', stream.videoStream);
      console.log('  - audioStream:', stream.audioStream);
      console.log('  - video.srcObject:', video.srcObject);
      console.log('  - video.muted:', video.muted);

      // Wait for VideoStream component to set srcObject (small delay)
      setTimeout(() => {
        const currentStream = video.srcObject as MediaStream;
        if (currentStream) {
          console.log('  - Current stream audio tracks:', currentStream.getAudioTracks().length);
          console.log('  - Current stream video tracks:', currentStream.getVideoTracks().length);
        }

        // Merge audio tracks from audioStream into videoStream if available
        if (stream.audioStream) {
          const audioTracks = stream.audioStream.getAudioTracks();
          console.log('🔊 Audio tracks available from audioStream:', audioTracks.length);

          // Add audio tracks to the video's srcObject if not already present
          if (audioTracks.length > 0 && currentStream) {
            // Check if audio tracks are already present
            const existingAudioTracks = currentStream.getAudioTracks();
            if (existingAudioTracks.length === 0) {
              // Add audio tracks
              audioTracks.forEach(track => {
                currentStream.addTrack(track);
                console.log('✅ Added audio track to video stream:', track.id, track.enabled);
              });
            } else {
              console.log('ℹ️ Audio tracks already present in stream');
            }
          }
        }

        // Unmute the video element
        video.muted = false;
        video.volume = 1.0;
        console.log('🔊 Video unmuted, volume set to 1.0');

        // Attempt to play with audio (handles browser autoplay policy)
        video.play().catch((err) => {
          console.warn('⚠️ Autoplay with audio blocked by browser. User interaction required:', err);

          // Add one-time click handler to unmute on user interaction
          const enableAudio = () => {
            video.muted = false;
            video.volume = 1.0;
            video.play().then(() => {
              console.log('✅ Audio enabled after user interaction');
            }).catch((e) => console.error('❌ Failed to enable audio:', e));

            // Remove listener after first interaction
            document.removeEventListener('click', enableAudio);
            document.removeEventListener('touchstart', enableAudio);
            document.removeEventListener('keydown', enableAudio);
          };

          document.addEventListener('click', enableAudio, { once: true });
          document.addEventListener('touchstart', enableAudio, { once: true });
          document.addEventListener('keydown', enableAudio, { once: true });
        });
      }, 100); // Small delay to let VideoStream component set srcObject
    }
  }, [stream.isConnected, stream.videoStream, stream.audioStream]);

  // ==========================================================================
  // Session Info - Manages session state and expiry tracking
  // ==========================================================================
  const {isLtiSession,isTestUser, userRole,sessionExpiresAt,sessionReturnUrl,sessionStartTime, } = useSessionInfo({
    onSessionExpiring: () => {
      if (!modals.isOpen("sessionExpiry")) {
        modals.openSessionExpiry();
      }
    },
  });
  // Explosion controls visibility (cinematic mode feature)
  const [showExplosionControls, setShowExplosionControls] = useState(true);
  // Training pause state
  const [isTrainingPaused, setIsTrainingPaused] = useState(false);
  // Cinematic walkthrough state
  const [showCinematicWalkthrough, setShowCinematicWalkthrough] = useState(true);
  // Training walkthrough state - only show when transitioning from cinematic (not resume)
  const [showTrainingWalkthrough, setShowTrainingWalkthrough] = useState(false);
  // Track if user is transitioning from cinematic to training (to show walkthrough)
  const isTransitioningToTrainingRef = useRef(false);
  // Pending training start - will be executed after walkthrough completes
  const pendingTrainingStartRef = useRef<(() => void) | null>(null);
  // Sidebar open state (controlled by walkthrough)
  const [forceSidebarOpen, setForceSidebarOpen] = useState<boolean | undefined>(undefined);
  // Sidebar active tab (controlled by walkthrough for inventory tab highlight)
  const [forceSidebarTab, setForceSidebarTab] = useState<'inventory' | 'controls' | 'settings' | 'system' | undefined>(undefined);
  // Handler for closing navigation walkthrough
  const handleCloseNavigationWalkthrough = useCallback(() => {
    modals.closeModal("navigationWalkthrough");
  }, [modals]);
  // Prefetch heavy components when user hovers on Start button
  const prefetchedRef = useRef(false);
  const handleStartHover = useCallback(() => {
    if (prefetchedRef.current) return;
    prefetchedRef.current = true;
    // Prefetch dynamic imports
    import("../components/ControlPanel");
    import("../components/ThemeToggle");
    import("../components/MessageLog");
    import("../features/questions");
    import("../features/training");
    import("../features");
  }, []);
  // ==========================================================================
  // Training Messages Hook (uses stream emitter and messageSubject)
  // ==========================================================================
  const training = useTrainingMessagesComposite(
    stream.emitter,
    stream.messageSubject,
    {
      onQuestionRequest: (questionId, question) => {
        modals.openQuestion(question);
      },
      onTrainingProgress: (data) => {
        console.log(
          "📊 Progress:",
          data.progress + "%",
          data.taskName,
          data.phase,
        );
      },
      onTrainingComplete: (progress, currentTask, totalTasks) => {
        console.log("🎉 Training Complete!", {
          progress,
          currentTask,
          totalTasks,
        });
        // Don't open TrainingComplete modal if a question is currently open
        // This prevents the quiz modal from being closed unexpectedly
        if (modals.isOpen("question")) {
          console.log("⏳ Question modal is open - deferring TrainingComplete modal");
          // Store that we need to show training complete after question closes
          pendingTrainingCompleteRef.current = true;
        } else {
          modals.openTrainingComplete();
        }
      },
      onTaskCompleted: (taskId, nextTaskIndex, completedTaskIndex) => {
        console.log(
          "✅ Task completed:",
          taskId,
          "Completed index:",
          completedTaskIndex,
          "Next task index:",
          nextTaskIndex,
        );

        // Save phase completion to database (for LTI students)
        const phasesCompleted = nextTaskIndex;
        console.log("📊 Saving phase completion to database:", { phase: taskId, phasesCompleted });
        trainingSessionService.completePhase({
          phase: taskId,
          nextPhase: TASK_SEQUENCE[nextTaskIndex]?.taskId || taskId,
          totalPhases: TASK_SEQUENCE.length,
          progress: Math.round((phasesCompleted / TASK_SEQUENCE.length) * 100),
        }).then(result => {
          if (result.success) {
            console.log("✅ Phase completion saved:", result.data);
          } else {
            console.warn("⚠️ Failed to save phase completion:", result.error);
          }
        });

        // Don't show phase success modal if a question modal is currently open
        // This prevents overriding quiz modals that need to be answered
        if (modals.isOpen("question")) {
          console.log("⏳ Question modal is open - skipping PhaseSuccess modal for:", taskId);
          return;
        }

        // Use completedTaskIndex directly (passed from useTrainingState which calculates it correctly)
        const completedTaskDef = TASK_SEQUENCE[completedTaskIndex];
        console.log("📋 Completed task:", completedTaskDef?.name, "| UE5 sent taskId:", taskId);
        // Show modal if we found the task and there are more tasks
        if (completedTaskDef && nextTaskIndex < TASK_SEQUENCE.length) {
          console.log(
            "🎉 Showing phase success modal for:",
            completedTaskDef.name,
          );
          modals.openPhaseSuccess({
            taskId: completedTaskDef.taskId,
            taskName: completedTaskDef.name,
            nextTaskIndex,
          });
        } else {
          console.log(
            "⚠️ Not showing modal - completedTaskDef:",
            completedTaskDef,
            "nextTaskIndex:",
            nextTaskIndex,
            "total:",
            TASK_SEQUENCE.length,
          );
        }
      },
    },
    {
      debug: true,
    },
  );
  // Sync training state to Redux store
  // This allows child components to use Redux selectors instead of props
  useReduxSync(training);

  // ==========================================================================
  // Settings Hook - UE5 Settings Communication
  // ==========================================================================

  // Stable callbacks for settings hook to prevent re-renders
  const handleSettingApplied = useCallback((settingType: string, value: string, success: boolean) => {
    console.log(
      success ? "✅" : "❌",
      `Setting ${settingType}:`,
      value,
      success ? "applied" : "failed"
    );
  }, []);

  const handleFpsUpdate = useCallback(() => {
    // FPS updates are handled internally by useSettings
  }, []);

  const settings = useSettings(training.sendRawMessage, {
    debug: true,
    onSettingApplied: handleSettingApplied,
    onFpsUpdate: handleFpsUpdate,
  });

  // Stable ref for handleSettingsMessage to avoid infinite loops
  const handleSettingsMessageRef = useRef(settings.handleSettingsMessage);
  handleSettingsMessageRef.current = settings.handleSettingsMessage;

  // Subscribe to settings messages from UE5
  useEffect(() => {
    if (!training.lastMessage) return;
    handleSettingsMessageRef.current(training.lastMessage);
  }, [training.lastMessage]);
  // ==========================================================================
  // Training Persistence - Auto-save and quiz submission
  // ==========================================================================
  const persistence = useTrainingPersistence(
    {
      enabled: isLtiSession && userRole === "student",
      userRole,
      streamerStatus: stream.streamerStatus,
      isTrainingComplete: modals.isOpen("trainingComplete"),
      isCinematicMode: screenFlow.isCinematicMode,
      sessionStartTime,
      questionCount,
    },
    {
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
      explosionValue: training.state.explosionValue,
      totalTasks: training.state.totalTasks,
    },
    {
      quizAnswers: training.quizAnswers,
      submitQuizResults: training.submitQuizResults,
    }
  );
  // ==========================================================================
  // Session Selection - Active sessions, resume, and new session flow
  // ==========================================================================
  const sessionSelection = useSessionSelection(
    {
      isLtiSession,
      userRole,
      streamerStatus: stream.streamerStatus,
    },
    {
      // Screen flow transitions
      goToLoadingForCinematic: screenFlow.goToLoadingForCinematic,
      goToLoadingForTraining: screenFlow.goToLoadingForTraining,
      goToSessionSelection: screenFlow.goToSessionSelection,
      goToTraining: screenFlow.goToTraining,
      goToCinematic: screenFlow.goToCinematic,

      // Modal interactions
      openResumeConfirmation: modals.openResumeConfirmation,
      closeNavigationWalkthrough: () =>
        modals.closeModal("navigationWalkthrough"),

      // Training control
      setTrainingPhase: training.hooks.trainingState.setPhase,
      setCurrentTaskIndex: training.hooks.trainingState.setCurrentTaskIndex,
      startTraining: training.startTraining,
      startFromTask: training.startFromTask,

      // State persistence
      restoreState: persistence.statePersistence.restoreState,
      restoreQuizAnswers: training.restoreQuizAnswers,

      // External state setters
      onEnterTrainingMode: () => setShowExplosionControls(false),
      onEnterCinematicMode: (timeRemaining) => {
        setShowExplosionControls(true);
        if (timeRemaining !== undefined && timeRemaining !== null) {
          persistence.setCinematicTimeRemaining(timeRemaining);
        }
      },
      onStateRestoreAttempted: persistence.markStateRestored,
    },
  );
  // Idle detection - only active when stream is connected
  const { isIdle, resetIdle } = useIdleDetection({
    idleTimeout: 5 * 60 * 1000, // 5 minutes
    enabled: stream.isConnected, // Only detect idle when connected
  });
  // ==========================================================================
  // Stream Health Monitor - Disabled for now, keeping manual reconnect only
  // TODO: Re-enable once hot reload issues are resolved
  // ==========================================================================
  // Note: The useStreamHealthMonitor hook is available but disabled due to
  // React hot reload compatibility issues. Manual reconnect via the sidebar
  // button still works. Users can click "Reconnect Stream" anytime.
  const streamHealth = { status: 'healthy' as const };
  // ==========================================================================
  // Consolidated Action Handlers
  // Groups related handlers to reduce declaration overhead
  // ==========================================================================
  // Question handlers - use specific functions to avoid re-renders
  const questionActions = useMemo(
    () => ({
      submit: (selectedAnswer: number) =>
        training.submitQuestionAnswer(selectedAnswer),
      close: () => {
        training.closeQuestion();
        modals.closeModal("question");

        // Check if TrainingComplete modal was deferred while question was open
        if (pendingTrainingCompleteRef.current) {
          pendingTrainingCompleteRef.current = false;
          // Small delay to ensure question modal is fully closed
          setTimeout(() => {
            modals.openTrainingComplete();
          }, 100);
        }
      },
    }),
    [training.submitQuestionAnswer, training.closeQuestion, modals],
  );
  // Phase success handlers - use specific functions
  const phaseActions = useMemo(
    () => ({
      continue: () => {
        const completedPhase = modals.completedPhase;
        if (
          completedPhase &&
          completedPhase.nextTaskIndex < TASK_SEQUENCE.length
        ) {
          const nextTask = TASK_SEQUENCE[completedPhase.nextTaskIndex];
          training.selectTool(nextTask.tool);
        }
        modals.closeModal("phaseSuccess");
      },
      retry: () => {
        const completedPhase = modals.completedPhase;
        if (completedPhase) {
          const currentTaskDef = TASK_SEQUENCE.find(
            (t) => t.taskId === completedPhase.taskId,
          );
          if (currentTaskDef) training.selectTool(currentTaskDef.tool);
        }
        modals.closeModal("phaseSuccess");
      },
    }),
    [modals.completedPhase, modals.closeModal, training.selectTool],
  );
  // Session selection handlers - delegates to useSessionSelection hook
  const sessionActions = useMemo(
    () => ({
      resume: sessionSelection.actions.resume,
      startNew: sessionSelection.actions.startNew,
      confirmResume: () => {
        modals.closeModal("resumeConfirmation");
        sessionSelection.actions.confirmResume(modals.resumePhaseIndex);
      },
      skipToTraining: async () => {
        // Mark that we're transitioning from cinematic to training (for walkthrough)
        isTransitioningToTrainingRef.current = true;
        // Store startTraining to call after walkthrough completes
        pendingTrainingStartRef.current = training.startTraining;
        // Show training walkthrough flag - will show after entering training mode
        setShowTrainingWalkthrough(true);
        // Transition to training mode but delay actual training start (for walkthrough)
        await sessionSelection.actions.skipToTraining({ delayTrainingStart: true });
      },
    }),
    [sessionSelection.actions, modals, training.startTraining],
  );
  // Connection/error handlers - use specific functions
  const connectionActions = useMemo(
    () => ({
      retry: () => {
        modals.closeModal("error");
        stream.setRetryCount(0);
        stream.setAvailableModels(undefined);
        stream.setModelDefinition(
          new (require("@pureweb/platform-sdk").UndefinedModelDefinition)(),
        );
        stream.setLoading(false);
        stream.setConnectionStatus("initializing");
        stream.initializePlatform(1);
      },
      refresh: () => window.location.reload(),
      sendTestMessage: (message: string) => training.sendRawMessage(message),
    }),
    [
      stream.setRetryCount,
      stream.setAvailableModels,
      stream.setModelDefinition,
      stream.setLoading,
      stream.setConnectionStatus,
      stream.initializePlatform,
      modals.closeModal,
      training.sendRawMessage,
    ],
  );
  // Session end/expiry handlers - use specific state properties to avoid re-renders
  const sessionEndActions = useMemo(
    () => ({
      login: () => {
        modals.closeModal("sessionEnd");
        redirectToSessionComplete({
          reason: "logged_out",
          role: userRole,
          progress: training.state.progress,
          phasesCompleted: training.state.currentTaskIndex,
          totalPhases: training.state.totalTasks,
          returnUrl: sessionReturnUrl,
          isLti: isLtiSession,
        });
      },
      expiry: () => modals.closeModal("sessionExpiry"),
      idle: () => {
        console.log(
          "⏰ [StreamingApp] Idle timeout - ending session due to inactivity",
        );
        import("@/app/services").then(({ trainingSessionService }) => {
          trainingSessionService
            .completeTraining({
              totalTimeMs: Date.now() - (sessionStartTime || Date.now()),
              phasesCompleted: training.state.totalTasks,
            })
            .then((result) => {
              if (result.success)
                console.log( "✅ [StreamingApp] Training session ended due to idle timeout");
            });
        });
        redirectToSessionComplete({
          reason: "idle",
          role: userRole,
          progress: training.state.progress,
          phasesCompleted: training.state.currentTaskIndex,
          totalPhases: training.state.totalTasks,
          returnUrl: sessionReturnUrl,
          isLti: isLtiSession,
        });
      },
      trainingComplete: () => modals.closeModal("trainingComplete"),
    }),
    [
      modals,
      userRole,
      training.state.progress,
      training.state.currentTaskIndex,
      training.state.totalTasks,
      sessionReturnUrl,
      isLtiSession,
      sessionStartTime,
    ],
  );
  // Training control handlers (pause/resume/quit) - use specific functions and properties
  const trainingControlActions = useMemo(
    () => ({
      pause: () => {
        training.pauseTraining();
        setIsTrainingPaused(true);
      },
      resume: () => {
        training.resumeTraining();
        setIsTrainingPaused(false);
      },
      quitClick: () => modals.openQuitTraining(),
      quitConfirm: async () => {
        console.log("🚪 Quitting training - saving progress");
        modals.closeModal("quitTraining");
        if (sessionStartTime) {
          const timeSpentMs = Date.now() - sessionStartTime;
          await trainingSessionService.recordTimeSpent(timeSpentMs);
        }

        // Staff (admin/teacher) with LTI session: redirect to /admin without clearing credentials
        const isStaff = userRole === "admin" || userRole === "teacher";
        if (isStaff && isLtiSession) {
          window.location.href = "/admin";
          return;
        }

        redirectToSessionComplete({
          reason: "quit",
          role: userRole,
          progress: training.state.progress,
          phasesCompleted: training.state.currentTaskIndex,
          totalPhases: training.state.totalTasks,
          returnUrl: sessionReturnUrl,
          isLti: isLtiSession,
        });
      },
      quitCancel: () => modals.closeModal("quitTraining"),
    }),
    [
      training.pauseTraining,
      training.resumeTraining,
      training.state.progress,
      training.state.currentTaskIndex,
      training.state.totalTasks,
      modals.openQuitTraining,
      modals.closeModal,
      sessionStartTime,
      userRole,
      sessionReturnUrl,
      isLtiSession,
    ],
  );
  // ==========================================================================
  // Loading Status (computed from pure function)
  // ==========================================================================

  const loadingStatus = getLoadingStatus({
    isRetrying: stream.isRetrying,
    streamerStatus: stream.streamerStatus,
    connectionStatus: stream.connectionStatus,
    availableModels: stream.availableModels,
    loading: stream.loading,
  });
  // ==========================================================================
  // Memoized Callbacks - Extracted from inline functions to prevent re-renders
  // ==========================================================================

  // Sidebar open change handler
  const handleSidebarOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen && forceSidebarOpen === true) {
      setForceSidebarOpen(undefined);
    }
  }, [forceSidebarOpen]);

  // Cinematic walkthrough handlers
  const handleCinematicComplete = useCallback(() => {
    setShowCinematicWalkthrough(false);
    setForceSidebarOpen(undefined);
    modals.openNavigationWalkthrough();
  }, [modals]);

  const handleCinematicSkip = useCallback(() => {
    setShowCinematicWalkthrough(false);
    setForceSidebarOpen(undefined);
    modals.openNavigationWalkthrough();
  }, [modals]);

  const handleOpenSidebar = useCallback(() => setForceSidebarOpen(true), []);
  const handleCloseSidebar = useCallback(() => setForceSidebarOpen(false), []);

  // Training walkthrough handlers
  const handleTrainingWalkthroughComplete = useCallback(() => {
    setShowTrainingWalkthrough(false);
    setForceSidebarOpen(false);
    setForceSidebarTab(undefined);
    setTimeout(() => {
      if (pendingTrainingStartRef.current) {
        pendingTrainingStartRef.current();
        pendingTrainingStartRef.current = null;
      }
      isTransitioningToTrainingRef.current = false;
      setForceSidebarOpen(undefined);
    }, 100);
  }, []);

  const handleTrainingWalkthroughSkip = useCallback(() => {
    setShowTrainingWalkthrough(false);
    setForceSidebarOpen(false);
    setForceSidebarTab(undefined);
    setTimeout(() => {
      if (pendingTrainingStartRef.current) {
        pendingTrainingStartRef.current();
        pendingTrainingStartRef.current = null;
      }
      isTransitioningToTrainingRef.current = false;
      setForceSidebarOpen(undefined);
    }, 100);
  }, []);

  const handleTrainingOpenSidebar = useCallback(() => {
    setForceSidebarOpen(true);
    setForceSidebarTab('inventory');
  }, []);

  const handleTrainingCloseSidebar = useCallback(() => {
    setForceSidebarOpen(false);
    setForceSidebarTab(undefined);
  }, []);

  // ==========================================================================
  // Loading Status (computed from pure function)
  // ==========================================================================

  // Force dark background when starter or loading screen is visible
  const forcesDarkBg =
    screenFlow.showStarterScreen ||
    screenFlow.showLoadingScreen ||
    screenFlow.showSessionSelection;
  // ==========================================================================
  // Main Render - Using New Modular Components
  // ==========================================================================
  return (
    <div
      className={`h-screen w-screen relative overflow-hidden ${forcesDarkBg ? "bg-[#1E1E1E]" : isDark ? "bg-[#1E1E1E]" : "bg-gray-100"}`}
    >
      {/* Theme Toggle - Hidden when connected (both cinematic and training sidebars have their own toggle) */}
      {/* ThemeToggle is only shown when NOT connected yet, as a standalone button */}

      {/* Unified Sidebar - Used for both cinematic and training modes */}
      {/* Training mode: includes materials, pause/resume/quit + all cinematic controls */}
      {/* Cinematic mode: explosion, waypoints, layers, camera controls */}
      {stream.isConnected && (
        <UnifiedSidebar
          mode={screenFlow.isCinematicMode ? "cinematic" : "training"}
          isVisible={
            screenFlow.isCinematicMode ||
            training.state.trainingStarted ||
            training.state.isActive ||
            training.state.mode === "training" ||
            showTrainingWalkthrough
          }
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
          // Training Controls Props (training mode only)
          isPaused={isTrainingPaused}
          onPause={trainingControlActions.pause}
          onResume={trainingControlActions.resume}
          onQuit={trainingControlActions.quitClick}
          // Stream Health Props (for reconnection)
          onReconnectStream={stream.reconnectStream}
          isReconnecting={stream.isReconnecting}
          streamHealthStatus={streamHealth.status}
          // Materials Props (training mode only)
          trainingState={training.state}
          onSelectPipe={training.selectPipe}
          onSelectPressureTest={training.selectPressureTest}
          // External control (for walkthrough)
          forceOpen={forceSidebarOpen}
          forceActiveTab={forceSidebarTab}
          onOpenChange={handleSidebarOpenChange}
          // Settings props - connected to UE5 via useSettings hook
          settingsState={{
            audioEnabled: settings.settings.audioEnabled,
            masterVolume: settings.settings.masterVolume,
            ambientVolume: settings.settings.ambientVolume,
            sfxVolume: settings.settings.sfxVolume,
            graphicsQuality: settings.settings.graphicsQuality,
            resolution: settings.settings.resolution,
            bandwidthOption: settings.settings.bandwidthOption,
            fpsTrackingEnabled: settings.settings.fpsTrackingEnabled,
            currentFps: settings.settings.currentFps,
            showFpsOverlay: settings.settings.showFpsOverlay,
          }}
          settingsCallbacks={{
            setAudioEnabled: settings.setAudioEnabled,
            setMasterVolume: settings.setMasterVolume,
            setAmbientVolume: settings.setAmbientVolume,
            setSfxVolume: settings.setSfxVolume,
            setGraphicsQuality: settings.setGraphicsQuality,
            setResolution: settings.setResolution,
            setBandwidthOption: settings.setBandwidthOption,
            setShowFpsOverlay: settings.setShowFpsOverlay,
          }}
        />
      )}
      {/* Cinematic Mode Timer - Show when connected and in cinematic mode */}
      {stream.isConnected && screenFlow.isCinematicMode && (
        <CinematicTimer
          duration={7200} // 2 hours
          initialTimeRemaining={persistence.cinematicTimeRemaining}
          onSkipToTraining={sessionActions.skipToTraining}
          onTimeChange={persistence.setCinematicTimeRemaining}
          isActive={screenFlow.isCinematicMode}
        />
      )}
      {/* Cinematic Mode Walkthrough - Show when connected and in cinematic mode */}
      {stream.isConnected && screenFlow.isCinematicMode && showCinematicWalkthrough && (
        <CinematicWalkthrough
          onComplete={handleCinematicComplete}
          onSkip={handleCinematicSkip}
          onOpenSidebar={handleOpenSidebar}
          onCloseSidebar={handleCloseSidebar}
        />
      )}
      {/* Training Mode Walkthrough - Show in training mode when transitioning from cinematic */}
      {stream.isConnected && !screenFlow.isCinematicMode && showTrainingWalkthrough && (
        <TrainingModeWalkthrough
          onComplete={handleTrainingWalkthroughComplete}
          onSkip={handleTrainingWalkthroughSkip}
          onOpenSidebar={handleTrainingOpenSidebar}
          onCloseSidebar={handleTrainingCloseSidebar}
        />
      )}
      {/* Control Panel (ToolBar) - Only show when stream is connected and NOT in cinematic mode */}
      {stream.isConnected && !screenFlow.isCinematicMode && (
        <ControlPanel
          isDark={isDark}
          onSelectTool={training.selectTool}
          onSelectPipe={training.selectPipe}
          onSelectPressureTest={training.selectPressureTest}
        />
      )}
      {/* Message Log - Only show when stream is connected and NOT in cinematic mode */}
      {stream.isConnected && !screenFlow.isCinematicMode && (
        <MessageLog
          messages={training.messageLog}
          lastMessage={training.lastMessage}
          onClear={training.clearLog}
          onSendTest={connectionActions.sendTestMessage}
          isConnected={training.isConnected || stream.isConnected}
          connectionStatus={
            training.isConnected
              ? "connected"
              : stream.isConnected
                ? "connected"
                : "connecting"
          }
          isDark={isDark}
        />
      )}
      {/* Video Stream */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      >
        <VideoStream
          VideoRef={videoRef}
          Emitter={stream.emitter}
          Stream={stream.videoStream || undefined}
          UseNativeTouchEvents={true}
          UsePointerLock={false}
          PointerLockRelease={true}
        />
      </div>
      {/* All Modals - Centralized in ModalContainer */}
      <ModalContainer
        modals={modals}
        trainingState={training.state}
        isLtiSession={isLtiSession}
        sessionReturnUrl={sessionReturnUrl}
        userRole={userRole}
        isTestUser={isTestUser}
        sessionExpiresAt={sessionExpiresAt}
        sessionsLoading={sessionSelection.sessionsLoading}
        isIdle={isIdle}
        resetIdle={resetIdle}
        questionActions={questionActions}
        phaseActions={phaseActions}
        connectionActions={connectionActions}
        sessionEndActions={sessionEndActions}
        sessionActions={sessionActions}
        trainingControlActions={trainingControlActions}
        onCloseNavigationWalkthrough={handleCloseNavigationWalkthrough}
      />
      {/* Starter Screen - Show after navigation walkthrough is closed */}
      <StarterScreen
        isOpen={screenFlow.showStarterScreen}
        title="Start Streaming"
        subtitle="Click the button below to begin your training session"
        onStart={sessionSelection.handleStartStream}
        onHover={handleStartHover}
        buttonText="Start"
      />
      {/* Session Selection Screen - Show when student has active sessions */}
      <SessionSelectionScreen
        isOpen={screenFlow.showSessionSelection}
        sessions={sessionSelection.activeSessions}
        onResumeSession={sessionActions.resume}
        onStartNewSession={sessionActions.startNew}
        loading={sessionSelection.sessionsLoading}
      />
      {/* Loading Screen - Show after user clicks start until stream is connected */}
      <LoadingScreen
        isOpen={screenFlow.showLoadingScreen && !modals.isOpen("error")}
        title="Please Wait!"
        subtitle="Session is loading"
        statusMessage={loadingStatus.message}
        currentStep={loadingStatus.step}
        retryCount={stream.retryCount}
        maxRetries={RETRY_CONFIG.maxRetries}
        showRetryInfo={stream.retryCount > 0}
      />
      {/* Settings Debug Panel - Developer tool (Ctrl+Shift+D to toggle) */}
      {stream.isConnected && (
        <SettingsDebugPanel sendMessage={training.sendRawMessage} />
      )}
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
  );
}
