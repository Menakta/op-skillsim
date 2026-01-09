/**
 * Admin Users API
 *
 * Endpoints for managing registered users (outsiders).
 * GET: Fetch all registered users from user_profiles
 * PATCH: Update user approval status
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

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  registration_type: 'lti' | 'outsider' | 'demo'
  approval_status: 'pending' | 'approved' | 'rejected'
  role: 'student' | 'teacher' | 'admin'
  institution: string | null
  created_at: string
  updated_at: string
}

interface UsersStats {
  total: number
  pending: number
  approved: number
  rejected: number
  outsiders: number
}

// =============================================================================
// Helper: Validate Session
// =============================================================================

async function validateSession(req: NextRequest): Promise<{ role: string; userId?: string } | null> {
  const token = req.cookies.get('session_token')?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      role: payload.role as string,
      userId: payload.userId as string | undefined,
    }
  } catch {
    return null
  }
}

// =============================================================================
// GET - Fetch all registered users
// =============================================================================

export async function GET(req: NextRequest) {
  try {
    // Verify admin/teacher session
    const session = await validateSession(req)
    if (!session || (session.role !== 'admin' && session.role !== 'teacher')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()

    // Fetch all user profiles
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      logger.error({ error }, 'Failed to fetch user profiles')
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    const userProfiles = (users || []) as UserProfile[]

    // Calculate stats
    const stats: UsersStats = {
      total: userProfiles.length,
      pending: userProfiles.filter(u => u.approval_status === 'pending').length,
      approved: userProfiles.filter(u => u.approval_status === 'approved').length,
      rejected: userProfiles.filter(u => u.approval_status === 'rejected').length,
      outsiders: userProfiles.filter(u => u.registration_type === 'outsider').length,
    }

    return NextResponse.json({
      success: true,
      users: userProfiles,
      stats,
    })
  } catch (error) {
    logger.error({ error }, 'Error in GET /api/admin/users')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// =============================================================================
// PATCH - Update user approval status
// =============================================================================

export async function PATCH(req: NextRequest) {
  try {
    // Verify admin session (only admins can approve/reject)
    const session = await validateSession(req)
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
    }

    const body = await req.json()
    const { userId, approval_status } = body

    if (!userId || !approval_status) {
      return NextResponse.json({ error: 'Missing userId or approval_status' }, { status: 400 })
    }

    if (!['pending', 'approved', 'rejected'].includes(approval_status)) {
      return NextResponse.json({ error: 'Invalid approval_status' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Update the user profile
    const { data: updatedUser, error } = await supabase
      .from('user_profiles')
      .update({
        approval_status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      logger.error({ error, userId }, 'Failed to update user approval status')
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }

    logger.info({ userId, approval_status, adminId: session.userId }, 'User approval status updated')

    return NextResponse.json({
      success: true,
      user: updatedUser,
    })
  } catch (error) {
    logger.error({ error }, 'Error in PATCH /api/admin/users')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
