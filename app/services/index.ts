/**
 * Services Index
 *
 * Central export for all service modules.
 * Services abstract API calls and business logic from components.
 */

// Stream service
export { streamService } from './stream.service'
export type {
  StreamCredentials,
  StreamCreateResponse,
  ServiceError,
} from './stream.service'

// Session service
export { sessionService } from './session.service'
export type {
  SessionInfo,
  LoginResult,
} from './session.service'

// Training service
export { trainingService } from './training.service'
export type {
  TaskInfo,
  ProgressInfo,
} from './training.service'
