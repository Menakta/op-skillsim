/**
 * Training Types
 *
 * Core types related to training workflow, tasks, and tools.
 */

// =============================================================================
// Tool Types
// =============================================================================

export type ToolName = 'XRay' | 'Shovel' | 'Measuring' | 'PipeConnection' | 'Glue' | 'PressureTester' | 'None'

/** Dynamic pipe type - fitting_id from Supabase fitting_options table */
export type PipeType = string

export type PressureTestType = 'air-plug' | 'conduct-test'

// =============================================================================
// Task Types
// =============================================================================

export interface TaskDefinition {
  tool: ToolName
  name: string
  taskId: string
  description?: string
  icon?: string
}

export interface ToolInfo {
  icon: string
  name: string
  description: string
  shortName?: string
}

export interface PipeInfo {
  name: string
  displayName: string
  description: string
}

// =============================================================================
// Training Control Types
// =============================================================================

export type TrainingControlAction = 'start' | 'pause' | 'reset' | 'test'

export type TrainingMode = 'cinematic' | 'training'

export type UiMode = 'normal' | 'waypoint' | 'task'

// =============================================================================
// Training State Types
// =============================================================================

export interface TrainingProgressData {
  progress: number
  taskName: string
  phase: string
  currentTask: number
  totalTasks: number
  isActive: boolean
}

export interface TrainingState {
  // Training mode and progress
  mode: TrainingMode
  uiMode: UiMode
  progress: number
  taskName: string
  phase: string
  currentTaskIndex: number
  totalTasks: number
  isActive: boolean
  trainingStarted: boolean

  // Tool state
  currentTool: ToolName
  selectedTool: ToolName | null
  selectedPipe: PipeType | null
  airPlugSelected: boolean

  // Question state
  currentQuestion: QuestionData | null
  questionTryCount: number
  questionAnsweredCorrectly: boolean

  // Camera state
  cameraMode: CameraMode
  cameraPerspective: string
  cameraDistance: number

  // Explosion state
  explosionValue: number
  isAnimating: boolean

  // Layer state
  layers: LayerData[]
  hierarchicalGroups: HierarchicalLayerData[]
  waypoints: WaypointData[]
  activeWaypointIndex: number
  activeWaypointName: string
}

// =============================================================================
// Question Types
// =============================================================================

export interface QuestionData {
  id: string
  name: string
  text: string
  options: string[]
  correctAnswer: number
  explanation: string
  category?: 'scanning' | 'excavation' | 'measurement' | 'connection' | 'testing'
}

// =============================================================================
// Camera Types
// =============================================================================

export type CameraPerspective =
  | 'Front' | 'Back' | 'Left' | 'Right' | 'Top' | 'Bottom'
  | 'IsometricNE' | 'IsometricSE' | 'IsometricSW'

export type CameraMode = 'Manual' | 'Orbit'

export interface CameraUpdateData {
  mode: CameraMode
  perspective: string
  distance: number
  isTransitioning: boolean
}

// =============================================================================
// Explosion Types
// =============================================================================

export interface ExplosionUpdateData {
  value: number
  isAnimating: boolean
}

// =============================================================================
// Layer Types
// =============================================================================

export interface LayerData {
  index: number
  name: string
  visible: boolean
  actorCount: number
}

export interface HierarchicalLayerData {
  name: string
  visible: boolean
  isChild: boolean
  actorCount: number
  parentName?: string
  childIndex?: number
}

// =============================================================================
// Waypoint Types
// =============================================================================

export interface WaypointData {
  index: number
  name: string
}

export interface WaypointUpdateData {
  activeIndex: number
  name: string
  isActive: boolean
  progress: number
}
