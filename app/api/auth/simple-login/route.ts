/**
 * Simple Login Endpoint (Non-LTI / Demo Mode)
 *
 * Authenticates using a local JSON file for demo/testing purposes.
 * Creates a session with isLti=false flag.
 *
 * - Students: Can do training but data won't be saved
 * - Teachers/Admins: Can view admin panel in read-only mode
 */

import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'
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

// =============================================================================
// POST - Simple Email/Password Login (Demo Mode)
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

    logger.info({ email }, 'Demo login attempt')

    // Find user in demo database
    const user = (demoUsers.users as DemoUser[]).find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    )

    if (!user) {
      logger.warn({ email }, 'Demo login failed - invalid credentials')
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Generate session
    const sessionId = randomUUID()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 60 * 60  * 1000) // 1 hour

    // Create JWT token with isLti=false flag
    const token = await new SignJWT({
      sessionId,
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionType: user.role === 'student' ? 'lti' : user.role,
      isLti: false, // Important: marks this as non-LTI (demo) session
      iat: Math.floor(now.getTime() / 1000),
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(expiresAt)
      .sign(JWT_SECRET)

    logger.info({
      userId: user.id,
      email: user.email,
      role: user.role,
      isLti: false,
      sessionId,
    }, 'Demo login successful')

    // Create response
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
        role: user.role,
        isLti: false,
      },
    })

    // Set session token cookie
    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    })

    return response

  } catch (error) {
    logger.error({ error }, 'Demo login error')
    return NextResponse.json(
      { success: false, error: 'Login failed. Please try again.' },
      { status: 500 }
    )
  }
}
