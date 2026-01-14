/**
 * Sessions Chart API
 *
 * Returns session counts by role for weekly, monthly, and yearly views.
 * Optimized to only return aggregated data needed for charting.
 */

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { supabaseAdmin } from '@/app/lib/supabase/admin'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-min-32-chars'
)

type TimeRange = 'weekly' | 'monthly' | 'yearly'

interface ChartDataPoint {
  label: string
  students: number
  teachers: number
  admins: number
}

export async function GET(request: NextRequest) {
  // Verify authentication
  const token = request.cookies.get('session_token')?.value
  if (!token) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const role = payload.role as string

    if (role !== 'admin' && role !== 'teacher') {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })
  }

  // Get time range from query params
  const { searchParams } = new URL(request.url)
  const range = (searchParams.get('range') || 'weekly') as TimeRange

  try {
    const chartData = await getSessionChartData(range)
    return NextResponse.json({ success: true, data: chartData, range })
  } catch (error) {
    console.error('Failed to fetch session chart data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch chart data' },
      { status: 500 }
    )
  }
}

async function getSessionChartData(range: TimeRange): Promise<ChartDataPoint[]> {
  const now = new Date()
  const data: ChartDataPoint[] = []

  if (range === 'weekly') {
    // Last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const startOfDay = new Date(date.setHours(0, 0, 0, 0))
      const endOfDay = new Date(date.setHours(23, 59, 59, 999))

      const counts = await getSessionCountsForPeriod(startOfDay, endOfDay)
      data.push({
        label: startOfDay.toLocaleDateString('en-US', { weekday: 'short' }),
        ...counts,
      })
    }
  } else if (range === 'monthly') {
    // Last 4 weeks
    for (let i = 3; i >= 0; i--) {
      const endDate = new Date(now)
      endDate.setDate(endDate.getDate() - i * 7)
      const startDate = new Date(endDate)
      startDate.setDate(startDate.getDate() - 6)

      const startOfPeriod = new Date(startDate.setHours(0, 0, 0, 0))
      const endOfPeriod = new Date(endDate.setHours(23, 59, 59, 999))

      const counts = await getSessionCountsForPeriod(startOfPeriod, endOfPeriod)
      data.push({
        label: `Week ${4 - i}`,
        ...counts,
      })
    }
  } else {
    // Yearly - last 12 months
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)

      const counts = await getSessionCountsForPeriod(startOfMonth, endOfMonth)
      data.push({
        label: startOfMonth.toLocaleDateString('en-US', { month: 'short' }),
        ...counts,
      })
    }
  }

  return data
}

async function getSessionCountsForPeriod(
  startDate: Date,
  endDate: Date
): Promise<{ students: number; teachers: number; admins: number }> {
  const startISO = startDate.toISOString()
  const endISO = endDate.toISOString()

  // Get student sessions from training_sessions
  const { count: studentCount } = await supabaseAdmin
    .from('training_sessions')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startISO)
    .lte('created_at', endISO)

  // Get teacher/admin sessions from user_sessions with role info
  const { data: userSessions } = await supabaseAdmin
    .from('user_sessions')
    .select('session_id, created_at')
    .gte('created_at', startISO)
    .lte('created_at', endISO)

  // Count by role from user_profiles
  let teacherCount = 0
  let adminCount = 0

  if (userSessions && userSessions.length > 0) {
    // Get unique emails from the session context or related profiles
    const { data: profiles } = await supabaseAdmin
      .from('user_profiles')
      .select('email, role')
      .in('role', ['teacher', 'admin'])

    const roleMap = new Map<string, string>()
    profiles?.forEach((p) => roleMap.set(p.email, p.role))

    // For user_sessions, we need to check lti_context for email
    for (const session of userSessions) {
      // Count based on session type in the JWT or context
      // Since we don't have direct role info, estimate from profiles created in period
      teacherCount = 0
      adminCount = 0
    }

    // Alternative: count profiles created in the period
    const { count: teachersCreated } = await supabaseAdmin
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'teacher')
      .gte('created_at', startISO)
      .lte('created_at', endISO)

    const { count: adminsCreated } = await supabaseAdmin
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin')
      .gte('created_at', startISO)
      .lte('created_at', endISO)

    teacherCount = teachersCreated || 0
    adminCount = adminsCreated || 0
  }

  // Also count user_sessions by checking lti_context
  const { data: sessionsWithContext } = await supabaseAdmin
    .from('user_sessions')
    .select('lti_context')
    .gte('created_at', startISO)
    .lte('created_at', endISO)

  if (sessionsWithContext) {
    for (const session of sessionsWithContext) {
      if (session.lti_context) {
        const context = typeof session.lti_context === 'string'
          ? JSON.parse(session.lti_context)
          : session.lti_context

        if (context.role === 'teacher') teacherCount++
        else if (context.role === 'admin') adminCount++
      }
    }
  }

  return {
    students: studentCount || 0,
    teachers: teacherCount,
    admins: adminCount,
  }
}
