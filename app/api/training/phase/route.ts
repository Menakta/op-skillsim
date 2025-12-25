/**
 * Training Phase API Route
 *
 * POST /api/training/phase - Complete a training phase
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
// POST - Complete a training phase
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

    const body = await request.json()
    const { phase, score, timeSpentMs, tasksCompleted, totalTasks } = body

    if (!phase) {
      return NextResponse.json(
        { success: false, error: 'Phase is required' },
        { status: 400 }
      )
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

    // Update phases completed and score
    const newPhasesCompleted = currentSession.phases_completed + 1
    const newTotalScore = currentSession.total_score + (score || 0)
    const newTimeSpent = currentSession.total_time_spent + Math.floor((timeSpentMs || 0) / 1000)

    // Determine next phase
    const phaseOrder = ['Phase A', 'Phase B', 'Phase C', 'Phase D']
    const currentPhaseIndex = phaseOrder.indexOf(phase)
    const nextPhase = currentPhaseIndex < phaseOrder.length - 1
      ? phaseOrder[currentPhaseIndex + 1]
      : phase

    // Calculate completion percentage based on phases
    const completionPercentage = Math.min((newPhasesCompleted / phaseOrder.length) * 100, 100)

    const { error: updateError } = await supabase
      .from('training_sessions')
      .update({
        phases_completed: newPhasesCompleted,
        total_score: newTotalScore,
        total_time_spent: newTimeSpent,
        training_phase: nextPhase,
        completion_percentage: completionPercentage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentSession.id)

    if (updateError) {
      logger.error({ error: updateError.message }, 'Failed to complete phase')
      return NextResponse.json(
        { success: false, error: 'Failed to complete phase' },
        { status: 500 }
      )
    }

    logger.info({
      sessionId: currentSession.id,
      phase,
      score,
      phasesCompleted: newPhasesCompleted,
      totalScore: newTotalScore,
    }, 'Training phase completed')

    return NextResponse.json({
      success: true,
      phasesCompleted: newPhasesCompleted,
      totalScore: newTotalScore,
      nextPhase,
      completionPercentage,
    })

  } catch (error) {
    logger.error({ error }, 'Training phase POST error')
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
