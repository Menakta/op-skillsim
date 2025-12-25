/**
 * Session Endpoint
 *
 * Returns current session info from the session token.
 * Used by client to get user role and session details.
 */

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-min-32-chars'
)

interface SessionPayload {
  sessionId: string
  userId: string
  email: string
  role: 'student' | 'teacher' | 'admin'
  sessionType: 'lti' | 'teacher' | 'admin'
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value

  if (!token) {
    return NextResponse.json({ session: null })
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const session = payload as unknown as SessionPayload

    // Ensure role matches sessionType for teacher/admin
    let role = session.role
    if (session.sessionType === 'teacher') {
      role = 'teacher'
    } else if (session.sessionType === 'admin') {
      role = 'admin'
    }

    return NextResponse.json({
      session: {
        userId: session.userId,
        email: session.email,
        role: role,
        sessionType: session.sessionType,
        sessionId: session.sessionId,
      }
    })
  } catch {
    // Invalid or expired token
    return NextResponse.json({ session: null })
  }
}
