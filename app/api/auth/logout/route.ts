/**
 * Logout Endpoint
 *
 * Clears authentication cookies and invalidates the session.
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/app/lib/logger'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('access_token')?.value

  logger.info({ hasToken: !!token }, 'Logout request')

  const response = NextResponse.json({ status: 'ok' })

  // Clear auth cookies
  response.cookies.set('access_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0 // Expire immediately
  })

  response.cookies.set('user_role', '', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  })

  return response
}

// Also support GET for convenience
export async function GET(req: NextRequest) {
  return POST(req)
}
