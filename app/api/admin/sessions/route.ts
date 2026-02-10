/**
 * Sessions API Route
 *
 * GET /api/admin/sessions - Get all sessions
 * Data sources:
 * - Students: training_sessions table
 * - Teachers/Admins: user_sessions table (session_type: 'teacher', role: 'teacher' | 'admin')
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

interface TrainingSession {
  id: string
  session_id: string
  student: {
    full_name?: string
    email?: string
    institution?: string
    user_id?: string
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

interface UserSession {
  id: string
  session_id: string
  user_id: string
  session_type: 'lti' | 'teacher' | 'pureweb'
  email: string
  role: 'student' | 'teacher' | 'admin'
  lti_context: {
    full_name?: string
    institution?: string
  } | null
  status: 'active' | 'terminated'
  created_at: string
  expires_at: string
  ip_address: string | null
  user_agent: string | null
  login_count: number | null
  last_login_at: string | null
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
  return session !== null && (session.role === 'admin' || session.role === 'teacher') && session.isLti === true
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

    // Fetch all training sessions (for students)
    const { data: trainingSessions, error: trainingSessionsError } = await supabase
      .from('training_sessions')
      .select('*')
      .order('created_at', { ascending: false })

    if (trainingSessionsError) {
      logger.error({ error: trainingSessionsError.message }, 'Failed to fetch training sessions')
      return NextResponse.json(
        { success: false, error: 'Failed to fetch training sessions' },
        { status: 500 }
      )
    }

    // Fetch teacher and admin sessions from user_sessions table
    // session_type: 'teacher' is used for both teachers and admins
    // role: 'teacher' or 'admin' distinguishes them
    const { data: userSessions, error: userSessionsError } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('session_type', 'teacher')
      .in('role', ['teacher', 'admin'])
      .order('created_at', { ascending: false })

    if (userSessionsError) {
      logger.error({ error: userSessionsError.message }, 'Failed to fetch user sessions')
      return NextResponse.json(
        { success: false, error: 'Failed to fetch user sessions' },
        { status: 500 }
      )
    }

    const allTrainingSessions = (trainingSessions || []) as TrainingSession[]
    const allUserSessions = (userSessions || []) as UserSession[]

    // Build students list from training_sessions
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
    }> = []

    for (const ts of allTrainingSessions) {
      // Determine effective status
      let effectiveStatus = ts.status || 'pending'
      if (ts.overall_progress === 100) {
        effectiveStatus = 'completed'
      }

      // Get name from student JSONB field or fallback
      const email = ts.student?.email || ''
      const isFakeLtiEmail = email.startsWith('lti-') || email.endsWith('@lti.local')
      const emailPrefix = !isFakeLtiEmail && email ? email.split('@')[0] : undefined
      const studentName = ts.student?.full_name || emailPrefix || 'Student'

      students.push({
        id: ts.id,
        sessionId: ts.session_id,
        name: studentName,
        email: email,
        institution: ts.student?.institution || 'Open Polytechnic Kuratini Tuwhera',
        courseName: ts.course_name || 'OP-Skillsim Plumbing Training',
        courseId: ts.course_id || '',
        enrolledDate: ts.created_at,
        lastActive: ts.updated_at,
        progress: ts.overall_progress || 0,
        status: effectiveStatus,
        totalScore: ts.total_score || 0,
        phasesCompleted: ts.phases_completed || 0,
        timeSpent: ts.total_time_spent || 0,
      })
    }

    // Build teachers and admins lists from user_sessions
    const teachers: Array<{
      id: string
      sessionId: string
      name: string
      email: string
      institution: string
      createdAt: string
      status: string
      ipAddress: string | null
      userAgent: string | null
      loginCount: number
      lastLoginAt: string | null
    }> = []

    const admins: Array<{
      id: string
      sessionId: string
      name: string
      email: string
      institution: string
      createdAt: string
      status: string
      ipAddress: string | null
      userAgent: string | null
      loginCount: number
      lastLoginAt: string | null
    }> = []

    for (const userSession of allUserSessions) {
      // Get name from lti_context or email prefix
      const isFakeLtiEmail = userSession.email.startsWith('lti-') || userSession.email.endsWith('@lti.local')
      const emailPrefix = !isFakeLtiEmail ? userSession.email.split('@')[0] : undefined
      const name = userSession.lti_context?.full_name || emailPrefix || (userSession.role === 'admin' ? 'Admin' : 'Teacher')

      // Use status directly from user_sessions table
      const status = userSession.status

      const sessionData = {
        id: userSession.id,
        sessionId: userSession.session_id,
        name,
        email: userSession.email,
        institution: userSession.lti_context?.institution || 'Open Polytechnic Kuratini Tuwhera',
        createdAt: userSession.created_at,
        status,
        ipAddress: userSession.ip_address,
        userAgent: userSession.user_agent,
        loginCount: userSession.login_count || 1,
        lastLoginAt: userSession.last_login_at,
      }

      // Separate by role column
      if (userSession.role === 'admin') {
        admins.push(sessionData)
      } else {
        // role === 'teacher'
        teachers.push(sessionData)
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
// DELETE - Delete sessions (single or bulk) - LTI Admin/Teacher only
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

    // Only LTI admins/teachers can delete
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
        if (type === 'student') {
          // For students: delete from training_sessions and related quiz_responses
          // The id is now the training_sessions.id directly

          // Delete quiz_responses for this training session
          await supabase
            .from('quiz_responses')
            .delete()
            .eq('session_id', id)

          // Delete the training_session
          const { error: deleteError } = await supabase
            .from('training_sessions')
            .delete()
            .eq('id', id)

          if (deleteError) {
            errors.push(`Failed to delete training session ${id}: ${deleteError.message}`)
          } else {
            deletedIds.push(id)
          }
        } else {
          // For teachers/admins: delete from user_sessions
          // The id is now the user_sessions.id directly
          const { error: deleteError } = await supabase
            .from('user_sessions')
            .delete()
            .eq('id', id)

          if (deleteError) {
            errors.push(`Failed to delete user session ${id}: ${deleteError.message}`)
          } else {
            deletedIds.push(id)
          }
        }
      } catch (err) {
        errors.push(`Error deleting ${type} ${id}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    logger.info({
      deletedCount: deletedIds.length,
      type,
      adminEmail: session.email,
      deletedIds,
    }, 'Sessions deleted by LTI admin/teacher')

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
