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
  phone: string | null
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

        // Approved outsider - trigger SMS OTP for 2FA
        if (!profile.phone) {
          logger.error({ email, userId: profile.id }, 'Approved outsider has no phone number')
          return NextResponse.json(
            { success: false, error: 'No phone number on file. Please contact an administrator.' },
            { status: 400 }
          )
        }

        // Send OTP via Supabase (Twilio)
        // Use shouldCreateUser: false since the user already exists
        const { error: otpError } = await supabase.auth.signInWithOtp({
          phone: profile.phone,
          options: {
            shouldCreateUser: false,
          },
        })

        if (otpError) {
          logger.error({ email, phone: profile.phone, error: otpError.message, code: otpError.code }, 'Failed to send OTP')

          // Return more specific error for debugging
          let errorMessage = 'Failed to send verification code. Please try again.'
          if (otpError.message.includes('Phone provider')) {
            errorMessage = 'SMS service not configured. Please contact administrator.'
          } else if (otpError.message.includes('Invalid phone')) {
            errorMessage = 'Invalid phone number format.'
          } else if (otpError.message.includes('User not found') || otpError.message.includes('Signups not allowed')) {
            // Phone not linked to any user - we need to update the user's phone first
            // Use admin client to update the user's phone in auth.users
            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
              profile.id,
              { phone: profile.phone }
            )

            if (updateError) {
              logger.error({ email, error: updateError.message }, 'Failed to update user phone')
              return NextResponse.json(
                { success: false, error: 'Failed to configure phone verification.', debug: updateError.message },
                { status: 500 }
              )
            }

            // Retry sending OTP after updating phone
            const { error: retryError } = await supabase.auth.signInWithOtp({
              phone: profile.phone,
              options: {
                shouldCreateUser: false,
              },
            })

            if (retryError) {
              logger.error({ email, error: retryError.message }, 'Failed to send OTP after phone update')
              return NextResponse.json(
                { success: false, error: 'Failed to send verification code.', debug: retryError.message },
                { status: 500 }
              )
            }

            // OTP sent successfully after retry
            logger.info({ email, userId: profile.id, phone: profile.phone }, 'OTP sent after phone update')

            return NextResponse.json({
              success: true,
              requiresOtp: true,
              userId: profile.id,
              email: profile.email,
              phone: profile.phone,
              maskedPhone: profile.phone.replace(/(\+\d{2})\d+(\d{4})/, '$1****$2'),
              message: 'Verification code sent to your phone',
            })
          }

          return NextResponse.json(
            { success: false, error: errorMessage, debug: otpError.message },
            { status: 500 }
          )
        }

        logger.info({ email, userId: profile.id, phone: profile.phone }, 'OTP sent to outsider')

        // Return response indicating OTP was sent (no session yet)
        // Include the actual phone (for OTP verification) and masked version (for display)
        return NextResponse.json({
          success: true,
          requiresOtp: true,
          userId: profile.id,
          email: profile.email, // Used to look up user during OTP verification
          phone: profile.phone, // Actual phone for Supabase OTP verification
          maskedPhone: profile.phone.replace(/(\+\d{2})\d+(\d{4})/, '$1****$2'), // For display
          message: 'Verification code sent to your phone',
        })
      }

      // Non-outsider Supabase user (e.g., LTI user logging in directly) - create session
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
      }, 'Non-outsider login successful')

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
