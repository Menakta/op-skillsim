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
