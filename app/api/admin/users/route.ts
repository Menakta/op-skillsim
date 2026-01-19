/**
 * Admin Users API
 *
 * Endpoints for managing registered users (outsiders).
 * GET: Fetch all registered users from user_profiles
 * PATCH: Update user approval status (sends email notification)
 */

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getSupabaseAdmin } from '@/app/lib/supabase/admin'
import { logger } from '@/app/lib/logger'
import { sendApprovalEmail, sendRejectionEmail } from '@/app/lib/email'

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
  is_confirmed: boolean
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

interface SessionInfo {
  role: string
  isLti: boolean
  userId: string
  email: string
}

async function validateSession(req: NextRequest): Promise<SessionInfo | null> {
  const token = req.cookies.get('session_token')?.value
  if (!token) return null

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
// Helper: Check if user is LTI Admin (only LTI admins can delete)
// =============================================================================

function isLtiAdmin(session: SessionInfo | null): boolean {
  return session !== null && session.role === 'admin' && session.isLti === true
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
// PATCH - Update user approval status and/or role
// =============================================================================

export async function PATCH(req: NextRequest) {
  try {
    // Verify admin session (only admins can approve/reject/change roles)
    const session = await validateSession(req)
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
    }

    const body = await req.json()
    const { userId, approval_status, role } = body

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    // Validate at least one field to update
    if (!approval_status && !role) {
      return NextResponse.json({ error: 'Missing approval_status or role to update' }, { status: 400 })
    }

    // Validate approval_status if provided
    if (approval_status && !['pending', 'approved', 'rejected'].includes(approval_status)) {
      return NextResponse.json({ error: 'Invalid approval_status' }, { status: 400 })
    }

    // Validate role if provided
    if (role && !['student', 'teacher', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // First, get the current user to check if status is actually changing
    const { data: currentUser, error: fetchError } = await supabase
      .from('user_profiles')
      .select('email, full_name, approval_status, role')
      .eq('id', userId)
      .single<{ email: string; full_name: string | null; approval_status: string; role: string }>()

    if (fetchError || !currentUser) {
      logger.error({ error: fetchError, userId }, 'Failed to fetch user for update')
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const previousStatus = currentUser.approval_status
    const previousRole = currentUser.role

    // Build update object
    const updateData: Record<string, string> = {
      updated_at: new Date().toISOString(),
    }

    if (approval_status) {
      updateData.approval_status = approval_status
    }

    if (role) {
      updateData.role = role
    }

    // Update the user profile
    const { data: updatedUser, error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      logger.error({ error, userId }, 'Failed to update user')
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }

    logger.info({
      userId,
      approval_status: approval_status || previousStatus,
      previousStatus,
      role: role || previousRole,
      previousRole,
      adminId: session.userId
    }, 'User updated')

    // Send email notification if approval status changed to approved or rejected
    let emailSent = false
    let emailError: string | undefined

    if (approval_status && previousStatus !== approval_status) {
      const userInfo = {
        email: currentUser.email,
        fullName: currentUser.full_name,
      }

      if (approval_status === 'approved') {
        const result = await sendApprovalEmail(userInfo)
        emailSent = result.success
        emailError = result.error
        if (result.success) {
          logger.info({ userId, email: currentUser.email }, 'Approval email sent to user')
        }
      } else if (approval_status === 'rejected') {
        const result = await sendRejectionEmail(userInfo)
        emailSent = result.success
        emailError = result.error
        if (result.success) {
          logger.info({ userId, email: currentUser.email }, 'Rejection email sent to user')
        }
      }
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
      emailSent,
      emailError,
    })
  } catch (error) {
    logger.error({ error }, 'Error in PATCH /api/admin/users')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// =============================================================================
// DELETE - Delete users (single or bulk) - LTI Admin only
// =============================================================================

export async function DELETE(req: NextRequest) {
  try {
    const session = await validateSession(req)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only LTI admins can delete
    if (!isLtiAdmin(session)) {
      return NextResponse.json(
        { success: false, error: 'Access denied. Only LTI administrators can delete users.' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { ids } = body as { ids: string[] }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No user IDs provided' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()
    const deletedIds: string[] = []
    const errors: string[] = []

    for (const id of ids) {
      try {
        // Get user profile first to check if it's safe to delete
        const { data: userProfile, error: fetchError } = await supabase
          .from('user_profiles')
          .select('email, registration_type')
          .eq('id', id)
          .single()

        if (fetchError || !userProfile) {
          errors.push(`User ${id} not found`)
          continue
        }

        // Delete user_sessions for this user (by email)
        await supabase
          .from('user_sessions')
          .delete()
          .eq('email', userProfile.email)

        // Delete the user from auth.users using admin API with hard delete
        // This triggers the cleanup function to delete auth.identities and auth.sessions
        // Then cascades to user_profiles via ON DELETE CASCADE
        // Omitting second parameter defaults to hard delete (shouldSoftDelete = false)
        const { error: deleteError } = await supabase.auth.admin.deleteUser(id)

        if (deleteError) {
          errors.push(`Failed to delete user ${id}: ${deleteError.message}`)
        } else {
          deletedIds.push(id)
        }
      } catch (err) {
        errors.push(`Error deleting user ${id}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    logger.info({
      deletedCount: deletedIds.length,
      adminEmail: session.email,
      deletedIds,
    }, 'Users deleted by LTI admin')

    return NextResponse.json({
      success: true,
      deletedCount: deletedIds.length,
      deletedIds,
      errors: errors.length > 0 ? errors : undefined,
    })

  } catch (error) {
    logger.error({ error }, 'Error in DELETE /api/admin/users')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
