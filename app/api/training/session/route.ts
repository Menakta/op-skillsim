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
  role: string
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
      role: payload.role as string,
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

    const body = await request.json().catch(() => ({}))
    const { courseId, courseName } = body

    const supabase = getSupabaseAdmin()

    // Check for existing active session
    const { data: existingSession } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('session_id', session.sessionId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existingSession) {
      logger.info({ sessionId: existingSession.id }, 'Returning existing training session')
      return NextResponse.json({
        success: true,
        session: existingSession,
        isNew: false,
      })
    }

    // Create new training session
    const { data: newSession, error: createError } = await supabase
      .from('training_sessions')
      .insert({
        session_id: session.sessionId,
        course_id: courseId || 'default',
        course_name: courseName || 'VR Pipe Training',
        training_phase: 'Phase A',
        overall_progress: 0,
        status: 'active',
        phases_completed: 0,
        total_score: 0,
        quiz_attempts: {},
        completion_percentage: 0,
      })
      .select()
      .single()

    if (createError) {
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

    const supabase = getSupabaseAdmin()

    const { data: trainingSession, error } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('session_id', session.sessionId)
      .in('status', ['active', 'paused'])
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

    const body = await request.json()
    const { status } = body as { status: TrainingSessionStatus }

    if (!status || !['active', 'paused', 'completed', 'abandoned'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Get current active/paused session
    const { data: currentSession } = await supabase
      .from('training_sessions')
      .select('id')
      .eq('session_id', session.sessionId)
      .in('status', ['active', 'paused'])
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

    // Set end_time if completing or abandoning
    if (status === 'completed' || status === 'abandoned') {
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
