/**
 * Training Analytics API
 *
 * Returns aggregated training session data for dashboard visualization:
 * - Session counts grouped by status (completed vs active)
 * - Active session counts grouped by current_training_phase (index)
 * - Phase names fetched from training_phases table
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
  phaseKey: string    // Index as string ("0", "1", "2"...)
  phaseName: string   // Human-readable name from training_phases table
  phaseOrder: number  // Display order
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
  // Fetch training phases from database (phase_key = index, phase_name = display name)
  const { data: trainingPhases, error: phasesError } = await supabaseAdmin
    .from('training_phases')
    .select('phase_key, phase_name, phase_order')
    .order('phase_order', { ascending: true })

  if (phasesError) {
    console.error('Failed to fetch training phases:', phasesError)
    // Continue with empty phases - don't fail the whole request
  }

  // Build phase name lookup map (phase_key -> phase_name)
  const phaseNameMap = new Map<string, { name: string; order: number }>()
  for (const phase of trainingPhases || []) {
    phaseNameMap.set(phase.phase_key, {
      name: phase.phase_name,
      order: phase.phase_order,
    })
  }

  // Get all training sessions
  const { data: allSessions, error: sessionsError } = await supabaseAdmin
    .from('training_sessions')
    .select('status, current_training_phase')

  if (sessionsError) {
    throw new Error(`Failed to fetch sessions: ${sessionsError.message}`)
  }

  // Calculate status counts and phase counts
  const statusMap = new Map<string, number>()
  const phaseCountMap = new Map<string, number>()

  for (const session of allSessions || []) {
    // Count by status
    const status = session.status || 'active'
    statusMap.set(status, (statusMap.get(status) || 0) + 1)

    // Count active sessions by phase index
    if (status === 'active' && session.current_training_phase) {
      const phaseKey = session.current_training_phase
      phaseCountMap.set(phaseKey, (phaseCountMap.get(phaseKey) || 0) + 1)
    }
  }

  // Format status counts
  const statusCounts: StatusCount[] = [
    { status: 'completed', count: statusMap.get('completed') || 0 },
    { status: 'active', count: statusMap.get('active') || 0 },
  ]

  // Format phase counts with names from training_phases table
  // Include all phases from the table, sorted by phase_order
  const phaseCounts: PhaseCount[] = (trainingPhases || []).map((phase) => ({
    phaseKey: phase.phase_key,
    phaseName: phase.phase_name,
    phaseOrder: phase.phase_order,
    count: phaseCountMap.get(phase.phase_key) || 0,
  }))

  // Also include any phases from sessions that aren't in the training_phases table
  // (fallback for data integrity)
  for (const [phaseKey, count] of phaseCountMap) {
    if (!phaseNameMap.has(phaseKey)) {
      phaseCounts.push({
        phaseKey,
        phaseName: `Phase ${phaseKey}`, // Fallback name
        phaseOrder: parseInt(phaseKey) || 999,
        count,
      })
    }
  }

  // Sort by phase order
  phaseCounts.sort((a, b) => a.phaseOrder - b.phaseOrder)

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
