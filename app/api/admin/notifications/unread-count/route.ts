/**
 * Admin Notifications Unread Count API
 *
 * GET: Fetch count of unread notifications
 */

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getSupabaseAdmin } from '@/app/lib/supabase/admin'
import { logger } from '@/app/lib/logger'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-min-32-chars'
)

// =============================================================================
// Helper: Validate Admin Session
// =============================================================================

async function validateAdminSession(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get('session_token')?.value
  if (!token) return false

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload.role === 'admin' || payload.role === 'teacher'
  } catch {
    return false
  }
}

// =============================================================================
// GET - Fetch unread count
// =============================================================================

export async function GET(req: NextRequest) {
  try {
    const isAdmin = await validateAdminSession(req)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()

    // Count unread notifications
    const { count, error } = await supabase
      .from('admin_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)

    if (error) {
      logger.error({ error }, 'Failed to fetch unread notification count')
      return NextResponse.json({ error: 'Failed to fetch count' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      count: count || 0,
    })
  } catch (error) {
    logger.error({ error }, 'Error in GET /api/admin/notifications/unread-count')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
