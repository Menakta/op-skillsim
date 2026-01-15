/**
 * Session Manager Service
 *
 * Centralized session management for all user types:
 * - Students: LTI-based sessions with auto-login
 * - Teachers/Admins: Supabase-based sessions with manual login
 *
 * Database Table: user_sessions
 * - session_type: 'lti' | 'teacher' | 'pureweb'
 * - role: 'student' | 'teacher' | 'admin'
 */

import { SignJWT, jwtVerify } from 'jose'
import { cookies, headers } from 'next/headers'
import { supabaseAdmin } from '@/app/lib/supabase/admin'
import type {
  UserRole,
  SessionType,
  UserSession,
  StudentSession,
  TeacherSession,
  AdminSession,
  LtiContext,
  SessionJwtPayload,
  TeacherPermissions,
  AdminPermissions,
} from '@/app/types'

// =============================================================================
// Configuration
// =============================================================================

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-min-32-chars'
)
const SESSION_DURATION_MS = 1 * 60 * 60 * 1000 // 2 hours
const SESSION_DURATION_STR = '2h'
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000 // Refresh if less than 5 minutes remaining
// =============================================================================
// Database Session Type (matches user_sessions table)
// =============================================================================

interface DbSessionInsert {
  session_id: string
  user_id: string
  session_type: 'lti' | 'teacher' | 'pureweb'
  email?: string
  role: 'student' | 'teacher' | 'admin'
  lti_context?: LtiContext
  expires_at: string
  status: 'active' | 'expired' | 'terminated'
  ip_address?: string
  user_agent?: string
  login_count?: number
  last_login_at?: string
}

// =============================================================================
// Session Manager Class
// =============================================================================

export class SessionManager {
  // ===========================================================================
  // CREATE SESSIONS
  // ===========================================================================

  /**
   * Create a student session from LTI launch
   */
  async createStudentSession(
    ltiData: {
      userId: string
      email: string
      fullName?: string
      courseId: string
      courseName: string
      resourceId: string
      institution: string
      returnUrl?: string
    },
    requestInfo?: { ipAddress?: string; userAgent?: string }
  ): Promise<{ sessionId: string; token: string }> {
    const sessionId = this.generateSessionId()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS)

    const ltiContext: LtiContext = {
      courseId: ltiData.courseId,
      courseName: ltiData.courseName,
      resourceId: ltiData.resourceId,
      institution: ltiData.institution,
      returnUrl: ltiData.returnUrl,
      full_name: ltiData.fullName,
    }

    // Store session in database
    try {
      const sessionData: DbSessionInsert = {
        session_id: sessionId,
        user_id: ltiData.userId,
        session_type: 'lti',
        email: ltiData.email,
        role: 'student',
        lti_context: ltiContext,
        expires_at: expiresAt.toISOString(),
        status: 'active',
        ip_address: requestInfo?.ipAddress,
        user_agent: requestInfo?.userAgent,
        login_count: 1,
        last_login_at: now.toISOString(),
      }

      const { error } = await supabaseAdmin.from('user_sessions').insert(sessionData)

      if (error) {
        console.warn('Failed to store session in database:', error.message)
      }
    } catch (dbError) {
      console.warn('Database operation failed:', dbError)
    }

    // Generate JWT token with isLti=true
    const token = await this.generateToken({
      sessionId,
      userId: ltiData.userId,
      email: ltiData.email,
      role: 'student',
      sessionType: 'lti',
      isLti: true, // LTI session - full access, data is saved
    })

    return { sessionId, token }
  }

  /**
   * Create a teacher session from Supabase login or LTI
   */
  async createTeacherSession(
    userId: string,
    email: string,
    fullName?: string,
    permissions?: TeacherPermissions,
    requestInfo?: { ipAddress?: string; userAgent?: string },
    ltiData?: { returnUrl?: string; institution?: string }
  ): Promise<{ sessionId: string; token: string }> {
    const sessionId = this.generateSessionId()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS)

    const effectivePermissions = permissions || {
      editQuestionnaires: true,
      viewResults: true,
    }

    // Check for existing active sessions and increment login count
    let loginCount = 1
    try {
      const { data: existingSessions } = await supabaseAdmin
        .from('user_sessions')
        .select('login_count')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)

      if (existingSessions && existingSessions.length > 0) {
        loginCount = (existingSessions[0].login_count || 0) + 1
      }
    } catch {
      // Ignore errors, use default login count
    }

    // Build LTI context for teacher sessions (stores full_name and returnUrl)
    const ltiContext: LtiContext = {
      courseId: '',
      courseName: '',
      resourceId: '',
      institution: ltiData?.institution || '',
      returnUrl: ltiData?.returnUrl,
      full_name: fullName,
    }

    // Store session in database
    try {
      const sessionData: DbSessionInsert = {
        session_id: sessionId,
        user_id: userId,
        session_type: 'teacher',
        email: email,
        role: 'teacher',
        lti_context: ltiContext,
        expires_at: expiresAt.toISOString(),
        status: 'active',
        ip_address: requestInfo?.ipAddress,
        user_agent: requestInfo?.userAgent,
        login_count: loginCount,
        last_login_at: now.toISOString(),
      }

      const { error } = await supabaseAdmin.from('user_sessions').insert(sessionData)

      if (error) {
        console.warn('Failed to store session in database:', error.message)
      }

      // Update last login in teacher_profiles
      await supabaseAdmin
        .from('teacher_profiles')
        .update({ last_login: now.toISOString() })
        .eq('id', userId)
    } catch (dbError) {
      console.warn('Database operation failed:', dbError)
    }

    // Generate JWT token (permissions stored in JWT, not in DB)
    // Note: Teacher sessions created via LTI will have isLti=true set by the LTI route
    const token = await this.generateToken({
      sessionId,
      userId,
      email,
      role: 'teacher',
      sessionType: 'teacher',
      permissions: effectivePermissions,
      isLti: true, // Default to true for LTI-created sessions
    })

    return { sessionId, token }
  }

  /**
   * Create an admin session from Supabase login or LTI
   */
  async createAdminSession(
    userId: string,
    email: string,
    fullName?: string,
    permissions?: AdminPermissions,
    requestInfo?: { ipAddress?: string; userAgent?: string },
    ltiData?: { returnUrl?: string; institution?: string }
  ): Promise<{ sessionId: string; token: string }> {
    const sessionId = this.generateSessionId()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS)

    const effectivePermissions = permissions || {
      editQuestionnaires: true,
      viewResults: true,
      manageUsers: true,
      viewAnalytics: true,
    }

    // Check for existing active sessions and increment login count
    let loginCount = 1
    try {
      const { data: existingSessions } = await supabaseAdmin
        .from('user_sessions')
        .select('login_count')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)

      if (existingSessions && existingSessions.length > 0) {
        loginCount = (existingSessions[0].login_count || 0) + 1
      }
    } catch {
      // Ignore errors, use default login count
    }

    // Build LTI context for admin sessions (stores full_name and returnUrl)
    const ltiContext: LtiContext = {
      courseId: '',
      courseName: '',
      resourceId: '',
      institution: ltiData?.institution || '',
      returnUrl: ltiData?.returnUrl,
      full_name: fullName,
    }

    // Store session in database
    try {
      const sessionData: DbSessionInsert = {
        session_id: sessionId,
        user_id: userId,
        session_type: 'teacher' , // Admin uses 'teacher' session_type in DB schema
        email: email,
        role: 'admin',
        lti_context: ltiContext,
        expires_at: expiresAt.toISOString(),
        status: 'active',
        ip_address: requestInfo?.ipAddress,
        user_agent: requestInfo?.userAgent,
        login_count: loginCount,
        last_login_at: now.toISOString(),
      }

      const { error } = await supabaseAdmin.from('user_sessions').insert(sessionData)

      if (error) {
        console.warn('Failed to store session in database:', error.message)
      }

      // Update last login in teacher_profiles
      await supabaseAdmin
        .from('teacher_profiles')
        .update({ last_login: now.toISOString() })
        .eq('id', userId)
    } catch (dbError) {
      console.warn('Database operation failed:', dbError)
    }

    // Generate JWT token (permissions stored in JWT, not in DB)
    // Note: Admin sessions created via LTI will have isLti=true set by the LTI route
    const token = await this.generateToken({
      sessionId,
      userId,
      email,
      role: 'admin',
      sessionType: 'admin',
      permissions: effectivePermissions,
      isLti: true, // Default to true for LTI-created sessions
    })

    return { sessionId, token }
  }

  // ===========================================================================
  // VALIDATE & GET SESSIONS
  // ===========================================================================

  /**
   * Validate a session token and return the session
   */
  async validateSession(token: string): Promise<UserSession | null> {
    try {
      // Verify JWT
      console.log('[SessionManager] Validating token...')
      const { payload } = await jwtVerify(token, JWT_SECRET)
      const jwtPayload = payload as unknown as SessionJwtPayload
      console.log('[SessionManager] JWT verified, payload:', {
        sessionId: jwtPayload.sessionId,
        userId: jwtPayload.userId,
        role: jwtPayload.role
      })

      // Try to check database for active session
      let dbSession: Record<string, unknown> | null = null
      try {
        const { data: session } = await supabaseAdmin
          .from('user_sessions')
          .select('*')
          .eq('session_id', jwtPayload.sessionId)
          .eq('status', 'active')
          .single()

        if (session) {
          // Check expiration from database
          if (new Date(session.expires_at as string) < new Date()) {
            await this.terminateSession(jwtPayload.sessionId)
            return null
          }
          dbSession = session
          // Update last activity
          await this.updateLastActivity(jwtPayload.sessionId)
        }
      } catch {
        // Database not available, use JWT payload only
      }

      // If we have a database session, use it combined with JWT
      if (dbSession) {
        return this.buildSessionObject(dbSession, jwtPayload)
      }

      // Otherwise, build session from JWT payload only
      return this.buildSessionFromJwt(jwtPayload)
    } catch (error) {
      console.error('[SessionManager] Session validation error:', error)
      console.error('[SessionManager] Token preview:', token?.substring(0, 50))
      return null
    }
  }

  /**
   * Get session from cookies (server-side)
   */
  async getSessionFromCookies(): Promise<UserSession | null> {
    const cookieStore = await cookies()
    const token = cookieStore.get('session_token')?.value

    console.log('[SessionManager] getSessionFromCookies - token exists:', !!token)
    if (token) {
      console.log('[SessionManager] Token length:', token.length)
    }

    if (!token) {
      console.log('[SessionManager] No session_token cookie found')
      return null
    }

    return this.validateSession(token)
  }

  /**
   * Get request info from headers (for session creation)
   */
  async getRequestInfo(): Promise<{ ipAddress?: string; userAgent?: string }> {
    try {
      const headersList = await headers()
      return {
        ipAddress: headersList.get('x-forwarded-for')?.split(',')[0] || headersList.get('x-real-ip') || undefined,
        userAgent: headersList.get('user-agent') || undefined,
      }
    } catch {
      return {}
    }
  }

  // ===========================================================================
  // TRAINING SESSION (Students Only)
  // ===========================================================================

  /**
   * Create a training session for a student
   *
   * IMPORTANT: Before creating a new session, this method first marks any
   * existing 'active' sessions for the same email as 'abandoned' to prevent
   * duplicate active sessions for the same user.
   */
  async createTrainingSession(
    userSessionId: string,
    courseId: string,
    courseName: string,
    studentDetails?: {
      userId: string
      email: string
      fullName?: string
      institution?: string
    }
  ): Promise<string> {
    // Build student JSONB data
    // Don't use email prefix as name if it's a fake LTI email (lti-* or contains user id)
    const email = studentDetails?.email || ''
    const isFakeLtiEmail = email.startsWith('lti-') || email.endsWith('@lti.local')
    const emailPrefix = !isFakeLtiEmail ? email.split('@')[0] : undefined
    const defaultName = studentDetails?.fullName || emailPrefix || 'Student'

    const student = studentDetails ? {
      user_id: studentDetails.userId,
      email: studentDetails.email,
      full_name: defaultName,
      institution: studentDetails.institution || 'Unknown Institution',
      enrolled_at: new Date().toISOString(),
    } : {
      user_id: 'unknown',
      email: 'unknown@unknown.local',
      full_name: 'Student',
      institution: 'Unknown Institution',
      enrolled_at: new Date().toISOString(),
    }

    // ==========================================================================
    // PREVENT DUPLICATE ACTIVE SESSIONS:
    // Mark any existing 'active' sessions for this email as 'abandoned'
    // This ensures only one active training session per student
    // ==========================================================================
    if (email && email !== 'unknown@unknown.local') {
      const { error: updateError } = await supabaseAdmin
        .from('training_sessions')
        .update({
          status: 'abandoned',
          updated_at: new Date().toISOString(),
        })
        .eq('student->>email', email)
        .eq('status', 'active')

      if (updateError) {
        console.warn('Failed to mark existing sessions as abandoned:', updateError.message)
        // Continue anyway - we still want to create the new session
      } else {
        console.log(`[SessionManager] Marked existing active sessions for ${email} as abandoned`)
      }
    }

    const { data, error } = await supabaseAdmin
      .from('training_sessions')
      .insert({
        session_id: userSessionId,
        course_id: courseId,
        course_name: courseName,
        current_training_phase: '0', // Phase index as string
        overall_progress: 0,
        status: 'active',
        student: student,
      })
      .select('id')
      .single()

    if (error) {
      throw new Error(`Failed to create training session: ${error.message}`)
    }

    return data.id
  }

  /**
   * Update training progress
   */
  async updateTrainingProgress(
    trainingSessionId: string,
    data: {
      phase?: string
      progress?: number
      score?: number
      timeSpent?: number
    }
  ): Promise<void> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (data.phase) updateData.current_training_phase = data.phase
    if (data.progress !== undefined) updateData.overall_progress = data.progress
    if (data.score !== undefined) updateData.total_score = data.score
    if (data.timeSpent !== undefined) updateData.total_time_spent = data.timeSpent

    await supabaseAdmin
      .from('training_sessions')
      .update(updateData)
      .eq('id', trainingSessionId)
  }

  /**
   * Complete a training session
   */
  async completeTrainingSession(
    trainingSessionId: string,
    finalResults: Record<string, unknown>
  ): Promise<void> {
    await supabaseAdmin
      .from('training_sessions')
      .update({
        status: 'completed',
        end_time: new Date().toISOString(),
        overall_progress: 100,
        final_results: finalResults,
      })
      .eq('id', trainingSessionId)
  }

  // ===========================================================================
  // SESSION LIFECYCLE
  // ===========================================================================

  /**
   * Terminate a session
   */
  async terminateSession(sessionId: string): Promise<void> {
    try {
      await supabaseAdmin
        .from('user_sessions')
        .update({ status: 'terminated' })
        .eq('session_id', sessionId)
    } catch (error) {
      console.warn('Failed to terminate session in database:', error)
    }
  }

  /**
   * Expire all sessions for a user
   */
  async expireAllUserSessions(userId: string): Promise<void> {
    try {
      await supabaseAdmin
        .from('user_sessions')
        .update({ status: 'expired' })
        .eq('user_id', userId)
        .eq('status', 'active')
    } catch (error) {
      console.warn('Failed to expire user sessions:', error)
    }
  }

  /**
   * Refresh a session token if needed
   */
  async refreshSession(token: string): Promise<string | null> {
    const session = await this.validateSession(token)
    if (!session) return null

    // Check if refresh is needed
    const timeRemaining = session.expiresAt.getTime() - Date.now()
    if (timeRemaining > REFRESH_THRESHOLD_MS) {
      return token // No refresh needed
    }

    // Extend expiration
    const newExpiresAt = new Date(Date.now() + SESSION_DURATION_MS)

    try {
      await supabaseAdmin
        .from('user_sessions')
        .update({ expires_at: newExpiresAt.toISOString() })
        .eq('session_id', session.sessionId)
    } catch {
      // Continue even if DB update fails
    }

    // Generate new token
    return this.generateToken({
      sessionId: session.sessionId,
      userId: session.userId,
      email: session.email,
      role: session.role,
      sessionType: session.sessionType,
      permissions: 'permissions' in session ? session.permissions : undefined,
    })
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }

  private async generateToken(payload: SessionJwtPayload): Promise<string> {
    return new SignJWT(payload as unknown as Record<string, unknown>)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(SESSION_DURATION_STR)
      .sign(JWT_SECRET)
  }

  private async updateLastActivity(sessionId: string): Promise<void> {
    try {
      await supabaseAdmin
        .from('user_sessions')
        .update({ last_activity: new Date().toISOString() })
        .eq('session_id', sessionId)
    } catch {
      // Ignore errors
    }
  }

  /**
   * Build session object from database record + JWT payload
   */
  private buildSessionObject(
    dbSession: Record<string, unknown>,
    jwtPayload: SessionJwtPayload
  ): UserSession {
    const base = {
      sessionId: dbSession.session_id as string,
      userId: dbSession.user_id as string,
      email: dbSession.email as string,
      isLti: jwtPayload.isLti ?? true, // Default to true for existing LTI sessions
      createdAt: new Date(dbSession.created_at as string),
      expiresAt: new Date(dbSession.expires_at as string),
    }

    if (dbSession.role === 'student') {
      return {
        ...base,
        role: 'student',
        sessionType: 'lti',
        ltiContext: (dbSession.lti_context as LtiContext) || {
          courseId: '',
          courseName: '',
          resourceId: '',
          institution: '',
        },
      } as StudentSession
    }

    if (dbSession.role === 'teacher') {
      return {
        ...base,
        role: 'teacher',
        sessionType: 'teacher',
        permissions: (jwtPayload.permissions as TeacherPermissions) || {
          editQuestionnaires: true,
          viewResults: true,
        },
      } as TeacherSession
    }

    return {
      ...base,
      role: 'admin',
      sessionType: 'admin',
      permissions: (jwtPayload.permissions as AdminPermissions) || {
        editQuestionnaires: true,
        viewResults: true,
        manageUsers: true,
        viewAnalytics: true,
      },
    } as AdminSession
  }

  /**
   * Build session object from JWT payload only (when database is not available)
   */
  private buildSessionFromJwt(jwtPayload: SessionJwtPayload): UserSession {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS)

    const base = {
      sessionId: jwtPayload.sessionId,
      userId: jwtPayload.userId,
      email: jwtPayload.email,
      isLti: jwtPayload.isLti ?? true, // Default to true for existing LTI sessions
      createdAt: now,
      expiresAt,
    }

    if (jwtPayload.role === 'student') {
      return {
        ...base,
        role: 'student',
        sessionType: 'lti',
        ltiContext: {
          courseId: '',
          courseName: '',
          resourceId: '',
          institution: '',
        },
      } as StudentSession
    }

    if (jwtPayload.role === 'teacher') {
      return {
        ...base,
        role: 'teacher',
        sessionType: 'teacher',
        permissions: (jwtPayload.permissions as TeacherPermissions) || {
          editQuestionnaires: true,
          viewResults: true,
        },
      } as TeacherSession
    }

    return {
      ...base,
      role: 'admin',
      sessionType: 'admin',
      permissions: (jwtPayload.permissions as AdminPermissions) || {
        editQuestionnaires: true,
        viewResults: true,
        manageUsers: true,
        viewAnalytics: true,
      },
    } as AdminSession
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

export const sessionManager = new SessionManager()
