/**
 * Sessions API Route
 *
 * GET /api/admin/sessions - Get all sessions
 * Data sources:
 * - Students: training_sessions table
 * - Teachers/Admins: teacher_profiles table (distinguished by role column)
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

interface TeacherProfile {
  id: string
  email: string
  full_name: string | null
  role: 'teacher' | 'admin'
  institution: string | null
  permissions: Record<string, boolean> | null
  created_at: string
  last_login: string | null
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

    // Fetch all teacher profiles (for teachers and admins)
    const { data: teacherProfiles, error: teacherProfilesError } = await supabase
      .from('teacher_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (teacherProfilesError) {
      logger.error({ error: teacherProfilesError.message }, 'Failed to fetch teacher profiles')
      return NextResponse.json(
        { success: false, error: 'Failed to fetch teacher profiles' },
        { status: 500 }
      )
    }

    const allTrainingSessions = (trainingSessions || []) as TrainingSession[]
    const allTeacherProfiles = (teacherProfiles || []) as TeacherProfile[]

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
        institution: ts.student?.institution || 'Unknown',
        courseName: ts.course_name || 'VR Pipe Training',
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

    // Build teachers and admins lists from teacher_profiles
    const teachers: Array<{
      id: string
      name: string
      email: string
      institution: string
      createdAt: string
      lastActivity: string
      status: string
    }> = []

    const admins: Array<{
      id: string
      name: string
      email: string
      institution: string
      createdAt: string
      lastActivity: string
      status: string
    }> = []

    for (const profile of allTeacherProfiles) {
      // Get name from profile or email prefix
      const isFakeLtiEmail = profile.email.startsWith('lti-') || profile.email.endsWith('@lti.local')
      const emailPrefix = !isFakeLtiEmail ? profile.email.split('@')[0] : undefined
      const name = profile.full_name || emailPrefix || (profile.role === 'admin' ? 'Admin' : 'Teacher')

      // Determine status based on last_login
      const lastLogin = profile.last_login ? new Date(profile.last_login) : null
      const now = new Date()
      const hoursSinceLogin = lastLogin ? (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60) : Infinity
      const status = hoursSinceLogin < 24 ? 'active' : 'inactive'

      const profileData = {
        id: profile.id,
        name,
        email: profile.email,
        institution: profile.institution || 'Unknown',
        createdAt: profile.created_at,
        lastActivity: profile.last_login || profile.created_at,
        status,
      }

      // Separate by role column
      if (profile.role === 'admin') {
        admins.push(profileData)
      } else {
        // role === 'teacher' or any other value defaults to teacher
        teachers.push(profileData)
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
          // For teachers/admins: delete from teacher_profiles
          // The id is now the teacher_profiles.id directly
          const { error: deleteError } = await supabase
            .from('teacher_profiles')
            .delete()
            .eq('id', id)

          if (deleteError) {
            errors.push(`Failed to delete profile ${id}: ${deleteError.message}`)
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
