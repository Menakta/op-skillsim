/**
 * Training Time API Route
 *
 * PATCH /api/training/time - Record time spent in training
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
// PATCH - Record time spent
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
    const { timeMs } = body

    if (typeof timeMs !== 'number' || timeMs < 0) {
      return NextResponse.json(
        { success: false, error: 'Valid timeMs is required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Get current active session
    const { data: currentSession } = await supabase
      .from('training_sessions')
      .select('id, total_time_spent')
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

    // Add time (convert ms to seconds)
    const additionalSeconds = Math.floor(timeMs / 1000)
    const newTotalTime = currentSession.total_time_spent + additionalSeconds

    const { error: updateError } = await supabase
      .from('training_sessions')
      .update({
        total_time_spent: newTotalTime,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentSession.id)

    if (updateError) {
      logger.error({ error: updateError.message }, 'Failed to record time')
      return NextResponse.json(
        { success: false, error: 'Failed to record time' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      totalTimeSpent: newTotalTime,
    })

  } catch (error) {
    logger.error({ error }, 'Training time PATCH error')
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
