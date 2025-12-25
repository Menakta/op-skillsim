/**
 * Fitting Options API Route
 *
 * GET /api/admin/fittings - Get all fitting options (view only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getSupabaseAdmin } from '@/app/lib/supabase/admin'
import { logger } from '@/app/lib/logger'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-min-32-chars'
)

// =============================================================================
// Helper: Verify admin/teacher access
// =============================================================================

async function verifyStaffAccess(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get('session_token')?.value

  if (!token) {
    return false
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const role = payload.role as string
    return role === 'admin' || role === 'teacher'
  } catch {
    return false
  }
}

// =============================================================================
// GET - Get all fitting options
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    // Verify staff access
    const hasAccess = await verifyStaffAccess(request)

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

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
