/**
 * Registration API Endpoint
 *
 * Handles outsider registration:
 * 1. Creates user in Supabase Auth
 * 2. Sends notification email to admin
 *
 * The user_profiles entry is created automatically by a database trigger.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/app/lib/logger'
import { sendAdminNotificationEmail } from '@/app/lib/email'

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

// =============================================================================
// POST - Register new outsider
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName } = await request.json()

    // Validate required fields
    if (!email || !password || !fullName) {
      return NextResponse.json(
        { success: false, error: 'Email, password, and full name are required' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      )
    }

    logger.info({ email }, 'Registration attempt')

    const supabase = getSupabase()

    // Create user in Supabase Auth
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          registration_type: 'outsider',
          approval_status: 'pending',
          role: 'student',
        },
      },
    })

    if (signUpError) {
      logger.warn({ email, error: signUpError.message }, 'Registration failed')

      // Handle specific error cases
      if (signUpError.message.includes('already registered')) {
        return NextResponse.json(
          { success: false, error: 'An account with this email already exists. Please sign in instead.' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { success: false, error: signUpError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      logger.error({ email }, 'Registration returned no user')
      return NextResponse.json(
        { success: false, error: 'Registration failed. Please try again.' },
        { status: 500 }
      )
    }

    logger.info({ email, userId: authData.user.id }, 'User registered successfully')

    // Send notification email to admin
    const emailResult = await sendAdminNotificationEmail({
      email,
      fullName,
    })

    if (emailResult.success) {
      logger.info({ email }, 'Admin notification email sent for new registration')
    } else {
      // Log but don't fail the registration if email fails
      logger.warn({ email, error: emailResult.error }, 'Failed to send admin notification email')
    }

    return NextResponse.json({
      success: true,
      message: 'Registration successful. Your account is pending admin approval.',
      emailConfirmationRequired: !authData.session, // Supabase may require email confirmation
    })

  } catch (error) {
    logger.error({ error }, 'Registration error')
    return NextResponse.json(
      { success: false, error: 'Registration failed. Please try again.' },
      { status: 500 }
    )
  }
}
