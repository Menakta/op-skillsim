/**
 * Sessions API Route
 *
 * GET /api/admin/sessions - Get all sessions from user_sessions table
 * Filters by role field:
 * - Students: role = 'student' (session_type = 'lti', data from training_sessions)
 * - Teachers: role = 'teacher' (session_type = 'teacher')
 * - Admins: role = 'admin' (session_type = 'teacher')
 */

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getSupabaseAdmin } from '@/app/lib/supabase/admin'
import { logger } from '@/app/lib/logger'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-min-32-chars'
)

// =============================================================================
// Types
// =============================================================================

interface LtiContext {
  courseId?: string
  courseName?: string
  institution?: string
  returnUrl?: string
  resourceId?: string
  full_name?: string
}

interface UserSession {
  id: string
  session_id: string
  user_id: string
  session_type: 'lti' | 'teacher'
  email: string
  role: 'student' | 'teacher' | 'admin'
  lti_context: LtiContext | null
  created_at: string
  last_activity: string
  expires_at: string
  status: string
  ip_address: string | null
  user_agent: string | null
  login_count: number
  last_login_at: string
}

interface TrainingSession {
  id: string
  session_id: string
  student: {
    full_name?: string
    email?: string
    institution?: string
  } | null
  course_name: string
  course_id: string
  status: string
  current_training_phase: string
  overall_progress: number
  total_score: number
  phases_completed: number
  start_time: string
  end_time: string | null
  total_time_spent: number
  created_at: string
  updated_at: string
}

// =============================================================================
// Helper: Get session from token
// =============================================================================

interface SessionInfo {
  role: string
  isLti: boolean
  userId: string
  email: string
}

async function getSessionFromRequest(request: NextRequest): Promise<SessionInfo | null> {
  const token = request.cookies.get('session_token')?.value

  if (!token) {
    return null
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      role: payload.role as string,
      isLti: payload.isLti as boolean || false,
      userId: payload.userId as string || '',
      email: payload.email as string || '',
    }
  } catch {
    return null
  }
}

// =============================================================================
// Helper: Check if user is LTI Admin (only LTI admins can delete)
// =============================================================================

function isLtiAdmin(session: SessionInfo | null): boolean {
  return session !== null && session.role === 'admin' && session.isLti === true
}

// =============================================================================
// GET - Get all sessions
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (session.role !== 'teacher' && session.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Fetch all user sessions
    const { data: userSessions, error: userSessionsError } = await supabase
      .from('user_sessions')
      .select('*')
      .order('created_at', { ascending: false })

    if (userSessionsError) {
      logger.error({ error: userSessionsError.message }, 'Failed to fetch user sessions')
      return NextResponse.json(
        { success: false, error: 'Failed to fetch user sessions' },
        { status: 500 }
      )
    }

    // Fetch all training sessions (for student data enrichment)
    const { data: trainingSessions, error: trainingSessionsError } = await supabase
      .from('training_sessions')
      .select('*')
      .order('created_at', { ascending: false })

    if (trainingSessionsError) {
      logger.error({ error: trainingSessionsError.message }, 'Failed to fetch training sessions')
    }

    // Fetch teacher profiles (for teacher/admin real names)
    const { data: teacherProfiles, error: teacherProfilesError } = await supabase
      .from('teacher_profiles')
      .select('id, email, full_name, role')

    if (teacherProfilesError) {
      logger.error({ error: teacherProfilesError.message }, 'Failed to fetch teacher profiles')
    }

    // Create a map of email to teacher profile for quick lookup
    const teacherProfileMap = new Map<string, { fullName?: string; role?: string }>()
    for (const profile of teacherProfiles || []) {
      if (profile.email) {
        teacherProfileMap.set(profile.email, {
          fullName: profile.full_name,
          role: profile.role,
        })
      }
    }

    const allUserSessions = (userSessions || []) as UserSession[]
    const allTrainingSessions = (trainingSessions || []) as TrainingSession[]

    // Create a map of session_id to training session for quick lookup
    const trainingSessionMap = new Map<string, TrainingSession>()
    for (const ts of allTrainingSessions) {
      // Use the most recent training session for each session_id
      const existing = trainingSessionMap.get(ts.session_id)
      if (!existing || new Date(ts.updated_at) > new Date(existing.updated_at)) {
        trainingSessionMap.set(ts.session_id, ts)
      }
    }

    // Separate sessions by role
    const students: Array<{
      id: string
      sessionId: string
      name: string
      email: string
      institution: string
      courseName: string
      courseId: string
      enrolledDate: string
      lastActive: string
      progress: number
      status: string
      totalScore: number
      phasesCompleted: number
      timeSpent: number
      ipAddress: string | null
      userAgent: string | null
      loginCount: number
    }> = []

    const teachers: Array<{
      id: string
      sessionId: string
      name: string
      email: string
      createdAt: string
      lastActivity: string
      status: string
      ipAddress: string | null
      userAgent: string | null
      loginCount: number
    }> = []

    const admins: Array<{
      id: string
      sessionId: string
      name: string
      email: string
      createdAt: string
      lastActivity: string
      status: string
      ipAddress: string | null
      userAgent: string | null
      loginCount: number
    }> = []

    for (const userSession of allUserSessions) {
      // Students: role = 'student' (enriched with training_sessions data)
      if (userSession.role === 'student') {
        // Get training session data for this student
        const trainingSession = trainingSessionMap.get(userSession.session_id)

        // Determine effective status
        let effectiveStatus = trainingSession?.status || 'pending'
        if (trainingSession?.overall_progress === 100) {
          effectiveStatus = 'completed'
        }

        // Get name from: training session -> lti_context -> email prefix (if real email)
        // Don't use email prefix if it's a fake LTI email (lti-* or ends with @lti.local)
        const isFakeLtiEmail = userSession.email.startsWith('lti-') || userSession.email.endsWith('@lti.local')
        const emailPrefix = !isFakeLtiEmail ? userSession.email.split('@')[0] : undefined
        const studentName = trainingSession?.student?.full_name
          || userSession.lti_context?.full_name
          || emailPrefix
          || 'Student'

        students.push({
          id: userSession.id,
          sessionId: userSession.session_id,
          name: studentName,
          email: userSession.email,
          institution: trainingSession?.student?.institution || userSession.lti_context?.institution || 'Unknown',
          courseName: trainingSession?.course_name || userSession.lti_context?.courseName || 'VR Pipe Training',
          courseId: trainingSession?.course_id || userSession.lti_context?.courseId || '',
          enrolledDate: userSession.created_at,
          lastActive: trainingSession?.updated_at || userSession.last_activity,
          progress: trainingSession?.overall_progress || 0,
          status: effectiveStatus,
          totalScore: trainingSession?.total_score || 0,
          phasesCompleted: trainingSession?.phases_completed || 0,
          timeSpent: trainingSession?.total_time_spent || 0,
          ipAddress: userSession.ip_address,
          userAgent: userSession.user_agent,
          loginCount: userSession.login_count,
        })
      }
      // Teachers: role = 'teacher'
      else if (userSession.role === 'teacher') {
        // Get name from: teacher_profiles -> lti_context -> email prefix (if real email)
        // Don't use email prefix if it's a fake LTI email (lti-* or ends with @lti.local)
        const teacherProfile = teacherProfileMap.get(userSession.email)
        const isFakeLtiEmail = userSession.email.startsWith('lti-') || userSession.email.endsWith('@lti.local')
        const emailPrefix = !isFakeLtiEmail ? userSession.email.split('@')[0] : undefined
        const teacherName = teacherProfile?.fullName
          || userSession.lti_context?.full_name
          || emailPrefix
          || 'Teacher'

        teachers.push({
          id: userSession.id,
          sessionId: userSession.session_id,
          name: teacherName,
          email: userSession.email,
          createdAt: userSession.created_at,
          lastActivity: userSession.last_activity,
          status: userSession.status,
          ipAddress: userSession.ip_address,
          userAgent: userSession.user_agent,
          loginCount: userSession.login_count,
        })
      }
      // Admins: role = 'admin'
      else if (userSession.role === 'admin') {
        // Get name from: teacher_profiles -> lti_context -> email prefix (if real email)
        // Don't use email prefix if it's a fake LTI email (lti-* or ends with @lti.local)
        const adminProfile = teacherProfileMap.get(userSession.email)
        const isFakeLtiEmail = userSession.email.startsWith('lti-') || userSession.email.endsWith('@lti.local')
        const emailPrefix = !isFakeLtiEmail ? userSession.email.split('@')[0] : undefined
        const adminName = adminProfile?.fullName
          || userSession.lti_context?.full_name
          || emailPrefix
          || 'Admin'

        admins.push({
          id: userSession.id,
          sessionId: userSession.session_id,
          name: adminName,
          email: userSession.email,
          createdAt: userSession.created_at,
          lastActivity: userSession.last_activity,
          status: userSession.status,
          ipAddress: userSession.ip_address,
          userAgent: userSession.user_agent,
          loginCount: userSession.login_count,
        })
      }
    }

    // Calculate stats
    const studentStats = {
      total: students.length,
      active: students.filter(s => s.status === 'active').length,
      completed: students.filter(s => s.status === 'completed').length,
      avgProgress: students.length > 0
        ? Math.round(students.reduce((acc, s) => acc + s.progress, 0) / students.length)
        : 0,
    }

    const teacherStats = {
      total: teachers.length,
      active: teachers.filter(t => t.status === 'active').length,
    }

    const adminStats = {
      total: admins.length,
      active: admins.filter(a => a.status === 'active').length,
    }

    return NextResponse.json({
      success: true,
      students,
      teachers,
      admins,
      stats: {
        students: studentStats,
        teachers: teacherStats,
        admins: adminStats,
      },
    })

  } catch (error) {
    logger.error({ error }, 'Sessions GET error')
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =============================================================================
// DELETE - Delete sessions (single or bulk) - LTI Admin only
// =============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only LTI admins can delete
    if (!isLtiAdmin(session)) {
      return NextResponse.json(
        { success: false, error: 'Access denied. Only LTI administrators can delete sessions.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { ids, type } = body as { ids: string[]; type: 'student' | 'teacher' | 'admin' }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No session IDs provided' },
        { status: 400 }
      )
    }

    if (!type || !['student', 'teacher', 'admin'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid session type' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()
    const deletedIds: string[] = []
    const errors: string[] = []

    for (const id of ids) {
      try {
        // For students, also delete related training_sessions and quiz_responses
        if (type === 'student') {
          // Get the user_session to find the session_id
          const { data: userSession } = await supabase
            .from('user_sessions')
            .select('session_id')
            .eq('id', id)
            .single()

          if (userSession) {
            // Find training_session by session_id
            const { data: trainingSession } = await supabase
              .from('training_sessions')
              .select('id')
              .eq('session_id', userSession.session_id)
              .single()

            if (trainingSession) {
              // Delete quiz_responses for this training session
              await supabase
                .from('quiz_responses')
                .delete()
                .eq('session_id', trainingSession.id)

              // Delete the training_session
              await supabase
                .from('training_sessions')
                .delete()
                .eq('id', trainingSession.id)
            }
          }
        }

        // Delete the user_session
        const { error: deleteError } = await supabase
          .from('user_sessions')
          .delete()
          .eq('id', id)

        if (deleteError) {
          errors.push(`Failed to delete session ${id}: ${deleteError.message}`)
        } else {
          deletedIds.push(id)
        }
      } catch (err) {
        errors.push(`Error deleting session ${id}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    logger.info({
      deletedCount: deletedIds.length,
      type,
      adminEmail: session.email,
      deletedIds,
    }, 'Sessions deleted by LTI admin')

    return NextResponse.json({
      success: true,
      deletedCount: deletedIds.length,
      deletedIds,
      errors: errors.length > 0 ? errors : undefined,
    })

  } catch (error) {
    logger.error({ error }, 'Sessions DELETE error')
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
