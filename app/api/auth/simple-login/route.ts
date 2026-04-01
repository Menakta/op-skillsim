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
 * - Approved outsiders receive email OTP for verification
 *
 * Creates a session with isLti=false flag for demo users, isLti=true for outsiders.
 */

import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/app/lib/logger'
import { randomUUID } from 'crypto'
import type { UserRole } from '@/app/types'
import demoUsers from '@/app/data/demo-users.json'
import { sendOtpEmail, generateOtpCode } from '@/app/lib/email'

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
  phone: string | null
  registration_type: 'lti' | 'outsider' | 'demo'
  approval_status: 'pending' | 'approved' | 'rejected'
  role: UserRole
}

// =============================================================================
// Helper: Mask email for display (e.g., j***@example.com)
// =============================================================================

function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@')
  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`
  }
  return `${localPart[0]}***${localPart[localPart.length - 1]}@${domain}`
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
        .select('id, email, full_name, phone, registration_type, approval_status, role')
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

        // ==========================================================================
        // APPROVED OUTSIDER - Send email OTP for verification
        // ==========================================================================
        const otpCode = generateOtpCode()
        const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MS)

        // Store OTP in user_profiles
        // Note: otp_code and otp_expires_at columns added via migration 20260401_add_email_otp_columns.sql
        // Using type assertion to bypass strict Supabase types until schema is regenerated
        const { error: updateError } = await (supabaseAdmin as unknown as {
          from: (table: string) => {
            update: (data: Record<string, unknown>) => {
              eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>
            }
          }
        }).from('user_profiles').update({
          otp_code: otpCode,
          otp_expires_at: otpExpiresAt.toISOString(),
        }).eq('id', profile.id)

        if (updateError) {
          logger.error({ error: updateError.message, email }, 'Failed to store OTP')
          return NextResponse.json(
            { success: false, error: 'Failed to send verification code. Please try again.' },
            { status: 500 }
          )
        }

        // Send OTP email
        const emailResult = await sendOtpEmail(
          { email: profile.email, fullName: profile.full_name },
          otpCode
        )

        if (!emailResult.success) {
          logger.error({ email, error: emailResult.error }, 'Failed to send OTP email')
          return NextResponse.json(
            { success: false, error: 'Failed to send verification email. Please try again.' },
            { status: 500 }
          )
        }

        logger.info({ email, userId: profile.id }, 'OTP email sent to approved outsider')

        return NextResponse.json({
          success: true,
          requiresOtp: true,
          email: profile.email,
          maskedEmail: maskEmail(profile.email),
        })
      }

      // Non-outsider Supabase user (e.g., LTI user logging in directly) - create session
      const sessionId = randomUUID()
      const now = new Date()
      const expiresAt = new Date(now.getTime() + 3 * 60 * 60 * 1000) // 3 hours (matches LTI)

      // For students, set isLti: true to enable data saving (training progress, quiz results)
      const shouldSaveData = profile.role === 'student'

      // Create user_sessions record for students (just like LTI does)
      if (shouldSaveData) {
        const supabaseAdmin = getSupabaseAdmin()
        const ltiContext = {
          courseId: 'direct-login',
          courseName: 'OP-Skillsim Plumbing Training',
          resourceId: 'direct-login',
          institution: 'Open Polytechnic Kuratini Tuwhera',
          full_name: profile.full_name || profile.email.split('@')[0],
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: sessionError } = await supabaseAdmin
          .from('user_sessions')
          .insert({
            session_id: sessionId,
            user_id: profile.id,
            session_type: 'lti',
            email: profile.email,
            role: 'student',
            lti_context: ltiContext,
            expires_at: expiresAt.toISOString(),
            status: 'active',
            login_count: 1,
            last_login_at: now.toISOString(),
          } as any)

        if (sessionError) {
          logger.warn({ error: sessionError.message, sessionId }, 'Failed to create user_session record')
        }
      }

      const token = await new SignJWT({
        sessionId,
        userId: profile.id,
        email: profile.email,
        role: profile.role,
        sessionType: profile.role === 'student' ? 'lti' : profile.role,
        isLti: shouldSaveData,
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
        isLti: shouldSaveData,
        sessionId,
      }, 'Non-outsider login successful')

      const response = NextResponse.json({
        success: true,
        user: {
          id: profile.id,
          email: profile.email,
          name: profile.full_name || email.split('@')[0],
          role: profile.role,
          isLti: shouldSaveData,
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
    const expiresAt = new Date(now.getTime() + 3 * 60 * 60 * 1000) // 3 hours - extended for long training sessions

    // Demo users: isLti: false - no data saving, no session resume
    // This differentiates them from real users (LTI and Outsiders)
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
      maxAge: 60 * 60 * 3, // 3 hours - matches JWT expiry
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
