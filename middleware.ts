/**
 * Middleware - RBAC Route Protection
 *
 * Protects admin routes by verifying JWT token and user role.
 *
 * Route Protection:
 * - /admin/* : Requires 'teacher' or 'admin' role
 * - /api/admin/* : Requires 'teacher' or 'admin' role
 * - / (training) : Requires valid session (any role)
 * - /login : Public
 * - /api/* : Most are public (auth handled in route)
 *
 * Outsider Registration Flow:
 * - Checks user_profiles for outsiders after JWT validation
 * - Pending approval: Redirect to /pending-approval
 * - Rejected: Sign out and redirect to /login with error
 * - LTI and demo users bypass this check
 */

import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { createClient } from '@supabase/supabase-js'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-min-32-chars'
)

// Routes that require teacher/admin role
const ADMIN_ROUTES = ['/admin']
const ADMIN_API_ROUTES = ['/api/admin']

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/api/auth', '/api/lti', '/register', '/pending-approval', '/session-complete']

interface SessionPayload {
  sessionId: string
  userId: string
  email: string
  role: 'student' | 'teacher' | 'admin'
  sessionType: string
  isLti?: boolean
}

async function getSessionFromToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

// Supabase client for middleware (lazy initialized)
let _supabaseAdmin: ReturnType<typeof createClient> | null = null

function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (url && serviceRoleKey) {
      _supabaseAdmin = createClient(url, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    }
  }
  return _supabaseAdmin
}

interface UserProfile {
  registration_type: 'lti' | 'outsider' | 'demo'
  approval_status: 'pending' | 'approved' | 'rejected'
}

/**
 * Check outsider approval status from user_profiles table.
 * Returns null if user is not an outsider or profile not found.
 * LTI and demo users bypass this check entirely.
 */
async function checkOutsiderApproval(email: string, isLti?: boolean): Promise<UserProfile | null> {
  // LTI users bypass outsider check - they're authenticated via LTI provider
  if (isLti === true) {
    return null
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    console.warn('[Middleware] Supabase not configured - skipping outsider check')
    return null
  }

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('registration_type, approval_status')
      .eq('email', email)
      .single<UserProfile>()

    if (error || !data) {
      // No profile found - could be LTI user or demo user not in user_profiles
      return null
    }

    // Only apply approval check to outsiders
    if (data.registration_type !== 'outsider') {
      return null
    }

    return data
  } catch (err) {
    console.error('[Middleware] Error checking outsider approval:', err)
    return null
  }
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route))
}

function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some(route => pathname.startsWith(route))
}

function isAdminApiRoute(pathname: string): boolean {
  return ADMIN_API_ROUTES.some(route => pathname.startsWith(route))
}

function hasAdminAccess(role: string): boolean {
  return role === 'teacher' || role === 'admin'
}

/**
 * Handle outsider approval status - redirect if pending or rejected.
 * Returns a response to redirect, or null to continue.
 */
function handleOutsiderStatus(
  profile: UserProfile,
  request: NextRequest
): NextResponse | null {
  if (profile.approval_status === 'pending') {
    // Redirect pending outsiders to the pending approval page
    console.log(`[Middleware] Outsider pending approval - redirecting to /pending-approval`)
    return NextResponse.redirect(new URL('/pending-approval', request.url))
  }

  if (profile.approval_status === 'rejected') {
    // Sign out rejected outsiders and redirect to login with error
    console.log(`[Middleware] Outsider rejected - signing out and redirecting to /login`)
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('error', 'rejected')
    const response = NextResponse.redirect(loginUrl)
    // Clear the session token to sign them out
    response.cookies.delete('session_token')
    return response
  }

  // Approved - allow through
  return null
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('session_token')?.value
  // Log 1: Monitor what hits the middleware
  console.log(`[Middleware] Request: ${request.method} ${pathname} | Token Present: ${!!token}`)

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // Get session token from cookie
  

  // Check admin routes (pages)
  if (isAdminRoute(pathname)) {
    console.log(`[Middleware] Admin route detected: ${pathname}`)

    if (!token) {
      console.log(`[Middleware] Admin Access Denied: No Token for ${pathname}`)
      // No token - redirect to login
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    const session = await getSessionFromToken(token)
    console.log(`[Middleware] Admin route - Session:`, session ? { userId: session.userId, role: session.role, email: session.email, isLti: session.isLti } : 'null')

    if (!session) {
      console.log(`[Middleware] Admin Access Denied: Invalid session token for ${pathname}`)
      // Invalid token - redirect to login
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      const response = NextResponse.redirect(loginUrl)
      // Clear invalid token
      response.cookies.delete('session_token')
      return response
    }

    if (!hasAdminAccess(session.role)) {
      // User is a student - redirect to training page
      console.log(`[Middleware] Access denied: User ${session.userId} with role '${session.role}' tried to access ${pathname}`)
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Check outsider approval status (LTI and demo users bypass this)
    const outsiderProfile = await checkOutsiderApproval(session.email, session.isLti)
    console.log(`[Middleware] Outsider profile check for ${session.email}:`, outsiderProfile)

    if (outsiderProfile) {
      const redirectResponse = handleOutsiderStatus(outsiderProfile, request)
      if (redirectResponse) {
        return redirectResponse
      }
    }

    // Valid admin/teacher - allow access
    console.log(`[Middleware] Admin Access GRANTED for ${session.email} (${session.role}) to ${pathname}`)
    return NextResponse.next()
  }

  // Check admin API routes
  if (isAdminApiRoute(pathname)) {
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const session = await getSessionFromToken(token)

    if (!session) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      )
    }


    if (!hasAdminAccess(session.role)) {
      console.log(`[Middleware] API access denied: User ${session.userId} with role '${session.role}' tried to access ${pathname}`)
      return NextResponse.json(
        { error: 'Insufficient permissions. Teacher or admin role required.' },
        { status: 403 }
      )
    }

    // Check outsider approval status for API routes (LTI and demo users bypass this)
    const outsiderProfile = await checkOutsiderApproval(session.email, session.isLti)
    if (outsiderProfile) {
      if (outsiderProfile.approval_status === 'pending') {
        return NextResponse.json(
          { error: 'Account pending approval' },
          { status: 403 }
        )
      }
      if (outsiderProfile.approval_status === 'rejected') {
        return NextResponse.json(
          { error: 'Account access denied' },
          { status: 403 }
        )
      }
    }

    // Valid admin/teacher - allow access
    return NextResponse.next()
  }

  // Training page (/) - requires authentication
  if (pathname === '/') {
    if (!token) {
      console.log(`[Middleware] Training Access: No Token - redirecting to login`)
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', '/')
      return NextResponse.redirect(loginUrl)
    }

    const session = await getSessionFromToken(token)

    if (!session) {
      console.log(`[Middleware] Training Access: Invalid Token - redirecting to login`)
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', '/')
      const response = NextResponse.redirect(loginUrl)
      response.cookies.delete('session_token')
      return response
    }

    // Check outsider approval status (LTI and demo users bypass this)
    const outsiderProfile = await checkOutsiderApproval(session.email, session.isLti)
    if (outsiderProfile) {
      const redirectResponse = handleOutsiderStatus(outsiderProfile, request)
      if (redirectResponse) {
        return redirectResponse
      }
    }

    // Valid session - allow access
    console.log(`[Middleware] Training Access: Allowed for ${session.email} (${session.role})`)
    return NextResponse.next()
  }

  // All other routes - pass through
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match admin pages (both /admin and /admin/*)
    '/admin',
    '/admin/:path*',
    // Match admin API routes
    '/api/admin/:path*',
    // Match root path for training page auth check
    '/',
  ],
}