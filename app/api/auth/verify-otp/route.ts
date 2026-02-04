/**
 * OTP Verification Endpoint
 *
 * Verifies the SMS OTP sent to outsider users during login.
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

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  registration_type: 'lti' | 'outsider' | 'demo'
  approval_status: 'pending' | 'approved' | 'rejected'
  role: UserRole
}

// =============================================================================
// POST - Verify OTP
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const { phone, otp } = await request.json()

    if (!phone || !otp) {
      return NextResponse.json(
        { success: false, error: 'Phone and OTP are required' },
        { status: 400 }
      )
    }

    logger.info({ phone: phone.replace(/(\+\d{2})\d+(\d{4})/, '$1****$2') }, 'OTP verification attempt')

    const supabase = getSupabase()

    // Verify OTP with Supabase
    const { data: authData, error: verifyError } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: 'sms',
    })

    if (verifyError || !authData.user) {
      logger.warn({ phone, error: verifyError?.message }, 'OTP verification failed')
      return NextResponse.json(
        { success: false, error: 'Invalid or expired verification code' },
        { status: 401 }
      )
    }

    // Get user profile
    const supabaseAdmin = getSupabaseAdmin()
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, full_name, phone, registration_type, approval_status, role')
      .eq('phone', phone)
      .single<UserProfile>()

    if (profileError || !profile) {
      logger.error({ phone }, 'OTP verified but no profile found')
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      )
    }

    // Double-check approval status
    if (profile.approval_status !== 'approved') {
      logger.warn({ phone, status: profile.approval_status }, 'OTP verified but user not approved')
      return NextResponse.json(
        { success: false, error: 'Your account is not approved' },
        { status: 403 }
      )
    }

    // Create session
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
      sessionId,
    }, 'OTP verification successful - session created')

    const response = NextResponse.json({
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.full_name || profile.email.split('@')[0],
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

  } catch (error) {
    logger.error({ error }, 'OTP verification error')
    return NextResponse.json(
      { success: false, error: 'Verification failed. Please try again.' },
      { status: 500 }
    )
  }
}
