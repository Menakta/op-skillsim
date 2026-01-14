/**
 * Training Analytics API
 *
 * Returns aggregated training session data for dashboard visualization:
 * - Session counts grouped by status (completed vs active)
 * - Active session counts grouped by current_training_phase
 */

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { supabaseAdmin } from '@/app/lib/supabase/admin'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-min-32-chars'
)

// =============================================================================
// Types
// =============================================================================

interface StatusCount {
  status: string
  count: number
}

interface PhaseCount {
  phase: string
  phaseName: string
  count: number
}

interface TrainingAnalyticsData {
  statusCounts: StatusCount[]
  phaseCounts: PhaseCount[]
  totals: {
    completed: number
    active: number
    total: number
  }
}

// Phase name mapping
const PHASE_NAMES: Record<string, string> = {
  A: 'X-Ray Assessment',
  B: 'Excavation',
  C: 'Measurement',
  D: 'Fitting Selection',
  E: 'Pipe Connection',
  F: 'Glue Application',
  G: 'Pressure Testing',
  H: 'Summary',
}

// =============================================================================
// API Handler
// =============================================================================

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

  try {
    const analyticsData = await getTrainingAnalytics()
    return NextResponse.json({ success: true, data: analyticsData })
  } catch (error) {
    console.error('Failed to fetch training analytics:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
}

// =============================================================================
// Data Fetching
// =============================================================================

async function getTrainingAnalytics(): Promise<TrainingAnalyticsData> {
  // Get counts grouped by status
  const { data: allSessions, error: sessionsError } = await supabaseAdmin
    .from('training_sessions')
    .select('status, current_training_phase')

  if (sessionsError) {
    throw new Error(`Failed to fetch sessions: ${sessionsError.message}`)
  }

  // Calculate status counts
  const statusMap = new Map<string, number>()
  const phaseMap = new Map<string, number>()

  for (const session of allSessions || []) {
    // Count by status
    const status = session.status || 'active'
    statusMap.set(status, (statusMap.get(status) || 0) + 1)

    // Count active sessions by phase
    if (status === 'active' && session.current_training_phase) {
      const phase = session.current_training_phase
      phaseMap.set(phase, (phaseMap.get(phase) || 0) + 1)
    }
  }

  // Format status counts
  const statusCounts: StatusCount[] = [
    { status: 'completed', count: statusMap.get('completed') || 0 },
    { status: 'active', count: statusMap.get('active') || 0 },
  ]

  // Format phase counts (only for active sessions)
  const phaseCounts: PhaseCount[] = Object.entries(PHASE_NAMES).map(([phase, phaseName]) => ({
    phase,
    phaseName,
    count: phaseMap.get(phase) || 0,
  }))

  // Calculate totals
  const completed = statusMap.get('completed') || 0
  const active = statusMap.get('active') || 0

  return {
    statusCounts,
    phaseCounts,
    totals: {
      completed,
      active,
      total: completed + active,
    },
  }
}
