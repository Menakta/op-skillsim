/**
 * Quiz Response API Route
 *
 * POST /api/quiz/response - Submit a quiz answer
 * GET /api/quiz/response - Get all responses for current session
 */

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getSupabaseAdmin } from '@/app/lib/supabase/admin'
import { logger } from '@/app/lib/logger'
import { indexToAnswer } from '@/app/types'
import type { QuizResponseInsert, SubmitQuizAnswerRequest } from '@/app/types'

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
// POST - Submit quiz answer
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
    const body: SubmitQuizAnswerRequest = await request.json()
    const { questionId, selectedAnswer, isCorrect, attemptCount, timeToAnswer } = body

    // 3. Validate required fields
    if (!questionId || selectedAnswer === undefined || isCorrect === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: questionId, selectedAnswer, isCorrect' },
        { status: 400 }
      )
    }

    // 4. Get training session ID
    const trainingSessionId = await getTrainingSessionId(session.sessionId)

    if (!trainingSessionId) {
      // Create a placeholder training session if none exists
      logger.warn({ sessionId: session.sessionId }, 'No training session - creating placeholder')

      const supabase = getSupabaseAdmin()
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

      // Use the new session ID
      const sessionIdToUse = newSession.id

      // 5. Insert quiz response
      const responseData: QuizResponseInsert = {
        session_id: sessionIdToUse,
        question_id: questionId,
        selected_answer: indexToAnswer(selectedAnswer),
        is_correct: isCorrect,
        attempt_count: attemptCount || 1,
        time_to_answer: timeToAnswer,
      }

      const { data: quizResponse, error: insertError } = await supabase
        .from('quiz_responses')
        .insert(responseData)
        .select()
        .single()

      if (insertError) {
        logger.error({ error: insertError.message, questionId }, 'Failed to save quiz response')
        return NextResponse.json(
          { success: false, error: 'Failed to save response' },
          { status: 500 }
        )
      }

      logger.info({
        questionId,
        isCorrect,
        attemptCount,
        sessionId: sessionIdToUse
      }, 'Quiz response saved')

      return NextResponse.json({
        success: true,
        response: quizResponse,
      })
    }

    // 5. Insert quiz response
    const supabase = getSupabaseAdmin()
    const responseData: QuizResponseInsert = {
      session_id: trainingSessionId,
      question_id: questionId,
      selected_answer: indexToAnswer(selectedAnswer),
      is_correct: isCorrect,
      attempt_count: attemptCount || 1,
      time_to_answer: timeToAnswer,
    }

    const { data: quizResponse, error: insertError } = await supabase
      .from('quiz_responses')
      .insert(responseData)
      .select()
      .single()

    if (insertError) {
      logger.error({ error: insertError.message, questionId }, 'Failed to save quiz response')
      return NextResponse.json(
        { success: false, error: 'Failed to save response' },
        { status: 500 }
      )
    }

    logger.info({
      questionId,
      isCorrect,
      attemptCount,
      sessionId: trainingSessionId
    }, 'Quiz response saved')

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
// GET - Get all responses for current session
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
        responses: [],
      })
    }

    // 3. Fetch responses
    const supabase = getSupabaseAdmin()
    const { data: responses, error } = await supabase
      .from('quiz_responses')
      .select('*')
      .eq('session_id', trainingSessionId)
      .order('answered_at', { ascending: true })

    if (error) {
      logger.error({ error: error.message }, 'Failed to fetch quiz responses')
      return NextResponse.json(
        { success: false, error: 'Failed to fetch responses' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      responses: responses || [],
    })

  } catch (error) {
    logger.error({ error }, 'Quiz response GET API error')
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
