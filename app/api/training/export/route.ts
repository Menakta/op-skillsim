/**
 * Training Export API Route
 *
 * GET /api/training/export - Get training session + quiz data for PDF export
 *
 * Returns the student info, session stats, and quiz question_data
 * needed by the ResultExportPDF component.
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
  email: string
  role: string
}

async function getSessionFromRequest(request: NextRequest): Promise<SessionPayload | null> {
  const token = request.cookies.get('session_token')?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      sessionId: payload.sessionId as string,
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as string,
    }
  } catch {
    return null
  }
}

// =============================================================================
// GET - Fetch training session + quiz data for PDF export
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

    const supabase = getSupabaseAdmin()

    // Get the most recent training session for this user (any status)
    const { data: trainingSession, error: tsError } = await supabase
      .from('training_sessions')
      .select('id, student, phases_completed, total_time_spent, overall_progress, status')
      .eq('session_id', session.sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (tsError || !trainingSession) {
      // Fallback: try by email
      const { data: fallbackSession, error: fbError } = await supabase
        .from('training_sessions')
        .select('id, student, phases_completed, total_time_spent, overall_progress, status')
        .eq('email', session.email)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (fbError || !fallbackSession) {
        logger.warn({ sessionId: session.sessionId, email: session.email }, 'No training session found for export')
        return NextResponse.json(
          { success: false, error: 'No training session found' },
          { status: 404 }
        )
      }

      // Use fallback
      Object.assign(trainingSession ?? {}, fallbackSession)
      if (!trainingSession) {
        // Get quiz data for fallback session
        const { data: quizResponse } = await supabase
          .from('quiz_responses')
          .select('question_data')
          .eq('session_id', fallbackSession.id)
          .order('answered_at', { ascending: false })
          .limit(1)
          .single()

        return NextResponse.json({
          success: true,
          data: {
            student: fallbackSession.student || {},
            session: {
              phases_completed: fallbackSession.phases_completed || 0,
              total_time_spent: fallbackSession.total_time_spent || 0,
              overall_progress: fallbackSession.overall_progress || 0,
            },
            questionData: quizResponse?.question_data || {},
          },
        })
      }
    }

    // Get quiz response for this training session
    const { data: quizResponse } = await supabase
      .from('quiz_responses')
      .select('question_data')
      .eq('session_id', trainingSession.id)
      .order('answered_at', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({
      success: true,
      data: {
        student: trainingSession.student || {},
        session: {
          phases_completed: trainingSession.phases_completed || 0,
          total_time_spent: trainingSession.total_time_spent || 0,
          overall_progress: trainingSession.overall_progress || 0,
        },
        questionData: quizResponse?.question_data || {},
      },
    })

  } catch (error) {
    logger.error({ error }, 'Training export GET error')
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
