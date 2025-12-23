/**
 * Session Validation Endpoint
 *
 * Validates user sessions for both authentication methods:
 * - Students: JWT token from LTI launch (access_token cookie)
 * - Teachers/Admins: Supabase session (from direct login)
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/app/auth'
import { createServerSupabaseClient } from '@/app/lib/supabase/server'
import type { UserRole, LtiContext } from '@/app/types'

export async function GET(req: NextRequest) {
  // Get cookies
  const ltiToken = req.cookies.get('access_token')?.value
  const ltiRole = req.cookies.get('user_role')?.value as UserRole | undefined
  const ltiContextCookie = req.cookies.get('lti_context')?.value
  const ltiUserName = req.cookies.get('lti_user_name')?.value
  const ltiUserEmail = req.cookies.get('lti_user_email')?.value

  // Parse LTI context if available
  let ltiContext: LtiContext | undefined
  if (ltiContextCookie) {
    try {
      ltiContext = JSON.parse(ltiContextCookie)
    } catch {
      // Invalid JSON, ignore
    }
  }

  // ==========================================================================
  // Student Authentication (LTI JWT Token)
  // Students are auto-authenticated via LTI launch
  // ==========================================================================
  if (ltiToken && ltiRole === 'student') {
    const payload = verifyToken(ltiToken)
    if (payload) {
      return NextResponse.json({
        valid: true,
        payload: {
          sub: payload.sub,
          email: ltiUserEmail,
          fullName: ltiUserName,
          role: 'student' as UserRole,
          ltiContext,
        }
      })
    }
  }

  // ==========================================================================
  // Teacher/Admin Authentication (Supabase Session)
  // Teachers/Admins must authenticate via Supabase login
  // ==========================================================================
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // Get role from teacher_profiles table
      const { data: profile } = await supabase
        .from('teacher_profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .single()

      // Only allow teachers/admins via Supabase auth
      const role = profile?.role as UserRole
      if (role === 'teacher' || role === 'admin') {
        return NextResponse.json({
          valid: true,
          payload: {
            sub: user.id,
            email: user.email,
            fullName: profile?.full_name || user.user_metadata?.full_name,
            role: role,
          }
        })
      }

      // User exists but is not a teacher/admin
      return NextResponse.json({
        valid: false,
        error: 'Access denied. Teacher or admin account required.'
      }, { status: 403 })
    }
  } catch (error) {
    console.error('Supabase auth check failed:', error)
  }

  return NextResponse.json({ valid: false, error: 'No valid session' }, { status: 401 })
}
