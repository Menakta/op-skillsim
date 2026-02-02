/**
 * Training Walkthrough API Route
 *
 * GET /api/walkthrough/training - Get all training walkthrough steps
 */

import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/app/lib/supabase/admin'
import { logger } from '@/app/lib/logger'
import type { WalkthroughStep } from '@/app/types'

// =============================================================================
// GET - Fetch all training walkthrough steps ordered by sequence
// =============================================================================

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    // Fetch all training walkthrough steps ordered by sequence_order
    const { data: steps, error } = await supabase
      .from('training_walkthrough_steps')
      .select('*')
      .order('sequence_order', { ascending: true })

    if (error) {
      logger.error({ error: error.message }, 'Failed to fetch training walkthrough steps')
      return NextResponse.json(
        { success: false, error: 'Failed to fetch training walkthrough steps' },
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
    logger.error({ error }, 'Training walkthrough GET error')
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
