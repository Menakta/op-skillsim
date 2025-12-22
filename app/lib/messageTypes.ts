/**
 * OP SkillSim Message Protocol
 *
 * Based on player(2).html message flow patterns.
 * Uses simple string format: "type:data" for bidirectional communication.
 *
 * SEND: emitter.EmitUIInteraction("type:data")
 * RECEIVE: messageSubject.subscribe((message: string) => parseMessage(message))
 */

// =============================================================================
// Message Format Constants (matching player(2).html)
// =============================================================================

/**
 * Web → UE5 Message Types
 */
export const WEB_TO_UE_MESSAGES = {
  // Training Control
  TRAINING_CONTROL: 'training_control',  // start, pause, reset, test

  // Tool Selection
  TOOL_SELECT: 'tool_select',            // XRay, Shovel, Measuring, PipeConnection, Glue, PressureTester

  // Task Control
  TASK_START: 'task_start',              // ToolName or ToolName:PipeType

  // Pipe Selection
  PIPE_SELECT: 'pipe_select',            // y-junction, elbow, 100mm, 150mm

  // Pressure Testing
  TEST_PLUG_SELECT: 'test_plug_select',  // AirPlug
  PRESSURE_TEST_START: 'pressure_test_start', // air_test, player_closed_q6

  // Question/Answer
  QUESTION_ANSWER: 'question_answer',    // Q1:1:true (questionId:tryCount:isCorrect)

  // Camera Control
  CAMERA_CONTROL: 'camera_control',      // Front, Back, Left, Right, Top, Bottom, IsometricNE/SE/SW, orbit_start, orbit_stop, reset

  // Explosion Control
  EXPLOSION_CONTROL: 'explosion_control', // explode, assemble, or 0-100 (percentage)

  // Waypoint Control
  WAYPOINT_CONTROL: 'waypoint_control',  // list, activate:0, deactivate

  // Layer Control
  LAYER_CONTROL: 'layer_control',        // list, toggle:0, isolate:0
  HIERARCHICAL_CONTROL: 'hierarchical_control', // list, show_all, hide_all, toggle_main:GroupName, toggle_child:ParentName:0

  // Application Control
  APPLICATION_CONTROL: 'application_control' // quit
} as const

/**
 * UE5 → Web Message Types
 */
export const UE_TO_WEB_MESSAGES = {
  // Training Progress
  TRAINING_PROGRESS: 'training_progress',   // progress%:taskName:phase:currentTask:totalTasks:isActive

  // Tool
  TOOL_CHANGE: 'tool_change',               // toolName

  // Task
  TASK_COMPLETED: 'task_completed',         // taskId
  TASK_START: 'task_start',                 // toolName
  TASK_COMPLETE: 'task_complete',           // (no data)
  TASK_DEBUG: 'task_debug',                 // debug message

  // Question
  QUESTION_REQUEST: 'question_request',     // Q1-Q6

  // Waypoints
  WAYPOINT_LIST: 'waypoint_list',           // count:index:name,...
  WAYPOINT_UPDATE: 'waypoint_update',       // activeIndex:name:isActive:progress%

  // Layers
  LAYER_LIST: 'layer_list',                 // count:index:name:visible:actorCount,...
  HIERARCHICAL_LIST: 'hierarchical_list',   // count:name:visible:isChild:actorCount:parentName:childIndex,...
  LAYER_UPDATE: 'layer_update',             // (triggers refresh)

  // Explosion
  EXPLOSION_UPDATE: 'explosion_update',     // value:isAnimating

  // Camera
  CAMERA_UPDATE: 'camera_update'            // mode:perspective:distance:isTransitioning
} as const

// =============================================================================
// Tool and Task Definitions
// =============================================================================

export type ToolName = 'XRay' | 'Shovel' | 'Measuring' | 'PipeConnection' | 'Glue' | 'PressureTester' | 'None'

export type PipeType = 'y-junction' | 'elbow' | '100mm' | '150mm'

export type PressureTestType = 'air-plug' | 'conduct-test'

export type CameraPerspective =
  | 'Front' | 'Back' | 'Left' | 'Right' | 'Top' | 'Bottom'
  | 'IsometricNE' | 'IsometricSE' | 'IsometricSW'

export type CameraMode = 'Manual' | 'Orbit'

export type TrainingControlAction = 'start' | 'pause' | 'reset' | 'test'

/**
 * Task sequence and TaskDefinition are now in @/app/config/tasks.config.ts
 * Import from '@/app/config' instead
 */

// =============================================================================
// Question Database (Q1-Q6)
// =============================================================================

export interface QuestionData {
  id: string
  name: string
  text: string
  options: string[]
  correctAnswer: number
  explanation: string
}

export const QUESTION_DATABASE: Record<string, QuestionData> = {
  'Q1': {
    id: 'Q1',
    name:'Scanning',
    text: "What should you do before excavating near existing utilities?",
    options: ["Start digging immediately", "Use XRay scanner to locate pipes", "Call for permits only", "Mark the area with spray paint"],
    correctAnswer: 1,
    explanation: "XRay scanning must be performed first to safely locate existing pipes and utilities before any excavation work begins."
  },
  'Q2': {
    id: 'Q2',
    name:'Trench Depth',
    text: "What is the minimum excavation depth for toilet waste pipe connections?",
    options: ["200mm", "300mm", "450mm", "600mm"],
    correctAnswer: 2,
    explanation: "Toilet waste pipe connections typically require a minimum excavation depth of 450mm to ensure proper fall and connection to the main sewer line."
  },
  'Q3': {
    id: 'Q3',
    name:'Trench Width',
    text: "What is the standard trench width for 100mm pipes?",
    options: ["200mm", "300mm", "400mm", "500mm"],
    correctAnswer: 2,
    explanation: "Trenches should be 3-4 times the pipe diameter, so 400mm for 100mm pipes."
  },
  'Q4': {
    id: 'Q4',
    name:'Pipe Slope',
    text: "What is the correct slope for drainage pipes?",
    options: ["1:40", "1:60", "1:80", "1:100"],
    correctAnswer: 1,
    explanation: "A slope of 1:60 (1.67%) ensures proper drainage flow for most applications."
  },
  'Q5': {
    id: 'Q5',
    name:'Pressure',
    text: "Maximum pressure for residential water systems?",
    options: ["350 kPa", "500 kPa", "650 kPa", "800 kPa"],
    correctAnswer: 1,
    explanation: "Residential water systems typically operate at 500 kPa maximum pressure."
  },
  'Q6': {
    id: 'Q6',
    name:'PSI Level',
    text: "What PSI level confirms a successful air pressure test according to NZS3500?",
    options: ["10 PSI", "15 PSI", "20 PSI", "25 PSI"],
    correctAnswer: 2,
    explanation: "According to NZS3500 standards, a successful air pressure test requires maintaining 20 PSI for the specified test duration without pressure loss."
  }
}

// =============================================================================
// Parsed Message Types
// =============================================================================

export interface TrainingProgressData {
  progress: number
  taskName: string
  phase: string
  currentTask: number
  totalTasks: number
  isActive: boolean
  [key: string]: unknown
}

export interface ExplosionUpdateData {
  value: number
  isAnimating: boolean
  [key: string]: unknown
}

export interface CameraUpdateData {
  mode: CameraMode
  perspective: string
  distance: number
  isTransitioning: boolean
  [key: string]: unknown
}

export interface WaypointData {
  index: number
  name: string
  [key: string]: unknown
}

export interface WaypointUpdateData {
  activeIndex: number
  name: string
  isActive: boolean
  progress: number
  [key: string]: unknown
}

// Re-export TrainingState from hook for backward compatibility
export type { TrainingState } from '../hooks/useTrainingMessagesComposite'

// Legacy type alias for backward compatibility
export type TrainingAction = TrainingControlAction

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
// Incoming Message Union Type
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

export interface ParsedMessage {
  type: IncomingMessageType
  raw: string
  dataString: string
  data: Record<string, unknown>
  timestamp: number
}

// =============================================================================
// Message Parsing Functions
// =============================================================================

/**
 * Parse raw message string from UE5
 * Format: "type:data" where data can contain additional colons
 */
export function parseMessage(raw: string): ParsedMessage | null {
  if (!raw || raw.trim() === '') {
    return null
  }

  // Split only on first colon to preserve colons in data
  const colonIndex = raw.indexOf(':')
  if (colonIndex === -1) {
    // Message with no data
    return {
      type: raw as IncomingMessageType,
      raw,
      dataString: '',
      data: {},
      timestamp: Date.now()
    }
  }

  const type = raw.substring(0, colonIndex) as IncomingMessageType
  const dataString = raw.substring(colonIndex + 1)

  return {
    type,
    raw,
    dataString,
    data: parseDataString(type, dataString),
    timestamp: Date.now()
  }
}

/**
 * Parse data string based on message type
 */
function parseDataString(type: IncomingMessageType, dataString: string): Record<string, unknown> {
  const parts = dataString.split(':')

  switch (type) {
    case 'training_progress': {
      // progress%:taskName:phase:currentTask:totalTasks:isActive
      return {
        progress: parseFloat(parts[0]) || 0,
        taskName: parts[1] || 'Not Started',
        phase: parts[2] || 'NotStarted',
        currentTask: parseInt(parts[3]) || 0,
        totalTasks: parseInt(parts[4]) || 5,
        isActive: parts[5] === 'true'
      } as TrainingProgressData
    }

    case 'explosion_update': {
      // value:isAnimating
      return {
        value: parseFloat(parts[0]) || 0,
        isAnimating: parts[1] === 'true'
      } as ExplosionUpdateData
    }

    case 'camera_update': {
      // mode:perspective:distance:isTransitioning
      return {
        mode: parts[0] || 'Manual',
        perspective: parts[1] || 'IsometricNE',
        distance: parseFloat(parts[2]) || 1500,
        isTransitioning: parts[3] === 'true'
      } as CameraUpdateData
    }

    case 'tool_change':
      return { toolName: parts[0] || 'None' }

    case 'task_completed':
      return { taskId: parts[0] || '' }

    case 'task_start':
      return { toolName: parts[0] || '' }

    case 'question_request':
      return { questionId: parts[0] || 'Q1' }

    case 'waypoint_list': {
      // count:index:name,index:name,...
      const count = parseInt(parts[0]) || 0
      const waypointData = dataString.substring(parts[0].length + 1)
      const waypoints: WaypointData[] = []

      if (count > 0 && waypointData) {
        waypointData.split(',').forEach(wp => {
          const [index, name] = wp.split(':')
          if (index !== undefined && name) {
            waypoints.push({ index: parseInt(index), name })
          }
        })
      }

      return { count, waypoints }
    }

    case 'waypoint_update': {
      // activeIndex:name:isActive:progress%
      return {
        activeIndex: parseInt(parts[0]) || -1,
        name: parts[1] || 'None',
        isActive: parts[2] === 'true',
        progress: parseFloat(parts[3]) || 0
      } as WaypointUpdateData
    }

    case 'layer_list': {
      // count:index:name:visible:actorCount,...
      const count = parseInt(parts[0]) || 0
      const layerData = dataString.substring(parts[0].length + 1)
      const layers: LayerData[] = []

      if (count > 0 && layerData) {
        layerData.split(',').forEach(layer => {
          const [index, name, visible, actorCount] = layer.split(':')
          if (index !== undefined && name) {
            layers.push({
              index: parseInt(index),
              name,
              visible: visible === 'true',
              actorCount: parseInt(actorCount) || 0
            })
          }
        })
      }

      return { count, layers }
    }

    case 'hierarchical_list': {
      // count:name:visible:isChild:actorCount:parentName:childIndex,...
      const count = parseInt(parts[0]) || 0
      const groupData = dataString.substring(parts[0].length + 1)
      const groups: HierarchicalLayerData[] = []

      if (count > 0 && groupData) {
        groupData.split(',').forEach(group => {
          const [name, visible, isChild, actorCount, parentName, childIndex] = group.split(':')
          if (name) {
            groups.push({
              name,
              visible: visible === 'true',
              isChild: isChild === 'true',
              actorCount: parseInt(actorCount) || 0,
              parentName: parentName || undefined,
              childIndex: childIndex ? parseInt(childIndex) : undefined
            })
          }
        })
      }

      return { count, groups }
    }

    default:
      // Generic parsing for unknown types
      return {
        raw: dataString,
        parts,
        value: parts.length > 0 ? (parseFloat(parts[0]) || parts[0]) : undefined
      }
  }
}

// =============================================================================
// Message Creation Functions (Web → UE5)
// =============================================================================

/**
 * Create a message string to send to UE5
 */
export function createMessage(type: string, data?: string): string {
  if (data === undefined || data === '') {
    return type
  }
  return `${type}:${data}`
}

// Training Control
export function createTrainingControlMessage(action: TrainingControlAction): string {
  return createMessage(WEB_TO_UE_MESSAGES.TRAINING_CONTROL, action)
}

// Tool Selection
export function createToolSelectMessage(tool: ToolName): string {
  return createMessage(WEB_TO_UE_MESSAGES.TOOL_SELECT, tool)
}

// Task Start
export function createTaskStartMessage(tool: ToolName, pipe?: PipeType): string {
  const data = pipe ? `${tool}:${pipe}` : tool
  return createMessage(WEB_TO_UE_MESSAGES.TASK_START, data)
}

// Pipe Selection
export function createPipeSelectMessage(pipe: PipeType): string {
  return createMessage(WEB_TO_UE_MESSAGES.PIPE_SELECT, pipe)
}

// Pressure Test
export function createTestPlugSelectMessage(plugType: string): string {
  return createMessage(WEB_TO_UE_MESSAGES.TEST_PLUG_SELECT, plugType)
}

export function createPressureTestStartMessage(testType: 'air_test' | 'player_closed_q6'): string {
  return createMessage(WEB_TO_UE_MESSAGES.PRESSURE_TEST_START, testType)
}

// Question Answer
export function createQuestionAnswerMessage(questionId: string, tryCount: number, isCorrect: boolean): string {
  return createMessage(WEB_TO_UE_MESSAGES.QUESTION_ANSWER, `${questionId}:${tryCount}:${isCorrect}`)
}

// Camera Control
export function createCameraControlMessage(action: CameraPerspective | 'orbit_start' | 'orbit_stop' | 'reset'): string {
  return createMessage(WEB_TO_UE_MESSAGES.CAMERA_CONTROL, action)
}

// Explosion Control
export function createExplosionControlMessage(action: 'explode' | 'assemble' | number): string {
  return createMessage(WEB_TO_UE_MESSAGES.EXPLOSION_CONTROL, String(action))
}

// Waypoint Control
export function createWaypointControlMessage(action: 'list' | 'deactivate' | `activate:${number}`): string {
  return createMessage(WEB_TO_UE_MESSAGES.WAYPOINT_CONTROL, action)
}

// Layer Control
export function createLayerControlMessage(action: 'list' | `toggle:${number}` | `isolate:${number}`): string {
  return createMessage(WEB_TO_UE_MESSAGES.LAYER_CONTROL, action)
}

// Hierarchical Control
export function createHierarchicalControlMessage(
  action: 'list' | 'show_all' | 'hide_all' | `toggle_main:${string}` | `toggle_child:${string}:${number}`
): string {
  return createMessage(WEB_TO_UE_MESSAGES.HIERARCHICAL_CONTROL, action)
}

// Application Control
export function createApplicationControlMessage(action: 'quit'): string {
  return createMessage(WEB_TO_UE_MESSAGES.APPLICATION_CONTROL, action)
}

// =============================================================================
// Tool Information
// =============================================================================

export const TOOL_INFO: Record<ToolName, { icon: string; name: string; description: string }> = {
  'None': { icon: 'N', name: 'None', description: 'No tool selected' },
  'XRay': { icon: '🔍', name: 'XRay Scanner', description: 'X-Ray scanning tool for locating pipes' },
  'Shovel': { icon: '⛏️', name: 'Excavation Shovel', description: 'Digging tool for excavation' },
  'Measuring': { icon: '📏', name: 'Measuring Tape', description: 'Measuring tape for precision' },
  'PipeConnection': { icon: '🔧', name: 'Pipe Connection', description: 'Pipe connection tool' },
  'Glue': { icon: '🧴', name: 'Glue Applicator', description: 'Glue application tool' },
  'PressureTester': { icon: '🔧', name: 'Pressure Tester', description: 'Pressure testing tool' }
}

// =============================================================================
// Message Log Entry Type
// =============================================================================

export interface MessageLogEntry {
  id: string
  direction: 'sent' | 'received'
  type: string
  data: string
  raw: string
  timestamp: number
}
