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
