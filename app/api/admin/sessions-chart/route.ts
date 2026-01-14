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

  // Fetch all sessions from user_sessions table with role column
  const { data: sessions, error } = await supabaseAdmin
    .from('user_sessions')
    .select('role')
    .gte('created_at', startISO)
    .lte('created_at', endISO)

  if (error) {
    console.error('Failed to fetch user sessions:', error)
    return { students: 0, teachers: 0, admins: 0 }
  }

  // Count by role
  let studentCount = 0
  let teacherCount = 0
  let adminCount = 0

  for (const session of sessions || []) {
    switch (session.role) {
      case 'student':
        studentCount++
        break
      case 'teacher':
        teacherCount++
        break
      case 'admin':
        adminCount++
        break
    }
  }

  return {
    students: studentCount,
    teachers: teacherCount,
    admins: adminCount,
  }
}
