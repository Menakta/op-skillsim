/**
 * Session Types
 *
 * Defines authentication and session types for the application.
 *
 * Authentication Flow:
 * - Students: LTI launch from iQualify → auto-login → /training
 * - Teachers/Admins: Direct login (/login) → Supabase auth → /admin/dashboard
 */

// =============================================================================
// User Roles & Session Types
// =============================================================================

export type UserRole = 'student' | 'teacher' | 'admin'
export type SessionType = 'lti' | 'teacher' | 'admin'

// =============================================================================
// LTI Context (for students coming from iQualify)
// =============================================================================

export interface LtiContext {
  courseId: string
  courseName: string
  resourceId: string
  institution: string
  returnUrl?: string
}

// =============================================================================
// Base Session Interface
// =============================================================================

export interface BaseSession {
  sessionId: string
  userId: string
  email: string
  role: UserRole
  sessionType: SessionType
  createdAt: Date
  expiresAt: Date
}

// =============================================================================
// Student Session (LTI-based)
// =============================================================================

export interface StudentSession extends BaseSession {
  role: 'student'
  sessionType: 'lti'
  fullName?: string
  ltiContext: LtiContext
  trainingSessionId?: string
}

// =============================================================================
// Teacher Session (Supabase-based)
// =============================================================================

export interface TeacherSession extends BaseSession {
  role: 'teacher'
  sessionType: 'teacher'
  fullName?: string
  permissions: {
    editQuestionnaires: boolean
    viewResults: boolean
  }
}

// =============================================================================
// Admin Session (Supabase-based)
// =============================================================================

export interface AdminSession extends BaseSession {
  role: 'admin'
  sessionType: 'admin'
  fullName?: string
  permissions: {
    editQuestionnaires: boolean
    viewResults: boolean
    manageUsers: boolean
    viewAnalytics: boolean
  }
}

// =============================================================================
// Combined Session Type
// =============================================================================

export type UserSession = StudentSession | TeacherSession | AdminSession

// =============================================================================
// Session Validation Response
// =============================================================================

export interface SessionValidationResponse {
  valid: boolean
  error?: string
  session?: UserSession
}

// =============================================================================
// JWT Payload Types
// =============================================================================

export interface SessionJwtPayload {
  sessionId: string
  userId: string
  email: string
  role: UserRole
  sessionType: SessionType
  permissions?: TeacherPermissions | AdminPermissions
  iat?: number
  exp?: number
}

// =============================================================================
// Permission Types
// =============================================================================

export interface TeacherPermissions {
  editQuestionnaires: boolean
  viewResults: boolean
}

export interface AdminPermissions {
  editQuestionnaires: boolean
  viewResults: boolean
  manageUsers: boolean
  viewAnalytics: boolean
}

export const DEFAULT_TEACHER_PERMISSIONS: TeacherPermissions = {
  editQuestionnaires: true,
  viewResults: true,
}

export const DEFAULT_ADMIN_PERMISSIONS: AdminPermissions = {
  editQuestionnaires: true,
  viewResults: true,
  manageUsers: true,
  viewAnalytics: true,
}

// =============================================================================
// Type Guards
// =============================================================================

export function isStudentSession(session: UserSession): session is StudentSession {
  return session.role === 'student'
}

export function isTeacherSession(session: UserSession): session is TeacherSession {
  return session.role === 'teacher'
}

export function isAdminSession(session: UserSession): session is AdminSession {
  return session.role === 'admin'
}

export function isStaffSession(session: UserSession): session is TeacherSession | AdminSession {
  return session.role === 'teacher' || session.role === 'admin'
}

export function canAccessAdmin(session: UserSession): boolean {
  return session.role === 'teacher' || session.role === 'admin'
}

export function canEditQuestionnaires(session: UserSession): boolean {
  if (isStaffSession(session)) {
    return session.permissions.editQuestionnaires
  }
  return false
}

export function canManageUsers(session: UserSession): boolean {
  if (isAdminSession(session)) {
    return session.permissions.manageUsers
  }
  return false
}
