/**
 * Training Complete API Route
 *
 * POST /api/training/complete - Complete the entire training session
 */

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getSupabaseAdmin } from '@/app/lib/supabase/admin'
import { logger } from '@/app/lib/logger'
import type { TrainingFinalResults } from '@/app/types'

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
// POST - Complete training session
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
    const { finalResults } = body as { finalResults?: TrainingFinalResults }

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

    // Build final results if not provided
    const results: TrainingFinalResults = finalResults || {
      completedAt: new Date().toISOString(),
      totalTimeMs: currentSession.total_time_spent * 1000,
      phaseScores: [],
      quizPerformance: {
        totalQuestions: 0,
        correctFirstTry: 0,
        totalAttempts: 0,
        averageTimeMs: 0,
      },
      overallGrade: calculateGrade(currentSession.total_score, currentSession.phases_completed),
    }

    const { data: updatedSession, error: updateError } = await supabase
      .from('training_sessions')
      .update({
        status: 'completed',
        completion_percentage: 100,
        end_time: new Date().toISOString(),
        final_results: results,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentSession.id)
      .select()
      .single()

    if (updateError) {
      logger.error({ error: updateError.message }, 'Failed to complete training')
      return NextResponse.json(
        { success: false, error: 'Failed to complete training' },
        { status: 500 }
      )
    }

    logger.info({
      sessionId: currentSession.id,
      totalScore: currentSession.total_score,
      phasesCompleted: currentSession.phases_completed,
    }, 'Training session completed')

    return NextResponse.json({
      success: true,
      session: updatedSession,
    })

  } catch (error) {
    logger.error({ error }, 'Training complete POST error')
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =============================================================================
// Helper: Calculate grade based on score and phases
// =============================================================================

function calculateGrade(totalScore: number, phasesCompleted: number): string {
  const maxPossibleScore = phasesCompleted * 100 // Assuming 100 points per phase
  if (maxPossibleScore === 0) return 'N/A'

  const percentage = (totalScore / maxPossibleScore) * 100

  if (percentage >= 90) return 'A'
  if (percentage >= 80) return 'B'
  if (percentage >= 70) return 'C'
  if (percentage >= 60) return 'D'
  return 'F'
}
