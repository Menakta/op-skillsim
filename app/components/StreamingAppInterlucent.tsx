"use client";

/**
 * StreamingAppInterlucent - Interlucent version of StreamingApp
 *
 * This is the migrated version that uses Interlucent pixel streaming instead of PureWeb.
 * All features remain IDENTICAL - only the streaming provider changes.
 *
 * Key differences from PureWeb version:
 * - Uses InterlucientStream component instead of VideoStream
 * - Uses useInterlucientConnection instead of useStreamConnection
 * - Uses useTrainingMessagesCompositeInterlucent instead of useTrainingMessagesComposite
 * - Messages are sent as JSON (Interlucent format) instead of strings (PureWeb format)
 */

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
// Interlucent imports
import { InterlucientStream, type InterlucientStreamRef } from "@/app/features/streaming/components/InterlucientStream";
import { useInterlucientConnection, type ConnectionStatus } from "@/app/hooks/useInterlucientConnection";
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
} from "../features";
import { useIdleDetection } from "../features/idle";
import { TASK_SEQUENCE, RETRY_CONFIG } from "../config";
import { useTheme } from "../context/ThemeContext";
import { trainingSessionService } from "../services";

// =============================================================================
// Dynamic Imports - Lazy loaded when stream connects
// =============================================================================

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
const DebugPanel = dynamic(() => import("../components/DebugPanel"), {
  ssr: false,
  loading: () => null,
});
const ModalContainer = dynamic(() => import("../components/ModalContainer"), {
  ssr: false,
  loading: () => null,
});
const InfoPointOverlayWithState = dynamic(
  () => import("../features/measurement").then(mod => ({ default: mod.InfoPointOverlayWithState })),
  { ssr: false, loading: () => null }
);

// Lazy load hooks - deferred until needed
import { useTrainingMessagesCompositeInterlucent } from "../hooks/useTrainingMessagesCompositeInterlucent";
import { useModalManager } from "../hooks/useModalManager";
import { useScreenFlow } from "../hooks/useScreenFlow";
// Settings hook - UE5 settings communication
import { useSettings } from "../features/settings";
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
// Stream quality configuration
import {
  type StreamQualityPreset,
  STREAM_QUALITY_OPTIONS,
  getStreamQualityOption,
  loadStreamQuality,
  saveStreamQuality,
} from "../config/streamQuality.config";
// Message creation for resolution control
import { createResolutionMessage } from "../lib/messageTypes";
// InfoPoint overlay hook
import { useInfoPoints } from "../features/measurement";

// =============================================================================
// Helper Functions
// =============================================================================

interface LoadingStatusParams {
  isRetrying: boolean;
  connectionStatus: ConnectionStatus;
  isDataChannelOpen: boolean;
  isTokenLoading: boolean;
  admissionToken: string | null;
}

/**
 * Determines the loading status message and step based on connection state.
 */
function getLoadingStatus(params: LoadingStatusParams): {
  message: string;
  step: LoadingStep;
} {
  const {
    isRetrying,
    connectionStatus,
    isDataChannelOpen,
    isTokenLoading,
    admissionToken,
  } = params;

  if (isRetrying) {
    return { message: "Reconnecting to stream", step: "connecting" };
  }

  if (isDataChannelOpen) {
    return { message: "Stream connected", step: "streaming" };
  }

  if (connectionStatus === "connected") {
    return { message: "Establishing video stream", step: "streaming" };
  }

  switch (connectionStatus) {
    case "initializing":
      if (isTokenLoading) {
        return { message: "Getting stream token", step: "initializing" };
      }
      return { message: "Initializing platform", step: "initializing" };
    case "connecting":
      if (admissionToken) {
        return { message: "Launching stream", step: "launching" };
      }
      return { message: "Connecting to server", step: "connecting" };
    case "retrying":
      return { message: "Retrying connection", step: "connecting" };
    default:
      return { message: "Loading session", step: "initializing" };
  }
}

// =============================================================================
// Main Streaming App Component - Interlucent Version
// =============================================================================

export default function StreamingAppInterlucent() {
  // Ref to track if TrainingComplete modal should be shown after question closes
  const pendingTrainingCompleteRef = useRef(false);

  // Theme context
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Stream quality state
  const [streamQuality, setStreamQualityState] = useState<StreamQualityPreset>(() => loadStreamQuality());

  // Questions context - for getting total question count
  const { questionCount } = useQuestions();

  // ==========================================================================
  // Modal Manager - Centralized modal state
  // ==========================================================================
  const modals = useModalManager();

  // ==========================================================================
  // InfoPoint Overlay - Measurement markers
  // ==========================================================================
  const infoPointsManager = useInfoPoints();
  const streamContainerRef = useRef<HTMLDivElement>(null);

  // ==========================================================================
  // Screen Flow - State machine for screen transitions
  // ==========================================================================
  const screenFlow = useScreenFlow();

  // ==========================================================================
  // Interlucent Stream Connection
  // ==========================================================================
  const stream = useInterlucientConnection({
    streamStarted: screenFlow.streamStarted,
    onError: (error) => modals.openError(error),
    onConnected: (isFirstConnection) => {
      screenFlow.setConnected(true);
    },
    onSessionEnd: (reason) => modals.openSessionEnd(reason),
  });

  // ==========================================================================
  // Session Info - Manages session state and expiry tracking
  // ==========================================================================
  const { isLtiSession, isTestUser, userRole, sessionExpiresAt, sessionReturnUrl, sessionStartTime } = useSessionInfo({
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
  // Cinematic walkthrough state - check localStorage on init
  const [showCinematicWalkthrough, setShowCinematicWalkthrough] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('op-skillsim-cinematic-walkthrough-completed') !== 'true';
  });
  // Training walkthrough state - check localStorage on init
  const [showTrainingWalkthrough, setShowTrainingWalkthrough] = useState(() => {
    if (typeof window === 'undefined') return false;
    // Only show if cinematic is done but training isn't
    const cinematicDone = localStorage.getItem('op-skillsim-cinematic-walkthrough-completed') === 'true';
    const trainingDone = localStorage.getItem('op-skillsim-training-walkthrough-completed') === 'true';
    return cinematicDone && !trainingDone;
  });
  // Track if user is transitioning from cinematic to training
  const isTransitioningToTrainingRef = useRef(false);
  // Pending training start
  const pendingTrainingStartRef = useRef<(() => void) | null>(null);
  // Sidebar state
  const [forceSidebarOpen, setForceSidebarOpen] = useState<boolean | undefined>(undefined);
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
    import("../components/ControlPanel");
    import("../components/ThemeToggle");
    import("../components/MessageLog");
    import("../features/questions");
    import("../features/training");
    import("../features");
  }, []);

  // ==========================================================================
  // Training Messages Hook (Interlucent version)
  // ==========================================================================
  const training = useTrainingMessagesCompositeInterlucent(
    stream.streamRef,
    stream.isDataChannelOpen,
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
        if (modals.isOpen("question")) {
          console.log("⏳ Question modal is open - deferring TrainingComplete modal");
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

        if (modals.isOpen("question")) {
          console.log("⏳ Question modal is open - skipping PhaseSuccess modal for:", taskId);
          return;
        }

        const completedTaskDef = TASK_SEQUENCE[completedTaskIndex];
        console.log("📋 Completed task:", completedTaskDef?.name, "| UE5 sent taskId:", taskId);
        if (completedTaskDef && nextTaskIndex < TASK_SEQUENCE.length) {
          console.log("🎉 Showing phase success modal for:", completedTaskDef.name);
          modals.openPhaseSuccess({
            taskId: completedTaskDef.taskId,
            taskName: completedTaskDef.name,
            nextTaskIndex,
          });
        }
      },
    },
    {
      debug: true,
    },
  );

  // Sync training state to Redux store
  useReduxSync(training);

  // ==========================================================================
  // Measurement Guide Modal - Show when receiving tool_change:Measuring
  // ==========================================================================
  const measurementGuideShownRef = useRef(false);

  useEffect(() => {
    const lastMessage = training.lastMessage;
    if (!lastMessage) return;

    // Check if we received tool_change:Measuring message
    if (lastMessage.type === 'tool_change' && lastMessage.raw.includes('Measuring') && !measurementGuideShownRef.current) {
      console.log("📏 Received tool_change:Measuring - showing measurement guide");
      measurementGuideShownRef.current = true;
      modals.openMeasurementGuide();
    }

    // Reset the flag when tool changes away from Measuring
    if (lastMessage.type === 'tool_change' && !lastMessage.raw.includes('Measuring')) {
      measurementGuideShownRef.current = false;
    }
  }, [training.lastMessage, modals]);

  // ==========================================================================
  // Settings Hook - UE5 Settings Communication
  // ==========================================================================
  const handleSettingApplied = useCallback((settingType: string, value: string, success: boolean) => {
    console.log(
      success ? "✅" : "❌",
      `Setting ${settingType}:`,
      value,
      success ? "applied" : "failed"
    );
  }, []);

  const handleFpsUpdate = useCallback(() => {}, []);

  const settings = useSettings(training.sendRawMessage, {
    debug: true,
    onSettingApplied: handleSettingApplied,
    onFpsUpdate: handleFpsUpdate,
  });

  // Stable ref for handleSettingsMessage
  const handleSettingsMessageRef = useRef(settings.handleSettingsMessage);
  handleSettingsMessageRef.current = settings.handleSettingsMessage;

  // Subscribe to settings messages from UE5
  useEffect(() => {
    if (!training.lastMessage) return;
    handleSettingsMessageRef.current(training.lastMessage);
  }, [training.lastMessage]);

  // ==========================================================================
  // InfoPoint Message Handler - Handle measurement point markers
  // ==========================================================================
  const handleInfoPointRef = useRef(infoPointsManager.handleInfoPoint);
  const handleMeasurementGuidanceRef = useRef(infoPointsManager.handleMeasurementGuidance);
  handleInfoPointRef.current = infoPointsManager.handleInfoPoint;
  handleMeasurementGuidanceRef.current = infoPointsManager.handleMeasurementGuidance;

  useEffect(() => {
    const lastMessage = training.lastMessage;
    if (!lastMessage) return;

    // Handle info_point messages
    if (lastMessage.type === 'info_point') {
      const data = lastMessage.data as import('../lib/messageTypes').InfoPointData;
      console.log("📍 InfoPoint:", data.id, data.visible ? 'show' : 'hide');
      handleInfoPointRef.current(data);
    }

    // Handle measurement_guidance messages
    if (lastMessage.type === 'measurement_guidance') {
      const data = lastMessage.data as import('../lib/messageTypes').MeasurementGuidanceData;
      console.log("📏 MeasurementGuidance:", data.visible ? 'show' : 'hide', data.distance);
      handleMeasurementGuidanceRef.current(data);
    }
  }, [training.lastMessage]);

  // ==========================================================================
  // Stream Quality Control - Sends resolution changes to UE5
  // ==========================================================================
  const setStreamQuality = useCallback((preset: StreamQualityPreset) => {
    // Update local state and persist to localStorage
    setStreamQualityState(preset);
    saveStreamQuality(preset);

    // Send resolution change to UE5 via message bus
    const { maxWidth, maxHeight } = getStreamQualityOption(preset).resolution;
    const message = createResolutionMessage(maxWidth, maxHeight);
    console.log(`📺 Stream quality changed to ${preset} (${maxWidth}x${maxHeight})`);
    training.sendRawMessage(message);
  }, [training.sendRawMessage]);

  // ==========================================================================
  // Training Persistence - Auto-save and quiz submission
  // ==========================================================================
  const persistence = useTrainingPersistence(
    {
      enabled: isLtiSession && userRole === "student",
      userRole,
      isConnected: stream.isConnected,
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
      isConnected: stream.isConnected,
    },
    {
      goToLoadingForCinematic: screenFlow.goToLoadingForCinematic,
      goToLoadingForTraining: screenFlow.goToLoadingForTraining,
      goToSessionSelection: screenFlow.goToSessionSelection,
      goToTraining: screenFlow.goToTraining,
      goToCinematic: screenFlow.goToCinematic,

      openResumeConfirmation: modals.openResumeConfirmation,
      closeNavigationWalkthrough: () => modals.closeModal("navigationWalkthrough"),

      setTrainingPhase: training.hooks.trainingState.setPhase,
      setCurrentTaskIndex: training.hooks.trainingState.setCurrentTaskIndex,
      startTraining: training.startTraining,
      startFromTask: training.startFromTask,

      restoreState: persistence.statePersistence.restoreState,
      restoreQuizAnswers: training.restoreQuizAnswers,

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

  // Idle detection - uses default 15-minute timeout from hook
  // Disabled when training is paused (user intentionally paused, shouldn't be kicked)
  const { isIdle, resetIdle } = useIdleDetection({
    enabled: stream.isConnected && !isTrainingPaused,
  });

  // Stream health (simplified for Interlucent)
  const streamHealth = { status: 'healthy' as const };

  // ==========================================================================
  // Consolidated Action Handlers
  // ==========================================================================

  const questionActions = useMemo(
    () => ({
      submit: (selectedAnswer: number) => training.submitQuestionAnswer(selectedAnswer),
      close: () => {
        training.closeQuestion();
        modals.closeModal("question");
        if (pendingTrainingCompleteRef.current) {
          pendingTrainingCompleteRef.current = false;
          setTimeout(() => {
            modals.openTrainingComplete();
          }, 100);
        }
      },
    }),
    [training.submitQuestionAnswer, training.closeQuestion, modals],
  );

  const phaseActions = useMemo(
    () => ({
      continue: () => {
        const completedPhase = modals.completedPhase;
        if (completedPhase && completedPhase.nextTaskIndex < TASK_SEQUENCE.length) {
          const nextTask = TASK_SEQUENCE[completedPhase.nextTaskIndex];
          training.selectTool(nextTask.tool);
        }
        modals.closeModal("phaseSuccess");
      },
      retry: () => {
        const completedPhase = modals.completedPhase;
        if (completedPhase) {
          const currentTaskDef = TASK_SEQUENCE.find((t) => t.taskId === completedPhase.taskId);
          if (currentTaskDef) training.selectTool(currentTaskDef.tool);
        }
        modals.closeModal("phaseSuccess");
      },
    }),
    [modals.completedPhase, modals.closeModal, training.selectTool],
  );

  const sessionActions = useMemo(
    () => ({
      resume: sessionSelection.actions.resume,
      startNew: sessionSelection.actions.startNew,
      confirmResume: () => {
        console.log(`🔄 confirmResume called with modals.resumePhaseIndex=${modals.resumePhaseIndex}`)
        modals.closeModal("resumeConfirmation");
        sessionSelection.actions.confirmResume(modals.resumePhaseIndex);
      },
      skipToTraining: async () => {
        isTransitioningToTrainingRef.current = true;
        pendingTrainingStartRef.current = training.startTraining;
        setShowTrainingWalkthrough(true);
        await sessionSelection.actions.skipToTraining({ delayTrainingStart: true });
      },
    }),
    [sessionSelection.actions, modals, training.startTraining],
  );

  const connectionActions = useMemo(
    () => ({
      retry: () => {
        modals.closeModal("error");
        stream.reconnect();
      },
      refresh: () => window.location.reload(),
      sendTestMessage: (message: string) => training.sendRawMessage(message),
    }),
    [stream.reconnect, modals.closeModal, training.sendRawMessage],
  );

  const sessionEndActions = useMemo(
    () => ({
      login: () => {
        const modalReason = modals.sessionEndReason || "other";
        const actualReason = modalReason === "inactive" ? "idle" : modalReason;
        modals.closeModal("sessionEnd");
        redirectToSessionComplete({
          reason: actualReason as 'expired' | 'idle' | 'logged_out' | 'disconnected' | 'other',
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
        console.log("⏰ [StreamingApp] Idle timeout - ending session due to inactivity");
        import("@/app/services").then(({ trainingSessionService }) => {
          trainingSessionService
            .completeTraining({
              totalTimeMs: Date.now() - (sessionStartTime || Date.now()),
              phasesCompleted: training.state.totalTasks,
            })
            .then((result) => {
              if (result.success) console.log("✅ [StreamingApp] Training session ended due to idle timeout");
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
      modals.sessionEndReason,
      userRole,
      training.state.progress,
      training.state.currentTaskIndex,
      training.state.totalTasks,
      sessionReturnUrl,
      isLtiSession,
      sessionStartTime,
    ],
  );

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
  // Loading Status
  // ==========================================================================
  const loadingStatus = getLoadingStatus({
    isRetrying: stream.isRetrying,
    connectionStatus: stream.connectionStatus,
    isDataChannelOpen: stream.isDataChannelOpen,
    isTokenLoading: stream.isTokenLoading,
    admissionToken: stream.admissionToken,
  });

  // ==========================================================================
  // Memoized Callbacks
  // ==========================================================================
  const handleSidebarOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen && forceSidebarOpen === true) {
      setForceSidebarOpen(undefined);
    }
  }, [forceSidebarOpen]);

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

  const handleTrainingWalkthroughComplete = useCallback(() => {
    console.log('🎓 Training walkthrough COMPLETE');
    setShowTrainingWalkthrough(false);
    setForceSidebarOpen(false);
    setForceSidebarTab(undefined);
    setTimeout(() => {
      console.log('🎓 Checking pendingTrainingStartRef:', !!pendingTrainingStartRef.current);
      if (pendingTrainingStartRef.current) {
        console.log('🎓 Calling pendingTrainingStartRef (startTraining)');
        pendingTrainingStartRef.current();
        pendingTrainingStartRef.current = null;
      }
      isTransitioningToTrainingRef.current = false;
      setForceSidebarOpen(undefined);
    }, 100);
  }, []);

  const handleTrainingWalkthroughSkip = useCallback(() => {
    console.log('🎓 Training walkthrough SKIPPED');
    setShowTrainingWalkthrough(false);
    setForceSidebarOpen(false);
    setForceSidebarTab(undefined);
    setTimeout(() => {
      console.log('🎓 Checking pendingTrainingStartRef:', !!pendingTrainingStartRef.current);
      if (pendingTrainingStartRef.current) {
        console.log('🎓 Calling pendingTrainingStartRef (startTraining)');
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
  // Reconnect handler for Interlucent
  // ==========================================================================
  const handleReconnectStream = useCallback(async () => {
    await stream.reconnect();
  }, [stream.reconnect]);

  // Force dark background when starter or loading screen is visible
  const forcesDarkBg =
    screenFlow.showStarterScreen ||
    screenFlow.showLoadingScreen ||
    screenFlow.showSessionSelection;

  // ==========================================================================
  // Main Render
  // ==========================================================================
  return (
    <div
      className={`h-screen w-screen relative overflow-hidden ${forcesDarkBg ? "bg-[#1E1E1E]" : isDark ? "bg-[#1E1E1E]" : "bg-gray-100"}`}
    >
      {/* Unified Sidebar */}
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
          explosionValue={training.state.explosionValue}
          onExplosionValueChange={training.setExplosionLevel}
          onExplode={training.explodeBuilding}
          onAssemble={training.assembleBuilding}
          waypoints={training.state.waypoints}
          activeWaypointIndex={training.state.activeWaypointIndex}
          activeWaypointName={training.state.activeWaypointName}
          onRefreshWaypoints={training.refreshWaypoints}
          onActivateWaypoint={training.activateWaypoint}
          onDeactivateWaypoint={training.deactivateWaypoint}
          onWaypointProgressChange={training.setExplosionLevel}
          cameraPerspective={training.state.cameraPerspective}
          cameraMode={training.state.cameraMode}
          onSetCameraPerspective={training.setCameraPerspective}
          onToggleAutoOrbit={training.toggleAutoOrbit}
          onResetCamera={training.resetCamera}
          hierarchicalGroups={training.state.hierarchicalGroups}
          onRefreshLayers={training.refreshHierarchicalLayers}
          onToggleMainGroup={training.toggleMainGroup}
          onToggleChildGroup={training.toggleChildGroup}
          onShowAllLayers={training.showAllLayers}
          onHideAllLayers={training.hideAllLayers}
          isPaused={isTrainingPaused}
          onPause={trainingControlActions.pause}
          onResume={trainingControlActions.resume}
          onQuit={trainingControlActions.quitClick}
          onReconnectStream={handleReconnectStream}
          isReconnecting={stream.isRetrying}
          streamHealthStatus={streamHealth.status}
          trainingState={training.state}
          onSelectPipe={training.selectPipe}
          onSelectPressureTest={training.selectPressureTest}
          xrayFloorValue={training.state.xrayFloorValue}
          xrayWallValue={training.state.xrayWallValue}
          onXRayFloorChange={training.setXRayFloorValue}
          onXRayWallChange={training.setXRayWallValue}
          forceOpen={forceSidebarOpen}
          forceActiveTab={forceSidebarTab}
          onOpenChange={handleSidebarOpenChange}
          controlsLocked={showCinematicWalkthrough || showTrainingWalkthrough}
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
          streamQuality={streamQuality}
          streamQualityOptions={STREAM_QUALITY_OPTIONS}
          onStreamQualityChange={setStreamQuality}
        />
      )}

      {/* Cinematic Mode Timer */}
      {stream.isConnected && screenFlow.isCinematicMode && (
        <CinematicTimer
          duration={7200}
          initialTimeRemaining={persistence.cinematicTimeRemaining}
          onSkipToTraining={sessionActions.skipToTraining}
          onTimeChange={persistence.setCinematicTimeRemaining}
          isActive={screenFlow.isCinematicMode}
        />
      )}

      {/* Cinematic Mode Walkthrough */}
      {stream.isConnected && screenFlow.isCinematicMode && showCinematicWalkthrough && (
        <CinematicWalkthrough
          onComplete={handleCinematicComplete}
          onSkip={handleCinematicSkip}
          onOpenSidebar={handleOpenSidebar}
          onCloseSidebar={handleCloseSidebar}
          isLtiSession={isLtiSession}
        />
      )}

      {/* Training Mode Walkthrough */}
      {stream.isConnected && !screenFlow.isCinematicMode && showTrainingWalkthrough && (
        <TrainingModeWalkthrough
          onComplete={handleTrainingWalkthroughComplete}
          onSkip={handleTrainingWalkthroughSkip}
          onOpenSidebar={handleTrainingOpenSidebar}
          onCloseSidebar={handleTrainingCloseSidebar}
          isLtiSession={isLtiSession}
        />
      )}

      {/* Control Panel (ToolBar) */}
      {stream.isConnected && !screenFlow.isCinematicMode && (
        <ControlPanel
          isDark={isDark}
          onSelectTool={training.selectTool}
          onSelectPipe={training.selectPipe}
          onSelectPressureTest={training.selectPressureTest}
        />
      )}

      {/* Message Log */}
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

      {/* Debug Panel - Shows streaming provider info */}
      {stream.isConnected && !screenFlow.isCinematicMode && (
        <DebugPanel
          connectionStatus={
            stream.isConnected
              ? "connected"
              : stream.connectionStatus === "connecting"
                ? "connecting"
                : "disconnected"
          }
          isUsingRelay={stream.isUsingRelay}
          forceRelay={false}
          interlucientStatus={stream.interlucientStatus}
          sessionId={stream.sessionId}
          isDataChannelOpen={stream.isDataChannelOpen}
          isDark={isDark}
        />
      )}

      {/* Interlucent Video Stream */}
      <div
        ref={streamContainerRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      >
        <InterlucientStream
          ref={stream.streamRef}
          admissionToken={stream.admissionToken || undefined}
          onStatusChange={stream.handleStatusChange}
          onDataChannelOpen={stream.handleDataChannelOpen}
          onMessage={training.hooks.messageBus.handleIncomingMessage}
          onSessionEnded={stream.handleSessionEnded}
          onError={stream.handleError}
          onTransportSelected={stream.handleTransportSelected}
          swiftJobRequest={true}
          forceRelay={false}
          queueWaitTolerance={60}
          webrtcNegotiationTolerance={15}
          reconnectMode="recover"
          reconnectAttempts={3}
        />

        {/* InfoPoint Overlay - Measurement markers */}
        <InfoPointOverlayWithState
          containerRef={streamContainerRef}
          infoPoints={infoPointsManager.infoPoints}
          measurementLine={infoPointsManager.measurementLine}
        />
      </div>

      {/* All Modals */}
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

      {/* Starter Screen */}
      <StarterScreen
        isOpen={screenFlow.showStarterScreen}
        title="Start Streaming"
        subtitle="Click the button below to begin your training session"
        onStart={sessionSelection.handleStartStream}
        onHover={handleStartHover}
        buttonText="Start"
      />

      {/* Session Selection Screen */}
      <SessionSelectionScreen
        isOpen={screenFlow.showSessionSelection}
        sessions={sessionSelection.activeSessions}
        onResumeSession={sessionActions.resume}
        onStartNewSession={sessionActions.startNew}
        loading={sessionSelection.sessionsLoading}
      />

      {/* Loading Screen */}
      <LoadingScreen
        isOpen={screenFlow.showLoadingScreen && !modals.isOpen("error")}
        title="Please Wait!"
        subtitle="Session is loading"
        statusMessage={loadingStatus.message}
        currentStep={loadingStatus.step}
        retryCount={0}
        maxRetries={RETRY_CONFIG.maxRetries}
        showRetryInfo={false}
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
  );
}
