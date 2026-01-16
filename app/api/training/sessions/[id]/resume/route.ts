/**
 * Resume Training Session API Route
 *
 * POST /api/training/sessions/[id]/resume - Resume a specific training session
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
// POST - Resume a specific training session
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromRequest(request)
    const { id: trainingSessionId } = await params

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (!trainingSessionId) {
      return NextResponse.json(
        { success: false, error: 'Training session ID is required' },
        { status: 400 }
      )
    }

    // Skip for non-LTI sessions
    if (!session.isLti) {
      return NextResponse.json({
        success: true,
        session: {
          id: trainingSessionId,
          session_id: session.sessionId,
          current_training_phase: '0',
          overall_progress: 0,
          status: 'active',
        },
        demo: true,
      })
    }

    const supabase = getSupabaseAdmin()

    // Get the training session and verify it belongs to this student
    const { data: trainingSession, error: fetchError } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('id', trainingSessionId)
      .eq('student->>email', session.email)
      .eq('status', 'active')
      .single()

    if (fetchError || !trainingSession) {
      logger.error({
        error: fetchError?.message,
        trainingSessionId,
        email: session.email,
      }, 'Training session not found or access denied')
      return NextResponse.json(
        { success: false, error: 'Training session not found or access denied' },
        { status: 404 }
      )
    }

    // Update the session_id to link to current login session
    const { data: updatedSession, error: updateError } = await supabase
      .from('training_sessions')
      .update({
        session_id: session.sessionId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', trainingSessionId)
      .select()
      .single()

    if (updateError) {
      logger.error({ error: updateError.message }, 'Failed to resume training session')
      return NextResponse.json(
        { success: false, error: 'Failed to resume training session' },
        { status: 500 }
      )
    }

    logger.info({
      trainingSessionId,
      email: session.email,
      currentPhase: updatedSession.current_training_phase,
      progress: updatedSession.overall_progress,
    }, 'Training session resumed')

    return NextResponse.json({
      success: true,
      session: updatedSession,
      resumed: true,
    })

  } catch (error) {
    logger.error({ error }, 'Resume training session error')
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
