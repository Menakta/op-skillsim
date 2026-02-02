/**
 * Walkthrough API Route
 *
 * GET /api/walkthrough - Get all walkthrough steps for cinematic mode
 * POST /api/walkthrough - Mark a step as completed (for future use)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/app/lib/supabase/admin'
import { logger } from '@/app/lib/logger'
import type { WalkthroughStep } from '@/app/types'

// =============================================================================
// GET - Fetch all walkthrough steps ordered by sequence
// =============================================================================

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    // Fetch all walkthrough steps ordered by sequence_order
    const { data: steps, error } = await supabase
      .from('walkthrough_steps')
      .select('*')
      .order('sequence_order', { ascending: true })

    if (error) {
      logger.error({ error: error.message }, 'Failed to fetch walkthrough steps')
      return NextResponse.json(
        { success: false, error: 'Failed to fetch walkthrough steps' },
        { status: 500 }
      )
    }

    // Parse metadata JSON for each step
    const parsedSteps: WalkthroughStep[] = (steps || []).map(step => ({
      ...step,
      metadata: typeof step.metadata === 'string'
        ? JSON.parse(step.metadata)
        : step.metadata
    }))

    return NextResponse.json({
      success: true,
      steps: parsedSteps,
    })

  } catch (error) {
    logger.error({ error }, 'Walkthrough GET error')
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =============================================================================
// POST - Mark a walkthrough step as completed (for future user progress tracking)
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { stepId, userId } = body

    if (!stepId) {
      return NextResponse.json(
        { success: false, error: 'Missing stepId' },
        { status: 400 }
      )
    }

    // For now, just return success
    // In future, this will save to user_walkthrough_progress table
    // when we integrate with auth.users

    logger.info({ stepId, userId }, 'Walkthrough step completed')

    return NextResponse.json({
      success: true,
      message: 'Step marked as completed',
    })

  } catch (error) {
    logger.error({ error }, 'Walkthrough POST error')
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
