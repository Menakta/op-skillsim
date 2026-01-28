/**
 * Quiz Response API Route
 *
 * POST /api/quiz/response - Save quiz response (upsert - creates or updates)
 * GET /api/quiz/response - Get quiz results for current session
 *
 * Saves incrementally after each question answer.
 * Uses upsert to update existing record or create new one.
 */

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getSupabaseAdmin } from '@/app/lib/supabase/admin'
import { logger } from '@/app/lib/logger'
import type { QuestionDataMap } from '@/app/types'
import { keyToQuestionId } from '@/app/types'

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
// Helper: Get training session ID from user session
// =============================================================================

async function getTrainingSessionId(userSessionId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin()

  // Find training session regardless of status (active, completed, etc.)
  // Quiz responses should be saved even if training just completed
  const { data, error } = await supabase
    .from('training_sessions')
    .select('id')
    .eq('session_id', userSessionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    logger.warn({ userSessionId, error: error?.message }, 'No training session found')
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
// Helper: Get valid question IDs from questionnaires table
// =============================================================================

async function getValidQuestionIds(): Promise<Set<string>> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('questionnaires')
    .select('question_id')

  if (error || !data) {
    logger.warn({ error: error?.message }, 'Failed to fetch valid question IDs')
    return new Set()
  }

  return new Set(data.map((q: { question_id: string }) => q.question_id))
}

// =============================================================================
// Helper: Remove entries whose keys don't map to valid questionnaire IDs
// =============================================================================

function sanitizeQuestionData(
  questionData: QuestionDataMap,
  validIds: Set<string>
): QuestionDataMap {
  const sanitized: QuestionDataMap = {}

  for (const [key, value] of Object.entries(questionData)) {
    // Resolve any key format (e.g., "q_001" or "Q1") to canonical ID ("Q1")
    const questionId = keyToQuestionId(key)

    if (!validIds.has(questionId)) {
      logger.info({ key, questionId }, 'Removing question entry not found in questionnaires')
      continue
    }

    // Normalize to canonical question ID (e.g., "Q1") as the key.
    // If both "Q1" and "q_001" exist, the canonical "Q1" entry wins
    // because we process in insertion order and skip if already present.
    if (!sanitized[questionId]) {
      sanitized[questionId] = value
    }
  }

  return sanitized
}

// =============================================================================
// POST - Save quiz response (upsert - incremental save after each question)
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

    // 2. Skip save for non-LTI sessions (demo mode)
    if (!session.isLti) {
      logger.info({ sessionId: session.sessionId }, 'Demo mode: Skipping quiz response save')
      return NextResponse.json({
        success: true,
        response: null,
        demo: true,
        message: 'Demo mode: Quiz response not saved',
      })
    }

    // 3. Skip save for admin/teacher roles (they are just testing)
    if (session.role === 'admin' || session.role === 'teacher') {
      logger.info({ sessionId: session.sessionId, role: session.role }, 'Test mode: Skipping quiz response save for admin/teacher')
      return NextResponse.json({
        success: true,
        response: null,
        testMode: true,
        message: `Test mode: Quiz response not saved for ${session.role}`,
      })
    }

    // 4. Parse request body
    const body = await request.json()
    const { questionData, totalQuestions, finalScorePercentage } = body

    // 5. Validate required fields
    if (!questionData || totalQuestions === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: questionData, totalQuestions' },
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
    const trainingSessionId = await getTrainingSessionId(session.sessionId)

    // 4b. Fetch valid question IDs and sanitize incoming data
    const validIds = await getValidQuestionIds()
    const sanitizedQuestionData = validIds.size > 0
      ? sanitizeQuestionData(questionData, validIds)
      : questionData // Fallback: keep original if lookup fails

    if (!trainingSessionId) {
      // No training session exists - this shouldn't happen in normal flow
      // Training session should be created when training starts, not here
      logger.error({ sessionId: session.sessionId }, 'No training session found - cannot save quiz response')
      return NextResponse.json(
        { success: false, error: 'No training session found' },
        { status: 404 }
      )
    }

    // 5. Use the actual valid question count as the authoritative totalQuestions
    // This prevents the client from inflating the count with DB questions
    // that the stream never requested
    const actualTotalQuestions = validIds.size > 0 ? validIds.size : totalQuestions

    // Calculate correct count and score from sanitized question data
    const rawCorrectCount = Object.values(sanitizedQuestionData).filter(q => q.correct).length
    const correctCount = Math.min(rawCorrectCount, actualTotalQuestions)
    const answeredCount = Object.keys(sanitizedQuestionData).length
    const scorePercentage = actualTotalQuestions > 0
      ? Math.min(Math.round((correctCount / actualTotalQuestions) * 100), 100)
      : 0

    // 6. Check if a quiz response already exists for this session
    const { data: existingResponse, error: fetchError } = await supabase
      .from('quiz_responses')
      .select('id, question_data')
      .eq('session_id', trainingSessionId)
      .order('answered_at', { ascending: false })
      .limit(1)
      .single()

    let quizResponse
    let insertError

    if (existingResponse && !fetchError) {
      // Update existing response - merge question data then sanitize
      const existingQuestionData = existingResponse.question_data || {}
      const rawMerged = { ...existingQuestionData, ...sanitizedQuestionData }

      // Sanitize the merged result to strip any redundant entries
      // that may have been stored previously
      const mergedQuestionData = validIds.size > 0
        ? sanitizeQuestionData(rawMerged as QuestionDataMap, validIds)
        : rawMerged

      // Count correct answers from merged data
      const mergedCorrectCount = Math.min(
        Object.values(mergedQuestionData as Record<string, { correct: boolean }>).filter((q) => q.correct).length,
        actualTotalQuestions
      )
      const mergedScorePercentage = actualTotalQuestions > 0
        ? Math.min(Math.round((mergedCorrectCount / actualTotalQuestions) * 100), 100)
        : 0

      logger.info({
        existingId: existingResponse.id,
        existingQuestions: Object.keys(existingQuestionData).length,
        newQuestions: Object.keys(sanitizedQuestionData).length,
        mergedQuestions: Object.keys(mergedQuestionData).length,
        strippedRedundant: Object.keys(rawMerged).length - Object.keys(mergedQuestionData).length,
      }, 'Updating existing quiz response (sanitized)')

      const { data, error } = await supabase
        .from('quiz_responses')
        .update({
          question_data: mergedQuestionData,
          total_questions: actualTotalQuestions,
          correct_count: mergedCorrectCount,
          score_percentage: mergedScorePercentage,
          answered_at: new Date().toISOString(),
        })
        .eq('id', existingResponse.id)
        .select()
        .single()

      quizResponse = data
      insertError = error
    } else {
      // Insert new response
      logger.info({
        trainingSessionId,
        answeredCount,
        actualTotalQuestions
      }, 'Creating new quiz response')

      const { data, error } = await supabase
        .from('quiz_responses')
        .insert({
          session_id: trainingSessionId,
          question_data: sanitizedQuestionData,
          total_questions: actualTotalQuestions,
          correct_count: correctCount,
          score_percentage: scorePercentage,
        })
        .select()
        .single()

      quizResponse = data
      insertError = error
    }

    if (insertError) {
      logger.error({ error: insertError.message, code: insertError.code }, 'Failed to save quiz results')
      return NextResponse.json(
        { success: false, error: `Failed to save quiz results: ${insertError.message}` },
        { status: 500 }
      )
    }

    logger.info({
      totalQuestions: actualTotalQuestions,
      scorePercentage,
      sessionId: trainingSessionId,
      questionsAnswered: answeredCount
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
