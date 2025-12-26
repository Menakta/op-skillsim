/**
 * User Management API Route
 *
 * GET /api/admin/users - Get all users from teacher_profiles
 * POST /api/admin/users - Create a new user (admin only)
 * PATCH /api/admin/users - Update a user (admin only)
 * DELETE /api/admin/users - Delete a user (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getSupabaseAdmin } from '@/app/lib/supabase/admin'
import { logger } from '@/app/lib/logger'
import type { AdminPermissions, TeacherPermissions } from '@/app/types'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-min-32-chars'
)

// =============================================================================
// Helper: Get session from token
// =============================================================================

interface SessionPayload {
  sessionId: string
  userId: string
  email: string
  role: string
  permissions?: AdminPermissions | TeacherPermissions
  isLti?: boolean // true = LTI session (full access), false = demo (read-only)
}

async function getSessionFromRequest(request: NextRequest): Promise<SessionPayload | null> {
  const token = request.cookies.get('session_token')?.value

  if (!token) {
    return null
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      sessionId: payload.sessionId as string,
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as string,
      permissions: payload.permissions as AdminPermissions | TeacherPermissions | undefined,
      isLti: (payload.isLti as boolean) ?? true, // Default to true for backward compatibility
    }
  } catch {
    return null
  }
}

// =============================================================================
// Helper: Check if user is admin
// =============================================================================

function isAdmin(session: SessionPayload): boolean {
  return session.role === 'admin'
}

// =============================================================================
// Helper: Check if user can edit (must be admin AND LTI session)
// =============================================================================

function canEdit(session: SessionPayload): boolean {
  return isAdmin(session) && session.isLti === true
}

// =============================================================================
// GET - Get all users from teacher_profiles
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

    // Both teachers and admins can view users
    if (session.role !== 'teacher' && session.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { data: users, error } = await supabase
      .from('teacher_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      logger.error({ error: error.message }, 'Failed to fetch users')
      return NextResponse.json(
        { success: false, error: 'Failed to fetch users' },
        { status: 500 }
      )
    }

    // Parse permissions JSON string for each user
    const parsedUsers = users?.map(user => ({
      ...user,
      permissions: typeof user.permissions === 'string'
        ? JSON.parse(user.permissions)
        : user.permissions,
    }))

    return NextResponse.json({
      success: true,
      users: parsedUsers || [],
      canEdit: canEdit(session), // Must be admin AND LTI session to edit
      isLti: session.isLti ?? true,
    })

  } catch (error) {
    logger.error({ error }, 'Users GET error')
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =============================================================================
// POST - Create a new user (admin only)
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (!canEdit(session)) {
      return NextResponse.json(
        { success: false, error: session.isLti ? 'Admin access required' : 'Read-only mode: Changes not allowed in demo session' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { email, full_name, institution, role } = body

    if (!email || !full_name || !role) {
      return NextResponse.json(
        { success: false, error: 'Email, full name, and role are required' },
        { status: 400 }
      )
    }

    if (role !== 'teacher' && role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Invalid role. Must be teacher or admin' },
        { status: 400 }
      )
    }

    // Define permissions based on role
    const permissions = role === 'admin'
      ? {
          editQuestionnaires: true,
          viewResults: true,
          manageUsers: true,
          viewAnalytics: true,
        }
      : {
          editQuestionnaires: true,
          viewResults: true,
        }

    const supabase = getSupabaseAdmin()

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('teacher_profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'A user with this email already exists' },
        { status: 409 }
      )
    }

    // Generate a unique ID for the new user
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    const { data: newUser, error: createError } = await supabase
      .from('teacher_profiles')
      .insert({
        id: userId,
        email,
        full_name,
        institution: institution || 'Unknown Institution',
        role,
        permissions: JSON.stringify(permissions),
      })
      .select()
      .single()

    if (createError) {
      logger.error({ error: createError.message }, 'Failed to create user')
      return NextResponse.json(
        { success: false, error: 'Failed to create user' },
        { status: 500 }
      )
    }

    logger.info({ userId: newUser.id, email, role }, 'User created by admin')

    return NextResponse.json({
      success: true,
      user: {
        ...newUser,
        permissions: typeof newUser.permissions === 'string'
          ? JSON.parse(newUser.permissions)
          : newUser.permissions,
      },
    })

  } catch (error) {
    logger.error({ error }, 'Users POST error')
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =============================================================================
// PATCH - Update a user (admin only)
// =============================================================================

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (!canEdit(session)) {
      return NextResponse.json(
        { success: false, error: session.isLti ? 'Admin access required' : 'Read-only mode: Changes not allowed in demo session' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { id, email, full_name, institution, role } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Build update object
    const updateData: Record<string, unknown> = {}

    if (email !== undefined) updateData.email = email
    if (full_name !== undefined) updateData.full_name = full_name
    if (institution !== undefined) updateData.institution = institution

    if (role !== undefined) {
      if (role !== 'teacher' && role !== 'admin') {
        return NextResponse.json(
          { success: false, error: 'Invalid role. Must be teacher or admin' },
          { status: 400 }
        )
      }
      updateData.role = role

      // Update permissions based on new role
      const permissions = role === 'admin'
        ? {
            editQuestionnaires: true,
            viewResults: true,
            manageUsers: true,
            viewAnalytics: true,
          }
        : {
            editQuestionnaires: true,
            viewResults: true,
          }
      updateData.permissions = JSON.stringify(permissions)
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { data: updatedUser, error: updateError } = await supabase
      .from('teacher_profiles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      logger.error({ error: updateError.message }, 'Failed to update user')
      return NextResponse.json(
        { success: false, error: 'Failed to update user' },
        { status: 500 }
      )
    }

    logger.info({ userId: id }, 'User updated by admin')

    return NextResponse.json({
      success: true,
      user: {
        ...updatedUser,
        permissions: typeof updatedUser.permissions === 'string'
          ? JSON.parse(updatedUser.permissions)
          : updatedUser.permissions,
      },
    })

  } catch (error) {
    logger.error({ error }, 'Users PATCH error')
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =============================================================================
// DELETE - Delete a user (admin only)
// =============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (!canEdit(session)) {
      return NextResponse.json(
        { success: false, error: session.isLti ? 'Admin access required' : 'Read-only mode: Changes not allowed in demo session' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Prevent admin from deleting themselves
    if (id === session.userId) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { error: deleteError } = await supabase
      .from('teacher_profiles')
      .delete()
      .eq('id', id)

    if (deleteError) {
      logger.error({ error: deleteError.message }, 'Failed to delete user')
      return NextResponse.json(
        { success: false, error: 'Failed to delete user' },
        { status: 500 }
      )
    }

    logger.info({ userId: id }, 'User deleted by admin')

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    })

  } catch (error) {
    logger.error({ error }, 'Users DELETE error')
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
