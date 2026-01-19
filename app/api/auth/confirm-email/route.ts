/**
 * Email Confirmation API Endpoint
 *
 * GET /api/auth/confirm-email?token=xxx - Confirms user's email address
 *
 * Verifies the JWT token and updates is_confirmed to true in user_profiles
 */

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getSupabaseAdmin } from '@/app/lib/supabase/admin'
import { logger } from '@/app/lib/logger'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-min-32-chars'
)

// =============================================================================
// Helper: Get base URL from request
// =============================================================================

function getBaseUrl(request: NextRequest): string {
  // Try to get from environment first
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  // Fallback to request origin
  const url = new URL(request.url)
  return `${url.protocol}//${url.host}`
}

// =============================================================================
// GET - Confirm email address
// =============================================================================

export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request)

  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    logger.info({ token: token?.substring(0, 20) + '...', baseUrl }, 'Email confirmation request received')

    if (!token) {
      logger.warn('Email confirmation attempted without token')
      return NextResponse.redirect(new URL('/login?error=invalid_token', baseUrl))
    }

    // Verify the token
    let payload: { userId: string; email: string; type: string }
    try {
      const result = await jwtVerify(token, JWT_SECRET)
      payload = result.payload as { userId: string; email: string; type: string }

      logger.info({ userId: payload.userId, email: payload.email, type: payload.type }, 'Token verified')

      // Verify token type
      if (payload.type !== 'email_confirmation') {
        logger.warn({ type: payload.type }, 'Invalid token type for email confirmation')
        return NextResponse.redirect(new URL('/login?error=invalid_token', baseUrl))
      }
    } catch (error) {
      logger.warn({ error }, 'Invalid or expired confirmation token')
      return NextResponse.redirect(new URL('/login?error=token_expired', baseUrl))
    }

    const { userId, email } = payload

    const supabase = getSupabaseAdmin()

    // Check if user exists and is not already confirmed
    const { data: userProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('id, email, is_confirmed, full_name')
      .eq('id', userId)
      .single()

    logger.info({ userProfile, fetchError: fetchError?.message }, 'User profile lookup result')

    if (fetchError || !userProfile) {
      logger.error({ userId, error: fetchError?.message }, 'User not found for email confirmation')
      return NextResponse.redirect(new URL('/login?error=user_not_found', baseUrl))
    }

    // Verify email matches
    if (userProfile.email !== email) {
      logger.warn({ userId, email, profileEmail: userProfile.email }, 'Email mismatch in confirmation')
      return NextResponse.redirect(new URL('/login?error=email_mismatch', baseUrl))
    }

    // Check if already confirmed
    if (userProfile.is_confirmed) {
      logger.info({ userId, email }, 'Email already confirmed')
      return NextResponse.redirect(new URL('/login?message=already_confirmed', baseUrl))
    }

    // Update is_confirmed to true
    const { data: updateData, error: updateError } = await supabase
      .from('user_profiles')
      .update({ is_confirmed: true })
      .eq('id', userId)
      .select()

    logger.info({ updateData, updateError: updateError?.message }, 'Update result')

    if (updateError) {
      logger.error({ userId, error: updateError.message }, 'Failed to update email confirmation status')
      return NextResponse.redirect(new URL('/login?error=confirmation_failed', baseUrl))
    }

    logger.info({ userId, email }, 'Email confirmed successfully')

    // Redirect to email-verified page (user must wait for admin approval)
    return NextResponse.redirect(new URL('/email-verified', baseUrl))

  } catch (error) {
    logger.error({ error }, 'Email confirmation error')
    return NextResponse.redirect(new URL('/login?error=confirmation_failed', baseUrl))
  }
}
