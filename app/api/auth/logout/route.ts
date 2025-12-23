/**
 * Logout Endpoint
 *
 * Terminates the session and clears authentication cookies.
 */

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { sessionManager } from '@/app/lib/sessions'
import { logger } from '@/app/lib/logger'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-min-32-chars'
)

export async function POST(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value

  logger.info({ hasToken: !!token }, 'Logout request')

  // Terminate session in database if token exists
  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET)
      await sessionManager.terminateSession(payload.sessionId as string)
      logger.info({ sessionId: payload.sessionId }, 'Session terminated')
    } catch (error) {
      // Token invalid or session already terminated - continue with logout
      logger.warn({ error }, 'Session termination skipped')
    }
  }

  // Create response and clear cookies
  const response = NextResponse.json({ success: true })

  // Clear session token
  response.cookies.set('session_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })

  // Clear legacy cookies (if any)
  response.cookies.set('access_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })

  response.cookies.set('user_role', '', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })

  response.cookies.set('lti_role', '', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })

  return response
}

// Also support GET for convenience
export async function GET(request: NextRequest) {
  return POST(request)
}
