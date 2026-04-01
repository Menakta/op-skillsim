/**
 * Session Refresh Endpoint
 *
 * Refreshes the current session token if it's close to expiring.
 * Called periodically during active training to prevent session drops.
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { sessionManager } from '@/app/lib/sessions'

export async function POST(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'No session token' },
      { status: 401 }
    )
  }

  try {
    const newToken = await sessionManager.refreshSession(token)

    if (!newToken) {
      return NextResponse.json(
        { success: false, error: 'Session expired or invalid' },
        { status: 401 }
      )
    }

    // If token was refreshed (different from original), update the cookie
    if (newToken !== token) {
      const cookieStore = await cookies()
      cookieStore.set('session_token', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 3 * 60 * 60, // 3 hours
      })

      return NextResponse.json({
        success: true,
        refreshed: true,
        message: 'Session token refreshed',
      })
    }

    // Token didn't need refresh yet
    return NextResponse.json({
      success: true,
      refreshed: false,
      message: 'Session still valid, no refresh needed',
    })
  } catch (error) {
    console.error('Session refresh error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to refresh session' },
      { status: 500 }
    )
  }
}
