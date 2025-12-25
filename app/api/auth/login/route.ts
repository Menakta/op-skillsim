/**
 * Teacher/Admin Login Endpoint
 *
 * Authenticates via Supabase and creates a session token for RBAC.
 * Session expires after 24 hours.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/app/lib/logger'
import { sessionManager } from '@/app/lib/sessions'
import type { UserRole } from '@/app/types'

let _supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
    )
  }
  return _supabase
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    logger.info({ email }, 'Login attempt')

    // Authenticate with Supabase
    const supabase = getSupabase()
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !authData.user) {
      logger.warn({ email, error: authError?.message }, 'Login failed')
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Get teacher/admin profile
    const { data: profile, error: profileError } = await supabase
      .from('teacher_profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !profile) {
      logger.warn({ email }, 'Not a teacher/admin')
      return NextResponse.json(
        { error: 'Access denied. Teacher or admin account required.' },
        { status: 403 }
      )
    }

    const role = profile.role as UserRole
    const requestInfo = await sessionManager.getRequestInfo()

    // Create session based on role
    let sessionResult: { sessionId: string; token: string }

    if (role === 'admin') {
      sessionResult = await sessionManager.createAdminSession(
        authData.user.id,
        authData.user.email!,
        profile.full_name,
        undefined,
        requestInfo
      )
    } else {
      sessionResult = await sessionManager.createTeacherSession(
        authData.user.id,
        authData.user.email!,
        profile.full_name,
        undefined,
        requestInfo
      )
    }

    logger.info({
      userId: authData.user.id,
      role,
      sessionId: sessionResult.sessionId
    }, 'Login successful - session created')

    // Create response with session token cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name: profile.full_name,
        role: role,
      },
    })

    // Set session token cookie (24 hours, matches SessionManager)
    response.cookies.set('session_token', sessionResult.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    })

    return response
  } catch (error) {
    logger.error({ error }, 'Login error')
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}
