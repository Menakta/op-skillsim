/**
 * Fitting Options Public API Route
 *
 * GET /api/fittings - Get all fitting options for training
 *
 * This is a public endpoint used by the training components.
 * No authentication required as fittings are non-sensitive training data.
 */

import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/app/lib/supabase/admin'
import { logger } from '@/app/lib/logger'

// =============================================================================
// GET - Get all fitting options
// =============================================================================

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    const { data: fittings, error } = await supabase
      .from('fitting_options')
      .select('*')
      .order('id', { ascending: true })

    if (error) {
      logger.error({ error: error.message }, 'Failed to fetch fitting options')
      return NextResponse.json(
        { success: false, error: 'Failed to fetch fitting options' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      fittings: fittings || [],
    })
  } catch (error) {
    logger.error({ error }, 'Fitting options GET error')
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
