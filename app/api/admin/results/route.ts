/**
 * Results API Route
 *
 * GET /api/admin/results - Get all quiz results from quiz_responses table
 */

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getSupabaseAdmin } from '@/app/lib/supabase/admin'
import { logger } from '@/app/lib/logger'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-min-32-chars'
)

// =============================================================================
// Types
// =============================================================================

interface QuestionDetail {
  questionId: string
  answer: string
  correct: boolean
  attempts: number
  time: number
}

// =============================================================================
// Helper: Get session from token
// =============================================================================

interface SessionInfo {
  role: string
  isLti: boolean
  userId: string
  email: string
}

async function getSessionFromRequest(request: NextRequest): Promise<SessionInfo | null> {
  const token = request.cookies.get('session_token')?.value

  if (!token) {
    return null
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      role: payload.role as string,
      isLti: payload.isLti as boolean || false,
      userId: payload.userId as string || '',
      email: payload.email as string || '',
    }
  } catch {
    return null
  }
}

// =============================================================================
// Helper: Check if user is LTI Admin (only LTI admins can delete)
// =============================================================================

function isLtiAdmin(session: SessionInfo | null): boolean {
  return session !== null && session.role === 'admin' && session.isLti === true
}

// =============================================================================
// GET - Get all results from quiz_responses
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (session.role !== 'teacher' && session.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Fetch all quiz responses as the primary data source
    const { data: quizResponses, error: quizError } = await supabase
      .from('quiz_responses')
      .select('*')
      .order('answered_at', { ascending: false })

    if (quizError) {
      logger.error({ error: quizError.message }, 'Failed to fetch quiz responses')
      return NextResponse.json(
        { success: false, error: 'Failed to fetch quiz results' },
        { status: 500 }
      )
    }

    // Fetch training sessions to get student info
    // Note: quiz_responses.session_id matches training_sessions.id (not session_id)
    const { data: trainingSessions, error: sessionsError } = await supabase
      .from('training_sessions')
      .select('id, session_id, student, course_name, course_id, status, current_training_phase, start_time, total_time_spent, overall_progress')

    if (sessionsError) {
      logger.error({ error: sessionsError.message }, 'Failed to fetch training sessions')
    }

    // Fetch user sessions to get lti_context with full_name as fallback
    const { data: userSessions, error: userSessionsError } = await supabase
      .from('user_sessions')
      .select('session_id, email, lti_context')
      .eq('role', 'student')

    if (userSessionsError) {
      logger.error({ error: userSessionsError.message }, 'Failed to fetch user sessions')
    }

    // Create a map of session_id to lti_context for name fallback
    const userSessionMap = new Map<string, { email: string; full_name?: string }>()
    for (const us of userSessions || []) {
      const ltiContext = typeof us.lti_context === 'string'
        ? JSON.parse(us.lti_context)
        : us.lti_context
      userSessionMap.set(us.session_id, {
        email: us.email,
        full_name: ltiContext?.full_name,
      })
    }

    // Create a map of training_sessions.id to session data
    // quiz_responses.session_id references training_sessions.id
    const sessionMap = new Map<string, {
      userSessionId: string
      student: { full_name?: string; email?: string; user_id?: string; institution?: string } | null
      courseName: string
      courseId: string
      status: string
      currentPhase: string
      startTime: string
      timeSpent: number
      overallProgress: number
    }>()

    for (const session of trainingSessions || []) {
      // Use session.id as the key (this is what quiz_responses.session_id references)
      sessionMap.set(session.id, {
        userSessionId: session.session_id, // This links to user_sessions
        student: session.student,
        courseName: session.course_name || 'VR Pipe Training',
        courseId: session.course_id,
        status: session.overall_progress === 100 ? 'completed' : session.status,
        currentPhase: session.current_training_phase,
        startTime: session.start_time,
        timeSpent: session.total_time_spent || 0,
        overallProgress: session.overall_progress || 0,
      })
    }

    // Build results from quiz_responses
    const results = (quizResponses || []).map(quiz => {
      // Parse question_data JSON
      let questionData: Record<string, { time: number; answer: string; correct: boolean; attempts: number }> = {}

      try {
        if (typeof quiz.question_data === 'string') {
          questionData = JSON.parse(quiz.question_data)
        } else if (quiz.question_data) {
          questionData = quiz.question_data
        }
      } catch {
        logger.warn({ quizId: quiz.id }, 'Failed to parse question_data')
      }

      // Convert question_data to array format
      const allQuestions: QuestionDetail[] = Object.entries(questionData).map(([questionId, data]) => ({
        questionId,
        answer: data.answer,
        correct: data.correct,
        attempts: data.attempts,
        time: data.time,
      }))

      // Get session info
      const sessionInfo = sessionMap.get(quiz.session_id)

      // Calculate totals from question_data if not in quiz record
      const totalQuestions = quiz.total_questions || allQuestions.length

      // Limit questions to totalQuestions (in case of corrupted data with extra entries)
      // Sort by questionId to ensure consistent ordering (Q1, Q2, Q3, etc.)
      const questions = allQuestions
        .sort((a, b) => a.questionId.localeCompare(b.questionId))
        .slice(0, totalQuestions)
      // Ensure correctCount doesn't exceed totalQuestions (prevents >100% scores)
      const rawCorrectCount = quiz.correct_count ?? questions.filter(q => q.correct).length
      const correctCount = Math.min(rawCorrectCount, totalQuestions)
      // Cap scorePercentage at 100%
      const rawScorePercentage = parseFloat(quiz.score_percentage) ||
        (totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0)
      const scorePercentage = Math.min(rawScorePercentage, 100)

      // Determine if passed (75% threshold)
      const passed = scorePercentage >= 75

      // Get name from: training session -> lti_context -> email prefix (if real email)
      // Don't use email prefix if it's a fake LTI email (lti-* or ends with @lti.local)
      const userSessionInfo = sessionInfo?.userSessionId
        ? userSessionMap.get(sessionInfo.userSessionId)
        : undefined
      const studentEmail = sessionInfo?.student?.email || ''
      const isFakeLtiEmail = studentEmail.startsWith('lti-') || studentEmail.endsWith('@lti.local')
      const emailPrefix = !isFakeLtiEmail && studentEmail ? studentEmail.split('@')[0] : undefined
      const studentName = sessionInfo?.student?.full_name
        || userSessionInfo?.full_name
        || emailPrefix
        || 'Student'

      return {
        id: quiz.id,
        sessionId: quiz.session_id,
        // Student details from training_sessions.student JSONB column with fallbacks
        studentName,
        studentEmail: sessionInfo?.student?.email || userSessionInfo?.email || 'unknown@email.com',
        studentInstitution: sessionInfo?.student?.institution || '',
        // Course info
        courseName: sessionInfo?.courseName || 'VR Pipe Training',
        courseId: sessionInfo?.courseId || '',
        // Quiz results
        totalQuestions,
        correctCount,
        scorePercentage,
        passed,
        // Session info
        status: sessionInfo?.status || 'completed',
        currentPhase: sessionInfo?.currentPhase || 'N/A',
        timeSpent: sessionInfo?.timeSpent || 0,
        // Timestamps
        answeredAt: quiz.answered_at,
        startedAt: sessionInfo?.startTime || quiz.answered_at,
        // Question details
        questions,
      }
    })

    // Calculate stats
    const totalResults = results.length
    const passedCount = results.filter(r => r.passed).length
    const failedCount = results.filter(r => !r.passed).length
    const avgScore = totalResults > 0
      ? Math.round(results.reduce((acc, r) => acc + r.scorePercentage, 0) / totalResults)
      : 0
    const passRate = totalResults > 0
      ? Math.round((passedCount / totalResults) * 100)
      : 0

    // Get unique courses for filter
    const courses = [...new Set(results.map(r => r.courseName))].map(name => ({
      id: name,
      title: name,
    }))

    return NextResponse.json({
      success: true,
      results,
      stats: {
        totalResults,
        passedCount,
        failedCount,
        avgScore,
        passRate,
      },
      courses,
    })

  } catch (error) {
    logger.error({ error }, 'Results GET error')
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =============================================================================
// DELETE - Delete quiz results (single or bulk) - LTI Admin only
// =============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only LTI admins can delete
    if (!isLtiAdmin(session)) {
      return NextResponse.json(
        { success: false, error: 'Access denied. Only LTI administrators can delete results.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { ids } = body as { ids: string[] }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No result IDs provided' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()
    const deletedIds: string[] = []
    const errors: string[] = []

    for (const id of ids) {
      try {
        const { error: deleteError } = await supabase
          .from('quiz_responses')
          .delete()
          .eq('id', id)

        if (deleteError) {
          errors.push(`Failed to delete result ${id}: ${deleteError.message}`)
        } else {
          deletedIds.push(id)
        }
      } catch (err) {
        errors.push(`Error deleting result ${id}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    logger.info({
      deletedCount: deletedIds.length,
      adminEmail: session.email,
      deletedIds,
    }, 'Quiz results deleted by LTI admin')

    return NextResponse.json({
      success: true,
      deletedCount: deletedIds.length,
      deletedIds,
      errors: errors.length > 0 ? errors : undefined,
    })

  } catch (error) {
    logger.error({ error }, 'Results DELETE error')
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
