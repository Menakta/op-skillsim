/**
 * Students API Route
 *
 * GET /api/admin/students - Get all students from training_sessions
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

async function getSessionFromRequest(request: NextRequest): Promise<{ role: string } | null> {
  const token = request.cookies.get('session_token')?.value

  if (!token) {
    return null
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      role: payload.role as string,
    }
  } catch {
    return null
  }
}

// =============================================================================
// GET - Get all students
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

    // Fetch all training sessions
    const { data: trainingSessions, error: sessionsError } = await supabase
      .from('training_sessions')
      .select('*')
      .order('created_at', { ascending: false })

    if (sessionsError) {
      logger.error({ error: sessionsError.message }, 'Failed to fetch training sessions')
      return NextResponse.json(
        { success: false, error: 'Failed to fetch data' },
        { status: 500 }
      )
    }

    // Fetch quiz responses
    const { data: quizResponses, error: quizError } = await supabase
      .from('quiz_responses')
      .select('*')
      .order('created_at', { ascending: false })

    if (quizError) {
      logger.error({ error: quizError.message }, 'Failed to fetch quiz responses')
    }

    const allSessions = trainingSessions || []
    const allQuizzes = quizResponses || []

    // Helper function to determine effective status
    const getEffectiveStatus = (session: { status: string; overall_progress?: number }) => {
      // If progress is 100%, it's completed regardless of stored status
      if (session.overall_progress === 100) return 'completed'
      return session.status
    }

    // Build students list from training sessions (group by email)
    const studentsMap = new Map<string, {
      id: string
      name: string
      email: string
      institution: string
      enrolledDate: string
      lastActive: string
      progress: number
      status: string
      totalScore: number
      sessionsCount: number
      phasesCompleted: number
      sessions: typeof allSessions
    }>()

    for (const session of allSessions) {
      const email = session.student?.email
      if (!email) continue

      const existing = studentsMap.get(email)
      if (existing) {
        // Update with latest/best data
        if (new Date(session.updated_at) > new Date(existing.lastActive)) {
          existing.lastActive = session.updated_at
        }
        existing.progress = Math.max(existing.progress, session.overall_progress || 0)
        const effectiveStatus = getEffectiveStatus(session)
        if (effectiveStatus === 'completed') {
          existing.status = 'completed'
        } else if (effectiveStatus === 'active' && existing.status !== 'completed') {
          existing.status = 'active'
        }
        existing.totalScore += session.total_score || 0
        existing.sessionsCount++
        existing.phasesCompleted = Math.max(existing.phasesCompleted, session.phases_completed || 0)
        existing.sessions.push(session)
      } else {
        studentsMap.set(email, {
          id: session.id,
          name: session.student?.full_name || 'Unknown Student',
          email: email,
          institution: session.student?.institution || 'Unknown Institution',
          enrolledDate: session.created_at,
          lastActive: session.updated_at,
          progress: session.overall_progress || 0,
          status: getEffectiveStatus(session),
          totalScore: session.total_score || 0,
          sessionsCount: 1,
          phasesCompleted: session.phases_completed || 0,
          sessions: [session],
        })
      }
    }

    // Build quiz results per student
    const quizResultsMap = new Map<string, {
      totalQuizzes: number
      correctQuizzes: number
      results: {
        id: string
        questionId: string
        isCorrect: boolean
        attempts: number
        completedAt: string
      }[]
    }>()

    for (const quiz of allQuizzes) {
      const sessionId = quiz.session_id
      // Find the student email for this session
      const session = allSessions.find(s => s.session_id === sessionId)
      const email = session?.student?.email
      if (!email) continue

      const existing = quizResultsMap.get(email) || {
        totalQuizzes: 0,
        correctQuizzes: 0,
        results: [],
      }

      existing.totalQuizzes++
      if (quiz.is_correct) {
        existing.correctQuizzes++
      }
      existing.results.push({
        id: quiz.id,
        questionId: quiz.question_id,
        isCorrect: quiz.is_correct,
        attempts: quiz.attempt_number || 1,
        completedAt: quiz.created_at,
      })

      quizResultsMap.set(email, existing)
    }

    // Convert to array with calculated fields
    const students = Array.from(studentsMap.values()).map(s => {
      const quizData = quizResultsMap.get(s.email)
      const averageScore = quizData && quizData.totalQuizzes > 0
        ? Math.round((quizData.correctQuizzes / quizData.totalQuizzes) * 100)
        : 0

      return {
        id: s.id,
        name: s.name,
        email: s.email,
        institution: s.institution,
        enrolledDate: s.enrolledDate,
        lastActive: s.lastActive,
        progress: s.progress,
        status: s.status,
        averageScore,
        completedModules: s.phasesCompleted,
        totalModules: 4, // 4 phases in training
        sessionsCount: s.sessionsCount,
        quizResults: quizData?.results || [],
      }
    })

    // Sort by last active (most recent first)
    students.sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime())

    // Calculate stats
    const totalStudents = students.length
    const activeStudents = students.filter(s => s.status === 'active').length
    const completedStudents = students.filter(s => s.status === 'completed').length
    const avgProgress = totalStudents > 0
      ? Math.round(students.reduce((acc, s) => acc + s.progress, 0) / totalStudents)
      : 0

    return NextResponse.json({
      success: true,
      students,
      stats: {
        totalStudents,
        activeStudents,
        completedStudents,
        avgProgress,
      },
    })

  } catch (error) {
    logger.error({ error }, 'Students GET error')
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
