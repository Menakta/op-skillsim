/**
 * Dashboard Stats API Route
 *
 * GET /api/admin/dashboard - Get dashboard statistics from Supabase
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
// GET - Get dashboard statistics
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

    // Calculate statistics
    const allSessions = trainingSessions || []
    const allQuizzes = quizResponses || []

    // Total unique students (from training sessions)
    const uniqueStudents = new Set(allSessions.map(s => s.student?.email).filter(Boolean))
    const totalStudents = uniqueStudents.size

    // Helper function to determine effective status
    const getEffectiveStatus = (session: { status: string; overall_progress?: number }) => {
      // If progress is 100%, it's completed regardless of stored status
      if (session.overall_progress === 100) return 'completed'
      return session.status
    }

    // Active sessions (status = 'active' and progress < 100)
    const activeSessions = allSessions.filter(s => getEffectiveStatus(s) === 'active').length

    // Completed trainings (status = 'completed' or progress = 100)
    const completedTrainings = allSessions.filter(s => getEffectiveStatus(s) === 'completed').length

    // Average completion rate (overall_progress average)
    const avgCompletionRate = allSessions.length > 0
      ? Math.round(allSessions.reduce((acc, s) => acc + (s.overall_progress || 0), 0) / allSessions.length)
      : 0

    // Average score (from quiz responses where is_correct is tracked)
    const correctQuizzes = allQuizzes.filter(q => q.is_correct === true).length
    const totalQuizzes = allQuizzes.length
    const averageScore = totalQuizzes > 0
      ? Math.round((correctQuizzes / totalQuizzes) * 100)
      : 0

    // Build students list from training sessions
    const studentsMap = new Map<string, {
      id: string
      name: string
      email: string
      enrolledDate: string
      lastActive: string
      progress: number
      status: string
      totalScore: number
      sessionsCount: number
    }>()

    for (const session of allSessions) {
      const email = session.student?.email
      if (!email) continue

      const existing = studentsMap.get(email)
      if (existing) {
        // Update with latest data
        if (new Date(session.updated_at) > new Date(existing.lastActive)) {
          existing.lastActive = session.updated_at
          existing.progress = Math.max(existing.progress, session.overall_progress || 0)
          existing.status = getEffectiveStatus(session)
        }
        existing.totalScore += session.total_score || 0
        existing.sessionsCount++
      } else {
        studentsMap.set(email, {
          id: session.id,
          name: session.student?.full_name || 'Unknown Student',
          email: email,
          enrolledDate: session.created_at,
          lastActive: session.updated_at,
          progress: session.overall_progress || 0,
          status: getEffectiveStatus(session),
          totalScore: session.total_score || 0,
          sessionsCount: 1,
        })
      }
    }

    const students = Array.from(studentsMap.values()).map(s => ({
      id: s.id,
      name: s.name,
      email: s.email,
      enrolledDate: s.enrolledDate,
      lastActive: s.lastActive,
      progress: s.progress,
      status: s.status,
      averageScore: s.sessionsCount > 0 ? Math.round(s.totalScore / s.sessionsCount) : 0,
      completedModules: Math.floor(s.progress / 25), // Approximate based on 4 phases
      totalModules: 4,
    }))

    // Recent activity from training sessions
    const recentActivity = allSessions
      .slice(0, 10)
      .map(session => {
        let action = 'Started training'
        let details = session.course_name || 'VR Pipe Training'

        const effectiveStatus = getEffectiveStatus(session)
        if (effectiveStatus === 'completed') {
          action = 'Completed training'
          details = `${session.course_name || 'Training'} - ${session.overall_progress}%`
        } else if (effectiveStatus === 'paused') {
          action = 'Paused training'
        } else if (session.overall_progress > 0) {
          action = 'In progress'
          details = `${session.current_training_phase} - ${session.overall_progress}%`
        }

        return {
          id: session.id,
          studentName: session.student?.full_name || 'Unknown Student',
          action,
          timestamp: session.updated_at,
          details,
        }
      })

    // Top performers (students sorted by progress/score)
    const topPerformers = [...students]
      .sort((a, b) => b.progress - a.progress || b.averageScore - a.averageScore)
      .slice(0, 5)

    // Quiz stats
    const passedAssessments = allSessions.filter(s => getEffectiveStatus(s) === 'completed' && s.overall_progress >= 75).length
    const failedAssessments = allSessions.filter(s => getEffectiveStatus(s) === 'completed' && s.overall_progress < 75).length

    return NextResponse.json({
      success: true,
      stats: {
        totalStudents,
        activeSessions,
        completedTrainings,
        averageCompletionRate: avgCompletionRate,
        averageScore,
        passedAssessments,
        failedAssessments,
        recentActivity,
      },
      students,
      topPerformers,
    })

  } catch (error) {
    logger.error({ error }, 'Dashboard GET error')
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
