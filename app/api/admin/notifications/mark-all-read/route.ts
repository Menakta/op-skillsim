/**
 * Mark All Notifications as Read API
 *
 * PATCH: Mark all notifications as read
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
// PATCH - Mark all notifications as read
// =============================================================================

export async function PATCH(req: NextRequest) {
  try {
    const isAdmin = await validateAdminSession(req)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()

    const { error } = await supabase
      .from('admin_notifications')
      .update({ is_read: true })
      .eq('is_read', false)

    if (error) {
      logger.error({ error }, 'Failed to mark all notifications as read')
      return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error({ error }, 'Error in PATCH /api/admin/notifications/mark-all-read')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
