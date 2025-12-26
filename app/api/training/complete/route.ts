/**
 * Training Complete API Route
 *
 * POST /api/training/complete - Complete the entire training session
 */

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getSupabaseAdmin } from '@/app/lib/supabase/admin'
import { logger } from '@/app/lib/logger'
import type { TrainingFinalResults, QuestionDataMap } from '@/app/types'

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
// Request body type
// =============================================================================

interface CompleteTrainingBody {
  finalResults?: TrainingFinalResults
  totalTimeMs?: number
  phasesCompleted?: number
  quizData?: QuestionDataMap
  totalQuestions?: number
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

    const body: CompleteTrainingBody = await request.json()
    const { finalResults, totalTimeMs, phasesCompleted, quizData, totalQuestions } = body

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

    // Calculate quiz performance from quiz data
    let quizPerformance = {
      totalQuestions: 0,
      correctFirstTry: 0,
      totalAttempts: 0,
      averageTimeMs: 0,
    }
    let totalScore = 0

    if (quizData && Object.keys(quizData).length > 0) {
      const entries = Object.entries(quizData)
      quizPerformance.totalQuestions = totalQuestions || entries.length
      quizPerformance.correctFirstTry = entries.filter(([, v]) => v.correct && v.attempts === 1).length
      quizPerformance.totalAttempts = entries.reduce((sum, [, v]) => sum + v.attempts, 0)
      quizPerformance.averageTimeMs = Math.round(
        entries.reduce((sum, [, v]) => sum + v.time, 0) / entries.length
      )

      // Calculate score: 100 points per correct answer, minus 10 per extra attempt
      totalScore = entries.reduce((sum, [, v]) => {
        if (v.correct) {
          return sum + Math.max(100 - (v.attempts - 1) * 10, 50) // Min 50 points if correct
        }
        return sum
      }, 0)
    }

    // Calculate total time spent in seconds
    const totalTimeSpent = totalTimeMs ? Math.floor(totalTimeMs / 1000) : 0

    // Build final results
    const results: TrainingFinalResults = finalResults || {
      completedAt: new Date().toISOString(),
      totalTimeMs: totalTimeMs || 0,
      phaseScores: [],
      quizPerformance,
      overallGrade: calculateGrade(totalScore, phasesCompleted || 6),
    }

    // Update training session with all data
    const { data: updatedSession, error: updateError } = await supabase
      .from('training_sessions')
      .update({
        status: 'completed',
        overall_progress: 100,
        end_time: new Date().toISOString(),
        total_time_spent: totalTimeSpent,
        phases_completed: phasesCompleted || 6,
        total_score: totalScore,
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
      totalScore,
      phasesCompleted: phasesCompleted || 6,
      totalTimeSpent,
      quizQuestionsAnswered: quizData ? Object.keys(quizData).length : 0,
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
