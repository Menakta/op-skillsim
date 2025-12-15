/**
 * Email/Password Login Endpoint
 *
 * Handles authentication for external users (demos, trials) who log in
 * with email and password instead of through LTI.
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/app/lib/logger'
import { signTokenWithRole } from '@/app/auth'
import {
  findExternalUserByEmail,
  validateExternalUserPassword
} from '@/app/lib/database'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body

    logger.info({ email }, 'External login attempt')

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await findExternalUserByEmail(email)

    if (!user) {
      logger.warn({ email }, 'Login failed - user not found')
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Validate password
    const isValidPassword = await validateExternalUserPassword(user, password)

    if (!isValidPassword) {
      logger.warn({ email }, 'Login failed - invalid password')
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Generate JWT token with role
    const token = signTokenWithRole(user.id, user.role)

    // Determine redirect URL based on role
    const redirectUrl = getRedirectUrl(user.role)

    // Create response
    const response = NextResponse.json({
      status: 'ok',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      redirectUrl
    })

    // Set HttpOnly cookie for auth
    response.cookies.set('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 20 * 60 // 20 minutes
    })

    // Set non-httpOnly cookie for client-side role access
    response.cookies.set('user_role', user.role, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 20 * 60
    })

    logger.info({
      userId: user.id,
      email: user.email,
      role: user.role
    }, 'External login successful')

    return response
  } catch (error) {
    logger.error({ error }, 'External login error')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Get redirect URL based on user role
 */
function getRedirectUrl(role: string): string {
  switch (role) {
    case 'teacher':
    case 'admin':
      return '/dashboard/teacher'
    case 'student':
    default:
      return '/dashboard/student'
  }
}
