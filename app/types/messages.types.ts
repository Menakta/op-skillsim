/**
 * Message Types
 *
 * Types for UE5 <-> Web communication protocol.
 */

// =============================================================================
// Message Direction Types
// =============================================================================

export type MessageDirection = 'sent' | 'received'

// =============================================================================
// Incoming Message Types (UE5 -> Web)
// =============================================================================

export type IncomingMessageType =
  | 'training_progress'
  | 'tool_change'
  | 'task_completed'
  | 'task_start'
  | 'task_complete'
  | 'task_debug'
  | 'question_request'
  | 'waypoint_list'
  | 'waypoint_update'
  | 'layer_list'
  | 'hierarchical_list'
  | 'layer_update'
  | 'explosion_update'
  | 'camera_update'
  | 'unknown'

// =============================================================================
// Outgoing Message Types (Web -> UE5)
// =============================================================================

export type OutgoingMessageType =
  | 'training_control'
  | 'tool_select'
  | 'task_start'
  | 'pipe_select'
  | 'test_plug_select'
  | 'pressure_test_start'
  | 'question_answer'
  | 'camera_control'
  | 'explosion_control'
  | 'waypoint_control'
  | 'layer_control'
  | 'hierarchical_control'
  | 'application_control'

// =============================================================================
// Parsed Message Types
// =============================================================================

export interface ParsedMessage {
  type: IncomingMessageType
  raw: string
  dataString: string
  data: Record<string, unknown>
  timestamp: number
}

export interface MessageLogEntry {
  id: string
  direction: MessageDirection
  type: string
  data: string
  raw: string
  timestamp: number
}

// =============================================================================
// Message Payload Types
// =============================================================================

export interface TrainingProgressPayload {
  progress: number
  taskName: string
  phase: string
  currentTask: number
  totalTasks: number
  isActive: boolean
}

export interface ToolChangePayload {
  toolName: string
}

export interface TaskCompletedPayload {
  taskId: string
}

export interface QuestionRequestPayload {
  questionId: string
}

export interface WaypointListPayload {
  count: number
  waypoints: Array<{ index: number; name: string }>
}

export interface LayerListPayload {
  count: number
  layers: Array<{ index: number; name: string; visible: boolean; actorCount: number }>
}

export interface HierarchicalListPayload {
  count: number
  groups: Array<{
    name: string
    visible: boolean
    isChild: boolean
    actorCount: number
    parentName?: string
    childIndex?: number
  }>
}

// =============================================================================
// Message Handler Types
// =============================================================================

export interface MessageHandlers {
  onTrainingProgress?: (data: TrainingProgressPayload) => void
  onToolChange?: (toolName: string) => void
  onTaskCompleted?: (taskId: string, nextTaskIndex: number) => void
  onTaskStart?: (toolName: string) => void
  onQuestionRequest?: (questionId: string) => void
  onMessage?: (message: { type: string; dataString: string }) => void
}
