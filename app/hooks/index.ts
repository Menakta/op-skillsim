/**
 * Hooks Index
 *
 * Central export for all application hooks.
 */

// Session hooks
export {
  SessionProvider,
  useSession,
  useStudentSession,
  useTeacherSession,
  useAdminSession,
  useStaffSession,
  useIsAuthenticated,
  useHasRole,
  useCanAccessAdmin,
} from './useSession'

// Modal management
export { useModalManager } from './useModalManager'
export type {
  ModalType,
  ModalState,
  PhaseSuccessData,
  SessionEndData,
  ErrorData,
  ResumeData,
  UseModalManagerReturn,
} from './useModalManager'

// Screen flow state machine
export { useScreenFlow } from './useScreenFlow'
export type { ScreenState, UseScreenFlowReturn } from './useScreenFlow'

// Stream connection management
export { useStreamConnection } from './useStreamConnection'
export type { ConnectionStatus, UseStreamConnectionReturn } from './useStreamConnection'

// Session info (LTI status, role, expiry)
export { useSessionInfo } from './useSessionInfo'
export type { UserRole, SessionInfo, UseSessionInfoConfig, UseSessionInfoReturn } from './useSessionInfo'

// Session selection (active sessions, resume, new session)
export { useSessionSelection } from './useSessionSelection'
export type {
  SessionSelectionConfig,
  SessionSelectionCallbacks,
  UseSessionSelectionReturn,
} from './useSessionSelection'

// Training persistence (auto-save, quiz submission)
export { useTrainingPersistence } from './useTrainingPersistence'
export type {
  TrainingPersistenceConfig,
  TrainingStateForPersistence,
  QuizDataForPersistence,
  UseTrainingPersistenceReturn,
} from './useTrainingPersistence'
