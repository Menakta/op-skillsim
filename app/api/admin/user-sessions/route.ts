/**
 * User Sessions API Route
 *
 * GET /api/admin/user-sessions?email=xxx - Get login sessions for a specific user by email
 * Returns previous login sessions for LTI/outsider admin/teacher users
 */

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getSupabaseAdmin } from '@/app/lib/supabase/admin'
import { logger } from '@/app/lib/logger'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-min-32-chars'
)

// =============================================================================
// Types
// =============================================================================

interface SessionInfo {
  role: string
  isLti: boolean
  userId: string
  email: string
}

export interface UserLoginSession {
  id: string
  sessionId: string
  sessionType: 'lti' | 'teacher'
  role: string
  status: string
  createdAt: string
  lastActivity: string
  expiresAt: string
  ipAddress: string | null
  userAgent: string | null
  loginCount: number
}

// =============================================================================
// Helper: Get session from token
// =============================================================================

async function getSessionFromRequest(request: NextRequest): Promise<SessionInfo | null> {
  const token = request.cookies.get('session_token')?.value

  if (!token) {
    return null
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      role: payload.role as string,
      isLti: payload.isLti as boolean || false,
      userId: payload.userId as string || '',
      email: payload.email as string || '',
    }
  } catch {
    return null
  }
}

// =============================================================================
// GET - Get user login sessions by email
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only teachers and admins can access this
    if (session.role !== 'teacher' && session.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get email from query params
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email parameter required' },
        { status: 400 }
      )
    }

    // Users can only view their own sessions
    if (session.email !== email) {
      return NextResponse.json(
        { success: false, error: 'Access denied. You can only view your own sessions.' },
        { status: 403 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Get user sessions for this email (admin/teacher only)
    const { data: userSessions, error: userSessionsError } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('email', email)
      .in('role', ['teacher', 'admin'])
      .order('created_at', { ascending: false })

    if (userSessionsError) {
      logger.error({ error: userSessionsError.message }, 'Failed to fetch user sessions')
      return NextResponse.json(
        { success: false, error: 'Failed to fetch user sessions' },
        { status: 500 }
      )
    }

    // Map to response format
    const sessions: UserLoginSession[] = (userSessions || []).map(s => ({
      id: s.id,
      sessionId: s.session_id,
      sessionType: s.session_type,
      role: s.role,
      status: s.status,
      createdAt: s.created_at,
      lastActivity: s.last_activity,
      expiresAt: s.expires_at,
      ipAddress: s.ip_address,
      userAgent: s.user_agent,
      loginCount: s.login_count,
    }))

    return NextResponse.json({
      success: true,
      sessions,
    })

  } catch (error) {
    logger.error({ error }, 'User sessions GET error')
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
