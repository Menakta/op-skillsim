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
    const { phase, score, timeSpentMs, tasksCompleted, totalTasks, nextPhase, totalPhases, progress } = body

    if (!phase) {
      return NextResponse.json(
        { success: false, error: 'Phase is required' },
        { status: 400 }
      )
    }

    // Skip save for non-LTI sessions (demo mode) - use hardcoded mock data
    if (!session.isLti) {
      const mockPhaseOrder = ['Phase A', 'Phase B', 'Phase C', 'Phase D']
      const currentPhaseIndex = mockPhaseOrder.indexOf(phase)
      const nextPhase = currentPhaseIndex < mockPhaseOrder.length - 1
        ? mockPhaseOrder[currentPhaseIndex + 1]
        : phase

      logger.info({ sessionId: session.sessionId, phase }, 'Demo mode: Skipping phase completion save')
      return NextResponse.json({
        success: true,
        phasesCompleted: currentPhaseIndex + 1,
        totalScore: score || 0,
        nextPhase,
        overallProgress: Math.min(((currentPhaseIndex + 1) / mockPhaseOrder.length) * 100, 100),
        demo: true,
      })
    }

    // Skip save for admin/teacher roles (they are just testing) - use hardcoded mock data
    if (session.role === 'admin' || session.role === 'teacher') {
      const mockPhaseOrder = ['Phase A', 'Phase B', 'Phase C', 'Phase D']
      const currentPhaseIndex = mockPhaseOrder.indexOf(phase)
      const nextPhase = currentPhaseIndex < mockPhaseOrder.length - 1
        ? mockPhaseOrder[currentPhaseIndex + 1]
        : phase

      logger.info({ sessionId: session.sessionId, role: session.role, phase }, 'Test mode: Skipping phase completion save for admin/teacher')
      return NextResponse.json({
        success: true,
        phasesCompleted: currentPhaseIndex + 1,
        totalScore: score || 0,
        nextPhase,
        overallProgress: Math.min(((currentPhaseIndex + 1) / mockPhaseOrder.length) * 100, 100),
        testMode: true,
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

    // Update phases completed (score is tracked separately via quiz_responses)
    const newPhasesCompleted = currentSession.phases_completed + 1
    // Don't accumulate phase scores - total_score will be calculated from quiz responses
    const newTimeSpent = currentSession.total_time_spent + Math.floor((timeSpentMs || 0) / 1000)

    // For LTI students: Use data from stream (nextPhase, progress) - no hardcoded values
    // nextPhase and progress should be provided by the client from stream data
    const updatedNextPhase = nextPhase || phase // Fallback to current phase if not provided
    const overallProgress = progress !== undefined ? Math.min(progress, 100) : currentSession.overall_progress

    const { error: updateError } = await supabase
      .from('training_sessions')
      .update({
        phases_completed: newPhasesCompleted,
        // total_score is NOT updated here - it comes from quiz_responses at completion
        total_time_spent: newTimeSpent,
        current_training_phase: updatedNextPhase,
        overall_progress: overallProgress,
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
      phasesCompleted: newPhasesCompleted,
      nextPhase: updatedNextPhase,
    }, 'Training phase completed')

    return NextResponse.json({
      success: true,
      phasesCompleted: newPhasesCompleted,
      nextPhase: updatedNextPhase,
      overallProgress,
    })

  } catch (error) {
    logger.error({ error }, 'Training phase POST error')
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
