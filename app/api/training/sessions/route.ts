/**
 * Training Sessions API Route
 *
 * GET /api/training/sessions - Get all active training sessions for a student
 * POST /api/training/sessions - Create a new training session (force new)
 */

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getSupabaseAdmin } from '@/app/lib/supabase/admin'
import { logger } from '@/app/lib/logger'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-min-32-chars'
)

// =============================================================================
// Helper: Get session from token
// =============================================================================

interface SessionPayload {
  sessionId: string
  userId: string
  email: string
  role: string
  isLti: boolean
}

async function getSessionFromRequest(request: NextRequest): Promise<SessionPayload | null> {
  const token = request.cookies.get('session_token')?.value

  if (!token) {
    return null
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      sessionId: payload.sessionId as string,
      userId: payload.userId as string,
      email: payload.email as string || 'unknown@unknown.local',
      role: payload.role as string,
      isLti: (payload.isLti as boolean) ?? true,
    }
  } catch {
    return null
  }
}

// =============================================================================
// GET - Get all active training sessions for a student
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

    // Non-LTI sessions (demo mode) have no stored sessions
    if (!session.isLti) {
      return NextResponse.json({
        success: true,
        sessions: [],
        demo: true,
      })
    }

    // Admin/teacher sessions are just for testing
    if (session.role === 'admin' || session.role === 'teacher') {
      return NextResponse.json({
        success: true,
        sessions: [],
        testMode: true,
      })
    }

    const supabase = getSupabaseAdmin()

    // Get ALL active training sessions for this student by email
    const { data: activeSessions, error } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('student->>email', session.email)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })

    if (error) {
      logger.error({ error: error.message }, 'Failed to get active training sessions')
      return NextResponse.json(
        { success: false, error: 'Failed to get active training sessions' },
        { status: 500 }
      )
    }

    logger.info({
      email: session.email,
      activeSessionsCount: activeSessions?.length || 0,
    }, 'Retrieved active training sessions for student')

    return NextResponse.json({
      success: true,
      sessions: activeSessions || [],
    })

  } catch (error) {
    logger.error({ error }, 'Training sessions GET error')
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =============================================================================
// POST - Create a new training session (force new, even if active exists)
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Skip save for non-LTI sessions (demo mode)
    if (!session.isLti) {
      logger.info({ sessionId: session.sessionId }, 'Demo mode: Returning mock new training session')
      return NextResponse.json({
        success: true,
        session: {
          id: `demo_${session.sessionId}_${Date.now()}`,
          session_id: session.sessionId,
          course_id: 'demo',
          course_name: 'Demo Training',
          current_training_phase: '0',
          overall_progress: 0,
          status: 'active',
          phases_completed: 0,
          total_score: 0,
        },
        isNew: true,
        demo: true,
      })
    }

    // Skip save for admin/teacher roles
    if (session.role === 'admin' || session.role === 'teacher') {
      logger.info({ sessionId: session.sessionId, role: session.role }, 'Test mode: Returning mock new training session')
      return NextResponse.json({
        success: true,
        session: {
          id: `test_${session.sessionId}_${Date.now()}`,
          session_id: session.sessionId,
          course_id: 'test',
          course_name: 'Test Training',
          current_training_phase: '0',
          overall_progress: 0,
          status: 'active',
          phases_completed: 0,
          total_score: 0,
        },
        isNew: true,
        testMode: true,
      })
    }

    const supabase = getSupabaseAdmin()

    // Get the user session to retrieve LTI context (courseId, courseName, full_name, institution)
    const { data: userSession } = await supabase
      .from('user_sessions')
      .select('lti_context')
      .eq('session_id', session.sessionId)
      .single()

    // Parse LTI context
    const ltiContext = userSession?.lti_context
      ? (typeof userSession.lti_context === 'string'
          ? JSON.parse(userSession.lti_context)
          : userSession.lti_context)
      : {}

    // Build student details for JSONB column using LTI context
    const student = {
      user_id: session.userId,
      email: session.email,
      full_name: ltiContext.full_name || 'Unknown Student',
      institution: ltiContext.institution || 'Unknown Institution',
      enrolled_at: new Date().toISOString(),
    }

    // Force create a NEW training session
    // This is used when student explicitly wants to start fresh
    // Use courseId and courseName from LTI context
    const { data: newSession, error: createError } = await supabase
      .from('training_sessions')
      .insert({
        session_id: session.sessionId,
        course_id: ltiContext.courseId || 'default',
        course_name: ltiContext.courseName || 'VR Pipe Training',
        current_training_phase: '0',
        overall_progress: 0,
        status: 'active',
        phases_completed: 0,
        total_score: 0,
        student: student,
      })
      .select()
      .single()

    if (createError) {
      logger.error({ error: createError.message }, 'Failed to create new training session')
      return NextResponse.json(
        { success: false, error: 'Failed to create new training session' },
        { status: 500 }
      )
    }

    logger.info({
      sessionId: newSession.id,
      email: session.email,
    }, 'Created new training session (forced)')

    return NextResponse.json({
      success: true,
      session: newSession,
      isNew: true,
    })

  } catch (error) {
    logger.error({ error }, 'Training sessions POST error')
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
