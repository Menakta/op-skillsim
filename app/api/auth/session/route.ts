/**
 * Session Endpoint
 *
 * Returns current session info from the session token.
 * Used by client to get user role and session details.
 */

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { supabaseAdmin } from '@/app/lib/supabase/admin'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-min-32-chars'
)

interface SessionPayload {
  sessionId: string
  userId: string
  email: string
  role: 'student' | 'teacher' | 'admin'
  sessionType: 'lti' | 'teacher' | 'admin'
  isLti?: boolean // true = LTI session (full access), false/undefined = demo session
  exp?: number // JWT expiration timestamp
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

    // Get return URL and user name from database for LTI sessions
    let returnUrl: string | null = null
    let fullName: string | null = null
    if (session.sessionId) {
      const { data: dbSession } = await supabaseAdmin
        .from('user_sessions')
        .select('lti_context, expires_at')
        .eq('session_id', session.sessionId)
        .single()

      if (dbSession?.lti_context) {
        const ltiContext = typeof dbSession.lti_context === 'string'
          ? JSON.parse(dbSession.lti_context)
          : dbSession.lti_context
        returnUrl = ltiContext.returnUrl || null
        fullName = ltiContext.full_name || null
      }
    }

    // Calculate expiry time from JWT exp claim
    const expiresAt = session.exp ? session.exp * 1000 : null // Convert to milliseconds

    return NextResponse.json({
      session: {
        userId: session.userId,
        email: session.email,
        fullName,
        role: role,
        sessionType: session.sessionType,
        sessionId: session.sessionId,
        isLti: session.isLti ?? true, // Default to true for backward compatibility
        expiresAt,
        returnUrl,
      }
    })
  } catch {
    // Invalid or expired token
    return NextResponse.json({ session: null })
  }
}
