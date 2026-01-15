/**
 * Training Session API Route
 *
 * POST /api/training/session - Start or get training session
 * GET /api/training/session - Get current training session
 * PATCH /api/training/session - Update session status
 */

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getSupabaseAdmin } from '@/app/lib/supabase/admin'
import { logger } from '@/app/lib/logger'
import type { TrainingSessionStatus } from '@/app/types'

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
  isLti: boolean // true = LTI session (data saved), false = demo (no save)
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
      isLti: (payload.isLti as boolean) ?? true, // Default to true for backward compatibility
    }
  } catch {
    return null
  }
}

// =============================================================================
// POST - Start or get training session
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
      logger.info({ sessionId: session.sessionId }, 'Demo mode: Returning mock training session')
      return NextResponse.json({
        success: true,
        session: {
          id: `demo_${session.sessionId}`,
          session_id: session.sessionId,
          course_id: 'demo',
          course_name: 'Demo Training',
          current_training_phase: '0', // Phase index as string
          overall_progress: 0,
          status: 'active',
          phases_completed: 0,
          total_score: 0,
        },
        isNew: true,
        demo: true,
      })
    }

    // Skip save for admin/teacher roles (they are just testing)
    if (session.role === 'admin' || session.role === 'teacher') {
      logger.info({ sessionId: session.sessionId, role: session.role }, 'Test mode: Returning mock training session for admin/teacher')
      return NextResponse.json({
        success: true,
        session: {
          id: `test_${session.sessionId}`,
          session_id: session.sessionId,
          course_id: 'test',
          course_name: 'Test Training',
          current_training_phase: '0', // Phase index as string
          overall_progress: 0,
          status: 'active',
          phases_completed: 0,
          total_score: 0,
        },
        isNew: true,
        testMode: true,
      })
    }

    const body = await request.json().catch(() => ({}))
    const { courseId, courseName, initialPhase } = body

    const supabase = getSupabaseAdmin()

    // ==========================================================================
    // IMPORTANT: Query by student EMAIL, not session_id
    // Each LTI login creates a new session_id, but we want to find existing
    // training sessions for this student (identified by email)
    // ==========================================================================
    const { data: existingSession } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('student->>email', session.email)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existingSession) {
      // Found an active training session for this email
      // Update the session_id to link to the current login session
      const { data: updatedSession, error: updateError } = await supabase
        .from('training_sessions')
        .update({
          session_id: session.sessionId, // Link to current login session
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSession.id)
        .select()
        .single()

      if (updateError) {
        logger.error({ error: updateError.message }, 'Failed to update training session')
        return NextResponse.json(
          { success: false, error: 'Failed to update training session' },
          { status: 500 }
        )
      }

      logger.info({
        sessionId: existingSession.id,
        email: session.email,
        currentPhase: existingSession.current_training_phase,
      }, 'Returning existing active training session for email')

      return NextResponse.json({
        success: true,
        session: updatedSession,
        isNew: false,
        resumed: true,
      })
    }

    // Build student details for JSONB column
    const student = {
      user_id: session.userId,
      email: session.email,
      full_name: 'Unknown Student',
      institution: 'Unknown Institution',
      enrolled_at: new Date().toISOString(),
    }

    // Create new training session (only if none exists for this session_id)
    // Store phase as index string ("0", "1", "2"...) instead of phase name
    const { data: newSession, error: createError } = await supabase
      .from('training_sessions')
      .insert({
        session_id: session.sessionId,
        course_id: courseId || 'default',
        course_name: courseName || 'VR Pipe Training',
        current_training_phase: initialPhase || '0', // Phase index as string (0-7)
        overall_progress: 0,
        status: 'active',
        phases_completed: 0,
        total_score: 0,
        student: student,
      })
      .select()
      .single()

    if (createError) {
      // If insert failed due to duplicate (race condition), fetch the existing one
      if (createError.code === '23505') {
        const { data: raceSession } = await supabase
          .from('training_sessions')
          .select('*')
          .eq('session_id', session.sessionId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (raceSession) {
          logger.info({ sessionId: raceSession.id }, 'Returning session after race condition')
          return NextResponse.json({
            success: true,
            session: raceSession,
            isNew: false,
          })
        }
      }

      logger.error({ error: createError.message }, 'Failed to create training session')
      return NextResponse.json(
        { success: false, error: 'Failed to create training session' },
        { status: 500 }
      )
    }

    logger.info({ sessionId: newSession.id }, 'Created new training session')

    return NextResponse.json({
      success: true,
      session: newSession,
      isNew: true,
    })

  } catch (error) {
    logger.error({ error }, 'Training session POST error')
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =============================================================================
// GET - Get current training session
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

    // Return null for non-LTI sessions (demo mode - no stored data)
    if (!session.isLti) {
      return NextResponse.json({
        success: true,
        session: null,
        demo: true,
      })
    }

    const supabase = getSupabaseAdmin()

    // Query by student EMAIL to find active training session
    // This ensures we find the session even after a new LTI login (new session_id)
    const { data: trainingSession, error } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('student->>email', session.email)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      logger.error({ error: error.message }, 'Failed to get training session')
      return NextResponse.json(
        { success: false, error: 'Failed to get training session' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      session: trainingSession || null,
    })

  } catch (error) {
    logger.error({ error }, 'Training session GET error')
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =============================================================================
// PATCH - Update session status
// =============================================================================

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Skip update for non-LTI sessions (demo mode)
    if (!session.isLti) {
      const body = await request.json()
      logger.info({ sessionId: session.sessionId, status: body.status }, 'Demo mode: Skipping session status update')
      return NextResponse.json({
        success: true,
        status: body.status || 'active',
        demo: true,
      })
    }

    const body = await request.json()
    const { status } = body as { status: TrainingSessionStatus }

    if (!status || !['active', 'completed'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status. Must be "active" or "completed"' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Get current active session by EMAIL
    const { data: currentSession } = await supabase
      .from('training_sessions')
      .select('id')
      .eq('student->>email', session.email)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!currentSession) {
      return NextResponse.json(
        { success: false, error: 'No active training session found' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    }

    // Set end_time if completing
    if (status === 'completed') {
      updateData.end_time = new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from('training_sessions')
      .update(updateData)
      .eq('id', currentSession.id)

    if (updateError) {
      logger.error({ error: updateError.message }, 'Failed to update session status')
      return NextResponse.json(
        { success: false, error: 'Failed to update session status' },
        { status: 500 }
      )
    }

    logger.info({ sessionId: currentSession.id, status }, 'Training session status updated')

    return NextResponse.json({
      success: true,
      status,
    })

  } catch (error) {
    logger.error({ error }, 'Training session PATCH error')
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
