/**
 * Admin Notifications API
 *
 * GET: Fetch all notifications for admin users
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

async function validateAdminSession(req: NextRequest): Promise<{ userId: string; role: string } | null> {
  const token = req.cookies.get('session_token')?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const role = payload.role as string

    // Admins and teachers can access notifications
    if (role !== 'admin' && role !== 'teacher') {
      return null
    }

    return {
      userId: payload.userId as string || '',
      role,
    }
  } catch {
    return null
  }
}

// =============================================================================
// GET - Fetch all notifications
// =============================================================================

export async function GET(req: NextRequest) {
  try {
    const session = await validateAdminSession(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()

    // Fetch notifications ordered by most recent first
    const { data: notifications, error } = await supabase
      .from('admin_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50) // Limit to last 50 notifications

    if (error) {
      logger.error({ error }, 'Failed to fetch admin notifications')
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      notifications: notifications || [],
    })
  } catch (error) {
    logger.error({ error }, 'Error in GET /api/admin/notifications')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
