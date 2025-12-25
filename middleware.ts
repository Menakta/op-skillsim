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
 */

import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-min-32-chars'
)

// Routes that require teacher/admin role
const ADMIN_ROUTES = ['/admin']
const ADMIN_API_ROUTES = ['/api/admin']

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/api/auth', '/api/lti']

interface SessionPayload {
  sessionId: string
  userId: string
  email: string
  role: 'student' | 'teacher' | 'admin'
  sessionType: string
}

async function getSessionFromToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as SessionPayload
  } catch {
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
    if (!token) {
      console.log(`[Middleware] Admin Access Denied: No Token for ${pathname}`)
      // No token - redirect to login
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    const session = await getSessionFromToken(token)

    if (!session) {
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

    // Valid admin/teacher - allow access
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

    // Valid admin/teacher - allow access
    return NextResponse.next()
  }

  // All other routes - pass through
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * 1. Match your protected routes explicitly
     */
    '/admin/:path*',
    '/api/admin/:path*',
    /*
     * 2. Use a negative lookahead to exclude LTI and static files
     * This ensures /api/lti/launch is NEVER touched by this middleware
     */
    '/((?!api/lti|_next/static|_next/image|favicon.ico).*)',
  ],
}