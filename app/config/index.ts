/**
 * Configuration Index
 *
 * Central export for all configuration files.
 * Import from '@/app/config' for convenient access.
 */

// App Configuration
export {
  PUREWEB_CONFIG,
  RETRY_CONFIG,
  UI_CONFIG,
  TRAINING_CONFIG,
  THEME_CONFIG,
  API_ENDPOINTS,
  ENV,
  DEBUG_CONFIG,
} from './app.config'

// Task Configuration
export {
  TASK_SEQUENCE,
  TOOL_INFO,
  PIPE_TYPES,
  getTaskByIndex,
  getTaskByTool,
  getTaskById,
  getNextTask,
  isLastTask,
  getToolInfo,
  getPipeInfo,
} from './tasks.config'

export type { TaskDefinition, ToolInfo, PipeInfo } from './tasks.config'

// Question Configuration
export {
  QUESTION_DATABASE,
  QUESTION_IDS,
  getQuestion,
  isCorrectAnswer,
  getQuestionsByCategory,
  getTotalQuestions,
} from './questions.config'

export type { QuestionData, QuestionId } from './questions.config'

// Camera Configuration
export {
  CAMERA_PERSPECTIVES,
  ORTHOGONAL_PERSPECTIVES,
  ISOMETRIC_PERSPECTIVES,
  ALL_PERSPECTIVES,
  DEFAULT_CAMERA_CONFIG,
  getPerspectiveInfo,
  isOrthogonal,
  isIsometric,
} from './camera.config'

export type { CameraPerspective, CameraMode, PerspectiveInfo } from './camera.config'
