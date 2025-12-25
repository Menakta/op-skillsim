/**
 * Quiz Response API Route
 *
 * POST /api/quiz/response - Submit all quiz results at once
 * GET /api/quiz/response - Get quiz results for current session
 *
 * New schema: All question data stored in JSONB column
 */

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getSupabaseAdmin } from '@/app/lib/supabase/admin'
import { logger } from '@/app/lib/logger'
import type { QuizResponseInsert, SubmitQuizResultsRequest, QuestionDataMap } from '@/app/types'

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
// Helper: Get training session ID from user session
// =============================================================================

async function getTrainingSessionId(userSessionId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('training_sessions')
    .select('id')
    .eq('session_id', userSessionId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    logger.warn({ userSessionId, error: error?.message }, 'No active training session found')
    return null
  }

  return data.id
}

// =============================================================================
// Helper: Validate question data map
// =============================================================================

function isValidQuestionDataMap(data: unknown): data is QuestionDataMap {
  if (!data || typeof data !== 'object') return false

  for (const [key, value] of Object.entries(data)) {
    if (typeof key !== 'string') return false
    if (!value || typeof value !== 'object') return false

    const entry = value as Record<string, unknown>
    if (typeof entry.answer !== 'string') return false
    if (!['A', 'B', 'C', 'D'].includes(entry.answer)) return false
    if (typeof entry.attempts !== 'number') return false
    if (typeof entry.time !== 'number') return false
    if (typeof entry.correct !== 'boolean') return false
  }

  return true
}

// =============================================================================
// POST - Submit all quiz results
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // 1. Verify session
    const session = await getSessionFromRequest(request)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // 2. Parse request body
    const body: SubmitQuizResultsRequest = await request.json()
    const { questionData, totalQuestions, finalScorePercentage } = body

    // 3. Validate required fields
    if (!questionData || totalQuestions === undefined || finalScorePercentage === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: questionData, totalQuestions, finalScorePercentage' },
        { status: 400 }
      )
    }

    if (!isValidQuestionDataMap(questionData)) {
      return NextResponse.json(
        { success: false, error: 'Invalid questionData format' },
        { status: 400 }
      )
    }

    // 4. Get training session ID
    const supabase = getSupabaseAdmin()
    let trainingSessionId = await getTrainingSessionId(session.sessionId)

    if (!trainingSessionId) {
      // Create a placeholder training session if none exists
      logger.warn({ sessionId: session.sessionId }, 'No training session - creating placeholder')

      const { data: newSession, error: createError } = await supabase
        .from('training_sessions')
        .insert({
          session_id: session.sessionId,
          course_id: 'default',
          course_name: 'Training Session',
          training_phase: 'Phase A',
          overall_progress: 0,
          status: 'active',
        })
        .select('id')
        .single()

      if (createError || !newSession) {
        logger.error({ error: createError?.message }, 'Failed to create training session')
        return NextResponse.json(
          { success: false, error: 'Failed to create training session' },
          { status: 500 }
        )
      }

      trainingSessionId = newSession.id
    }

    // 5. Calculate correct count from question data
    const correctCount = Object.values(questionData).filter(q => q.correct).length

    // 6. Insert quiz response with all question data
    const responseData: QuizResponseInsert = {
      session_id: trainingSessionId!,
      question_data: questionData,
      total_questions: totalQuestions,
      correct_count: correctCount,
      score_percentage: finalScorePercentage,
    }

    logger.info({ responseData }, 'Inserting quiz response')

    const { data: quizResponse, error: insertError } = await supabase
      .from('quiz_responses')
      .insert(responseData)
      .select()
      .single()

    if (insertError) {
      logger.error({ error: insertError.message, code: insertError.code, details: insertError.details }, 'Failed to save quiz results')
      return NextResponse.json(
        { success: false, error: `Failed to save quiz results: ${insertError.message}`, code: insertError.code },
        { status: 500 }
      )
    }

    logger.info({
      totalQuestions,
      finalScorePercentage,
      sessionId: trainingSessionId,
      questionsAnswered: Object.keys(questionData).length
    }, 'Quiz results saved')

    return NextResponse.json({
      success: true,
      response: quizResponse,
    })

  } catch (error) {
    logger.error({ error }, 'Quiz response API error')
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =============================================================================
// GET - Get quiz results for current session
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    // 1. Verify session
    const session = await getSessionFromRequest(request)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // 2. Get training session ID
    const trainingSessionId = await getTrainingSessionId(session.sessionId)

    if (!trainingSessionId) {
      return NextResponse.json({
        success: true,
        response: null,
      })
    }

    // 3. Fetch quiz results
    const supabase = getSupabaseAdmin()
    const { data: quizResponse, error } = await supabase
      .from('quiz_responses')
      .select('*')
      .eq('session_id', trainingSessionId)
      .order('answered_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      logger.error({ error: error.message }, 'Failed to fetch quiz results')
      return NextResponse.json(
        { success: false, error: 'Failed to fetch quiz results' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      response: quizResponse || null,
    })

  } catch (error) {
    logger.error({ error }, 'Quiz response GET API error')
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
