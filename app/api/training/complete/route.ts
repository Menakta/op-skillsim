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

    // Skip saving for admin/teacher roles (they are just testing)
    if (session.role === 'admin' || session.role === 'teacher') {
      logger.info({ sessionId: session.sessionId, role: session.role }, 'Test mode: Skipping training completion save for admin/teacher')
      return NextResponse.json({
        success: true,
        session: null,
        testMode: true,
        message: `Test mode: Training completion not saved for ${session.role}`,
      })
    }

    const body: CompleteTrainingBody = await request.json()
    const { finalResults, totalTimeMs, phasesCompleted, quizData, totalQuestions } = body

    const supabase = getSupabaseAdmin()

    // Get training session (any status - for idempotency)
    const { data: currentSession } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('session_id', session.sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!currentSession) {
      return NextResponse.json(
        { success: false, error: 'No training session found' },
        { status: 404 }
      )
    }

    // If already completed, return success (idempotent)
    if (currentSession.status === 'completed') {
      logger.info({ sessionId: currentSession.id }, 'Training session already completed')
      return NextResponse.json({
        success: true,
        session: currentSession,
        alreadyCompleted: true,
      })
    }

    // Get quiz performance from quiz_responses table (source of truth)
    const { data: quizResponse } = await supabase
      .from('quiz_responses')
      .select('correct_count, total_questions, question_data')
      .eq('session_id', currentSession.id)
      .order('answered_at', { ascending: false })
      .limit(1)
      .single()

    // Calculate quiz performance from quiz_responses (not from request data)
    let quizPerformance = {
      totalQuestions: 0,
      correctFirstTry: 0,
      totalAttempts: 0,
      averageTimeMs: 0,
    }

    // total_score = number of correct quiz answers (from quiz_responses)
    let totalScore = 0
    let actualTotalQuestions = 0

    if (quizResponse) {
      totalScore = quizResponse.correct_count || 0
      actualTotalQuestions = quizResponse.total_questions || 0

      // Calculate detailed quiz performance from question_data
      const questionData = quizResponse.question_data as QuestionDataMap | null
      if (questionData && Object.keys(questionData).length > 0) {
        const entries = Object.entries(questionData)
        quizPerformance.totalQuestions = actualTotalQuestions
        quizPerformance.correctFirstTry = entries.filter(([, v]) => v.correct && v.attempts === 1).length
        quizPerformance.totalAttempts = entries.reduce((sum, [, v]) => sum + v.attempts, 0)
        quizPerformance.averageTimeMs = entries.length > 0
          ? Math.round(entries.reduce((sum, [, v]) => sum + v.time, 0) / entries.length)
          : 0
      }
    } else if (quizData && Object.keys(quizData).length > 0) {
      // Fallback to request data if no quiz_responses record exists
      const entries = Object.entries(quizData)
      actualTotalQuestions = totalQuestions || entries.length
      quizPerformance.totalQuestions = actualTotalQuestions
      quizPerformance.correctFirstTry = entries.filter(([, v]) => v.correct && v.attempts === 1).length
      quizPerformance.totalAttempts = entries.reduce((sum, [, v]) => sum + v.attempts, 0)
      quizPerformance.averageTimeMs = entries.length > 0
        ? Math.round(entries.reduce((sum, [, v]) => sum + v.time, 0) / entries.length)
        : 0
      totalScore = entries.filter(([, v]) => v.correct).length
    }

    // Calculate total time spent in seconds
    const totalTimeSpent = totalTimeMs ? Math.floor(totalTimeMs / 1000) : 0

    // Build final results
    const results: TrainingFinalResults = finalResults || {
      completedAt: new Date().toISOString(),
      totalTimeMs: totalTimeMs || 0,
      phaseScores: [],
      quizPerformance,
      overallGrade: calculateGrade(totalScore, actualTotalQuestions),
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
// Helper: Calculate grade based on score and quiz questions
// =============================================================================

function calculateGrade(totalScore: number, totalQuestions: number): string {
  // Max score equals total questions (1 point per correct answer)
  if (totalQuestions === 0) return 'N/A'

  const percentage = (totalScore / totalQuestions) * 100

  if (percentage >= 90) return 'A'
  if (percentage >= 80) return 'B'
  if (percentage >= 70) return 'C'
  if (percentage >= 60) return 'D'
  return 'F'
}
