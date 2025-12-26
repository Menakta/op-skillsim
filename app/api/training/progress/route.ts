/**
 * Training Progress API Route
 *
 * PATCH /api/training/progress - Update training progress
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
      role: payload.role as string,
      isLti: (payload.isLti as boolean) ?? true, // Default to true for backward compatibility
    }
  } catch {
    return null
  }
}

// =============================================================================
// PATCH - Update training progress
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
    const { phase, progress, taskCompleted, timeSpentMs } = body

    // Skip save for non-LTI sessions (demo mode)
    if (!session.isLti) {
      logger.info({ sessionId: session.sessionId, phase, progress }, 'Demo mode: Skipping progress update')
      return NextResponse.json({
        success: true,
        phase: phase || 'Phase A',
        progress: progress || 0,
        demo: true,
      })
    }

    const supabase = getSupabaseAdmin()

    // Get current active session
    const { data: currentSession } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('session_id', session.sessionId)
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

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (phase !== undefined) {
      updateData.current_training_phase = phase
    }

    if (progress !== undefined) {
      updateData.overall_progress = Math.min(progress, 100)
    }

    if (timeSpentMs !== undefined) {
      // Add to total time spent (convert ms to seconds)
      updateData.total_time_spent = currentSession.total_time_spent + Math.floor(timeSpentMs / 1000)
    }

    const { error: updateError } = await supabase
      .from('training_sessions')
      .update(updateData)
      .eq('id', currentSession.id)

    if (updateError) {
      logger.error({ error: updateError.message }, 'Failed to update training progress')
      return NextResponse.json(
        { success: false, error: 'Failed to update progress' },
        { status: 500 }
      )
    }

    logger.info({
      sessionId: currentSession.id,
      phase: phase || currentSession.current_training_phase,
      progress: progress || currentSession.overall_progress,
    }, 'Training progress updated')

    return NextResponse.json({
      success: true,
      phase: phase || currentSession.current_training_phase,
      progress: progress || currentSession.overall_progress,
    })

  } catch (error) {
    logger.error({ error }, 'Training progress PATCH error')
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
