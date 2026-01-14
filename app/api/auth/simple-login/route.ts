/**
 * Simple Login Endpoint (Non-LTI / Outsider + Demo Mode)
 *
 * Authentication flow:
 * 1. First checks user_profiles table for registered outsiders (Supabase auth)
 * 2. Falls back to demo users JSON for testing purposes
 *
 * Outsider registration flow:
 * - Outsiders must be approved in user_profiles before they can log in
 * - Pending/rejected outsiders get 403 with appropriate message
 *
 * Creates a session with isLti=false flag.
 */

import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/app/lib/logger'
import { randomUUID } from 'crypto'
import type { UserRole } from '@/app/types'
import demoUsers from '@/app/data/demo-users.json'

// =============================================================================
// Configuration
// =============================================================================

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-min-32-chars'
)

// =============================================================================
// Supabase Client
// =============================================================================

let _supabase: ReturnType<typeof createClient> | null = null

function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
    )
  }
  return _supabase
}

let _supabaseAdmin: ReturnType<typeof createClient> | null = null

function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  }
  return _supabaseAdmin
}

// =============================================================================
// Types
// =============================================================================

interface DemoUser {
  id: string
  email: string
  password: string
  role: UserRole
  full_name: string
  institution: string
}

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  registration_type: 'lti' | 'outsider' | 'demo'
  approval_status: 'pending' | 'approved' | 'rejected'
  role: UserRole
}

// =============================================================================
// POST - Login (Outsider Registration + Demo Mode)
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    logger.info({ email }, 'Login attempt')

    // =========================================================================
    // Step 1: Try Supabase authentication for registered outsiders
    // =========================================================================
    const supabase = getSupabase()
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authData?.user) {
      // User authenticated via Supabase - check their profile
      const supabaseAdmin = getSupabaseAdmin()
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('id, email, full_name, registration_type, approval_status, role')
        .eq('id', authData.user.id)
        .single<UserProfile>()

      if (profileError || !profile) {
        logger.warn({ email, userId: authData.user.id }, 'Supabase user has no profile')
        return NextResponse.json(
          { success: false, error: 'Account not found. Please register first.' },
          { status: 403 }
        )
      }

      // Check approval status for outsiders
      if (profile.registration_type === 'outsider') {
        if (profile.approval_status === 'pending') {
          logger.info({ email, userId: profile.id }, 'Outsider login blocked - pending approval')
          return NextResponse.json(
            { success: false, error: 'Your account is pending admin approval. Please wait for approval before signing in.' },
            { status: 403 }
          )
        }

        if (profile.approval_status === 'rejected') {
          logger.info({ email, userId: profile.id }, 'Outsider login blocked - rejected')
          return NextResponse.json(
            { success: false, error: 'Your registration request has been rejected. Please contact an administrator if you believe this is an error.' },
            { status: 403 }
          )
        }
      }

      // Approved outsider or other registration type - create session
      const sessionId = randomUUID()
      const now = new Date()
      const expiresAt = new Date(now.getTime() + 60 * 60 * 1000) // 1 hour

      const token = await new SignJWT({
        sessionId,
        userId: profile.id,
        email: profile.email,
        role: profile.role,
        sessionType: profile.role === 'student' ? 'lti' : profile.role,
        isLti: false,
        iat: Math.floor(now.getTime() / 1000),
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime(expiresAt)
        .sign(JWT_SECRET)

      logger.info({
        userId: profile.id,
        email: profile.email,
        role: profile.role,
        registrationType: profile.registration_type,
        isLti: false,
        sessionId,
      }, 'Outsider login successful')

      const response = NextResponse.json({
        success: true,
        user: {
          id: profile.id,
          email: profile.email,
          name: profile.full_name || email.split('@')[0],
          role: profile.role,
          isLti: false,
        },
      })

      response.cookies.set('session_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24, // 24 hours
      })

      return response
    }

    // =========================================================================
    // Step 2: Fall back to demo users for testing
    // =========================================================================
    const demoUser = (demoUsers.users as DemoUser[]).find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    )

    if (!demoUser) {
      // Log the appropriate error based on what happened
      if (authError) {
        logger.warn({ email, error: authError.message }, 'Login failed - invalid credentials')
      } else {
        logger.warn({ email }, 'Login failed - user not found')
      }
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Demo user found - create session
    const sessionId = randomUUID()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000) // 1 hour

    const token = await new SignJWT({
      sessionId,
      userId: demoUser.id,
      email: demoUser.email,
      role: demoUser.role,
      sessionType: demoUser.role === 'student' ? 'lti' : demoUser.role,
      isLti: false,
      iat: Math.floor(now.getTime() / 1000),
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(expiresAt)
      .sign(JWT_SECRET)

    logger.info({
      userId: demoUser.id,
      email: demoUser.email,
      role: demoUser.role,
      isLti: false,
      sessionId,
    }, 'Demo login successful')

    const response = NextResponse.json({
      success: true,
      user: {
        id: demoUser.id,
        email: demoUser.email,
        name: demoUser.full_name,
        role: demoUser.role,
        isLti: false,
      },
    })

    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 2, // 2 hours
    })

    return response

  } catch (error) {
    logger.error({ error }, 'Login error')
    return NextResponse.json(
      { success: false, error: 'Login failed. Please try again.' },
      { status: 500 }
    )
  }
}
