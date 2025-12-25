/**
 * Types Index
 *
 * Central export for all application types.
 * Import from '@/app/types' for convenient access.
 */

// =============================================================================
// Session Types
// =============================================================================

export type {
  UserRole,
  SessionType,
  LtiContext,
  BaseSession,
  StudentSession,
  TeacherSession,
  AdminSession,
  UserSession,
  SessionValidationResponse,
  SessionJwtPayload,
  TeacherPermissions,
  AdminPermissions,
} from './session.types'

export {
  DEFAULT_TEACHER_PERMISSIONS,
  DEFAULT_ADMIN_PERMISSIONS,
  isStudentSession,
  isTeacherSession,
  isAdminSession,
  isStaffSession,
  canAccessAdmin,
  canEditQuestionnaires,
  canManageUsers,
} from './session.types'

// =============================================================================
// Training Types
// =============================================================================

export type {
  // Tool types
  ToolName,
  PipeType,
  PressureTestType,

  // Task types
  TaskDefinition,
  ToolInfo,
  PipeInfo,

  // Training control types
  TrainingControlAction,
  TrainingMode,
  UiMode,

  // Training state types
  TrainingProgressData,
  TrainingState,

  // Question types
  QuestionData,

  // Camera types
  CameraPerspective,
  CameraMode,
  CameraUpdateData,

  // Explosion types
  ExplosionUpdateData,

  // Layer types
  LayerData,
  HierarchicalLayerData,

  // Waypoint types
  WaypointData,
  WaypointUpdateData,
} from './training.types'

// =============================================================================
// Message Types
// =============================================================================

export type {
  // Direction types
  MessageDirection,

  // Message type enums
  IncomingMessageType,
  OutgoingMessageType,

  // Parsed message types
  ParsedMessage,
  MessageLogEntry,

  // Payload types
  TrainingProgressPayload,
  ToolChangePayload,
  TaskCompletedPayload,
  QuestionRequestPayload,
  WaypointListPayload,
  LayerListPayload,
  HierarchicalListPayload,

  // Handler types
  MessageHandlers,
} from './messages.types'

// =============================================================================
// UI Types
// =============================================================================

export type {
  // Modal types
  BaseModalProps,
  ModalSize,
  ModalCloseButtonColor,

  // Button types
  ButtonVariant,
  ButtonSize,

  // Theme types
  Theme,
  ThemeColors,

  // Screen state types
  ScreenState,

  // Modal state types
  ModalState,
  CompletedPhase,

  // Connection types
  ConnectionStatus,
  ConnectionState,

  // Loading types
  LoadingState,

  // Tab types
  ControlPanelTab,
  TabConfig,
} from './ui.types'

// =============================================================================
// Quiz Types
// =============================================================================

export type {
  AnswerOption,
  QuizResponse,
  QuizResponseInsert,
  SubmitQuizAnswerRequest,
  SubmitQuizAnswerResponse,
  QuizStatistics,
} from './quiz.types'

export {
  indexToAnswer,
  answerToIndex,
} from './quiz.types'

// =============================================================================
// Training Session Types (Database)
// =============================================================================

export type {
  TrainingSessionStatus,
  TrainingSession,
  TrainingFinalResults,
  PhaseScore,
  QuizPerformance,
  TrainingSessionInsert,
  TrainingSessionUpdate,
  StartTrainingRequest,
  UpdateProgressRequest,
  CompletePhaseRequest,
  CompleteTrainingRequest,
  TrainingSessionResponse,
  TrainingProgressResponse,
} from './training-session.types'

// =============================================================================
// Fitting Option Types
// =============================================================================

export type {
  FittingOption,
  FittingOptionInsert,
  FittingOptionUpdate,
  FittingOptionsResponse,
  FittingOptionResponse,
} from './fitting.types'
