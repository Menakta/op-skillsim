/**
 * OTP Verification Endpoint
 *
 * Verifies the email OTP sent to outsider users during login.
 * On success, creates a session and returns the user data.
 */

import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/app/lib/logger'
import { randomUUID } from 'crypto'
import type { UserRole } from '@/app/types'

// =============================================================================
// Configuration
// =============================================================================

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-min-32-chars'
)

// OTP expiry time in milliseconds (10 minutes)
const OTP_EXPIRY_MS = 10 * 60 * 1000

// =============================================================================
// Supabase Client
// =============================================================================

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

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  registration_type: 'lti' | 'outsider' | 'demo'
  approval_status: 'pending' | 'approved' | 'rejected'
  role: UserRole
  otp_code: string | null
  otp_expires_at: string | null
}

// =============================================================================
// POST - Verify OTP
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const { email, otp } = await request.json()

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, error: 'Email and OTP are required' },
        { status: 400 }
      )
    }

    logger.info({ email }, 'Email OTP verification attempt')

    const supabaseAdmin = getSupabaseAdmin()

    // Get user profile with OTP data
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, full_name, phone, registration_type, approval_status, role, otp_code, otp_expires_at')
      .eq('email', email)
      .single<UserProfile>()

    if (profileError || !profile) {
      logger.warn({ email }, 'OTP verification failed - no profile found')
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      )
    }

    // Check if OTP exists
    if (!profile.otp_code || !profile.otp_expires_at) {
      logger.warn({ email }, 'OTP verification failed - no OTP set')
      return NextResponse.json(
        { success: false, error: 'No verification code found. Please request a new code.' },
        { status: 400 }
      )
    }

    // Check if OTP has expired
    const otpExpiresAt = new Date(profile.otp_expires_at)
    if (new Date() > otpExpiresAt) {
      logger.warn({ email }, 'OTP verification failed - OTP expired')
      // Clear expired OTP
      // Using type assertion to bypass strict Supabase types until schema is regenerated
      await (supabaseAdmin as unknown as {
        from: (table: string) => {
          update: (data: Record<string, unknown>) => {
            eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>
          }
        }
      }).from('user_profiles').update({
        otp_code: null,
        otp_expires_at: null,
      }).eq('id', profile.id)
      return NextResponse.json(
        { success: false, error: 'Verification code has expired. Please request a new code.' },
        { status: 401 }
      )
    }

    // Verify OTP matches
    if (profile.otp_code !== otp) {
      logger.warn({ email }, 'OTP verification failed - invalid code')
      return NextResponse.json(
        { success: false, error: 'Invalid verification code' },
        { status: 401 }
      )
    }

    // OTP is valid - clear it from the database
    // Using type assertion to bypass strict Supabase types until schema is regenerated
    await (supabaseAdmin as unknown as {
      from: (table: string) => {
        update: (data: Record<string, unknown>) => {
          eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>
        }
      }
    }).from('user_profiles').update({
      otp_code: null,
      otp_expires_at: null,
    }).eq('id', profile.id)

    // Double-check approval status
    if (profile.approval_status !== 'approved') {
      logger.warn({ email, status: profile.approval_status }, 'OTP verified but user not approved')
      return NextResponse.json(
        { success: false, error: 'Your account is not approved' },
        { status: 403 }
      )
    }

    // Create session
    const sessionId = randomUUID()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours for outsiders

    // Determine session type based on role
    // Students use 'lti' session type for training API compatibility
    // Teachers/admins use 'teacher' session type for admin dashboard
    const isStudent = profile.role === 'student'
    const sessionType = isStudent ? 'lti' : 'teacher'

    // ==========================================================================
    // CRITICAL: Create user_sessions record for ALL roles
    // Students need it for training APIs, teachers/admins need it for dashboard
    // ==========================================================================
    const ltiContext = {
      courseId: 'outsider',
      courseName: 'OP-Skillsim Plumbing Training',
      resourceId: 'outsider-login',
      institution: 'External User',
      full_name: profile.full_name || profile.email.split('@')[0],
    }

    // Check if a session already exists for this user
    const { data: existingSession } = await supabaseAdmin
      .from('user_sessions')
      .select('id, login_count')
      .eq('email', profile.email)
      .eq('status', 'active')
      .single<{ id: string; login_count: number | null }>()

    if (existingSession) {
      // Update existing session
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabaseAdmin as any)
        .from('user_sessions')
        .update({
          session_id: sessionId,
          expires_at: expiresAt.toISOString(),
          login_count: (existingSession.login_count || 0) + 1,
          last_login_at: now.toISOString(),
        })
        .eq('id', existingSession.id)

      logger.info({ sessionId, email: profile.email, role: profile.role }, 'Updated existing user_session record')
    } else {
      // Create new session
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: sessionError } = await supabaseAdmin
        .from('user_sessions')
        .insert({
          session_id: sessionId,
          user_id: profile.id,
          session_type: sessionType,
          email: profile.email,
          role: profile.role, // Use actual role from profile
          lti_context: ltiContext,
          expires_at: expiresAt.toISOString(),
          status: 'active',
          login_count: 1,
          last_login_at: now.toISOString(),
        } as any)

      if (sessionError) {
        logger.warn({ error: sessionError.message, sessionId }, 'Failed to create user_session record')
      } else {
        logger.info({ sessionId, email: profile.email, role: profile.role }, 'Created user_session record')
      }
    }

    const token = await new SignJWT({
      sessionId,
      userId: profile.id,
      email: profile.email,
      role: profile.role,
      sessionType: sessionType,
      isLti: isStudent, // Only students get isLti: true for data saving
      iat: Math.floor(now.getTime() / 1000),
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(expiresAt)
      .sign(JWT_SECRET)

    logger.info({
      userId: profile.id,
      email: profile.email,
      role: profile.role,
      sessionId,
      sessionType,
    }, 'Email OTP verification successful - session created')

    const response = NextResponse.json({
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.full_name || profile.email.split('@')[0],
        role: profile.role,
        isLti: isStudent,
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

  } catch (error) {
    logger.error({ error }, 'OTP verification error')
    return NextResponse.json(
      { success: false, error: 'Verification failed. Please try again.' },
      { status: 500 }
    )
  }
}
