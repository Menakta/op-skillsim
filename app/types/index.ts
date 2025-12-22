/**
 * Types Index
 *
 * Central export for all application types.
 * Import from '@/app/types' for convenient access.
 */

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
