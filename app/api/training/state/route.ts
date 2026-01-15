/**
 * Training State API Route
 *
 * PATCH /api/training/state - Save training state for session resume
 * GET /api/training/state - Get saved training state
 */

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getSupabaseAdmin } from '@/app/lib/supabase/admin'
import { logger } from '@/app/lib/logger'
import type { PersistedTrainingState } from '@/app/types'

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
// GET - Get saved training state
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

    // For non-LTI sessions (demo mode), return null state
    if (!session.isLti) {
      return NextResponse.json({
        success: true,
        trainingState: null,
        demo: true,
      })
    }

    // For admin/teacher roles, return null state (no persistence needed)
    if (session.role === 'admin' || session.role === 'teacher') {
      return NextResponse.json({
        success: true,
        trainingState: null,
        testMode: true,
      })
    }

    const supabase = getSupabaseAdmin()

    // Get the most recent active session with training_state by EMAIL
    // This ensures we find the session even after a new LTI login
    const { data: trainingSession, error } = await supabase
      .from('training_sessions')
      .select('id, training_state, status, current_training_phase, overall_progress')
      .eq('student->>email', session.email)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      logger.error({ error: error.message }, 'Failed to get training state')
      return NextResponse.json(
        { success: false, error: 'Failed to get training state' },
        { status: 500 }
      )
    }

    if (!trainingSession) {
      return NextResponse.json({
        success: true,
        trainingState: null,
      })
    }

    logger.info({
      sessionId: trainingSession.id,
      hasState: !!trainingSession.training_state,
      currentPhase: trainingSession.current_training_phase,
      progress: trainingSession.overall_progress,
    }, 'Training state retrieved')

    return NextResponse.json({
      success: true,
      trainingState: trainingSession.training_state,
      sessionId: trainingSession.id,
      status: trainingSession.status,
      // Always include these from the database as fallback/primary source
      currentTrainingPhase: trainingSession.current_training_phase,
      overallProgress: trainingSession.overall_progress,
    })

  } catch (error) {
    logger.error({ error }, 'Training state GET error')
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =============================================================================
// PATCH - Save training state
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
    const { trainingState } = body as { trainingState: PersistedTrainingState }

    // Skip save for non-LTI sessions (demo mode)
    if (!session.isLti) {
      logger.info({ sessionId: session.sessionId }, 'Demo mode: Skipping state save')
      return NextResponse.json({
        success: true,
        demo: true,
      })
    }

    // Skip save for admin/teacher roles
    if (session.role === 'admin' || session.role === 'teacher') {
      logger.info({ sessionId: session.sessionId, role: session.role }, 'Test mode: Skipping state save')
      return NextResponse.json({
        success: true,
        testMode: true,
      })
    }

    if (!trainingState) {
      return NextResponse.json(
        { success: false, error: 'trainingState is required' },
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

    // Add timestamp to training state
    const stateWithTimestamp: PersistedTrainingState = {
      ...trainingState,
      lastUpdated: new Date().toISOString(),
    }

    // Update training_state JSONB column
    const { error: updateError } = await supabase
      .from('training_sessions')
      .update({
        training_state: stateWithTimestamp,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentSession.id)

    if (updateError) {
      logger.error({ error: updateError.message }, 'Failed to save training state')
      return NextResponse.json(
        { success: false, error: 'Failed to save training state' },
        { status: 500 }
      )
    }

    logger.info({
      sessionId: currentSession.id,
      mode: trainingState.mode,
      phase: trainingState.phase,
      taskIndex: trainingState.currentTaskIndex,
    }, 'Training state saved')

    return NextResponse.json({
      success: true,
      saved: true,
    })

  } catch (error) {
    logger.error({ error }, 'Training state PATCH error')
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
