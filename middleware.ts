/**
 * Next.js Middleware for Authentication and Route Protection
 *
 * This middleware runs on every request and handles:
 * 1. Route protection - redirects unauthenticated users to login
 * 2. Role-based access control - restricts dashboard access by role
 * 3. Auth page redirects - sends authenticated users to their dashboard
 *
 * Note: Edge runtime cannot access filesystem, so JWT verification is done
 * by checking cookie presence. Full verification happens in API routes.
 */

import { NextRequest, NextResponse } from 'next/server'

// ============================================================================
// Route Configuration
// ============================================================================

// Routes that require authentication (uses startsWith matching)
const PROTECTED_ROUTES = [
  '/dashboard'
]

// Routes that should redirect authenticated users to dashboard
const AUTH_ROUTES = [
  '/login',
  '/test-login',
  '/dashboard/teacher/login'
]

// Routes that bypass authentication (login pages within protected areas)
const PUBLIC_ROUTES = [
  '/dashboard/teacher/login'
]

// ============================================================================
// Middleware Logic
// ============================================================================

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Skip middleware for static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Get auth token and role from cookies
  // Note: Full JWT verification happens server-side in API routes
  // Here we just check for cookie presence for routing decisions
  const token = req.cookies.get('access_token')?.value
  const userRole = req.cookies.get('user_role')?.value || 'student'

  const isAuthenticated = !!token

  // Check if current route is a public route (bypasses protection)
  const isPublicRoute = PUBLIC_ROUTES.some(route =>
    pathname === route || pathname.startsWith(route)
  )

  // Check if current route is protected
  const isProtectedRoute = PROTECTED_ROUTES.some(route =>
    pathname.startsWith(route)
  )

  // Check if current route is an auth route
  const isAuthRoute = AUTH_ROUTES.some(route =>
    pathname === route || pathname.startsWith(route)
  )

  // 1. Redirect unauthenticated users from protected routes to login
  // (but allow public routes like teacher login page)
  if (isProtectedRoute && !isAuthenticated && !isPublicRoute) {
    // Redirect to appropriate login page
    const isTeacherRoute = pathname.startsWith('/dashboard/teacher')
    const loginUrl = new URL(isTeacherRoute ? '/dashboard/teacher/login' : '/login', req.url)
    loginUrl.searchParams.set('returnUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 2. Redirect authenticated users from auth routes to their dashboard
  if (isAuthRoute && isAuthenticated) {
    const dashboardUrl = getDashboardUrl(userRole)
    return NextResponse.redirect(new URL(dashboardUrl, req.url))
  }

  // 3. Role-based access control for dashboards
  if (pathname.startsWith('/dashboard/teacher') && userRole === 'student') {
    // Students can't access teacher dashboard
    return NextResponse.redirect(new URL('/dashboard/student', req.url))
  }

  // 4. Generic /dashboard redirect to role-specific dashboard
  if (pathname === '/dashboard' && isAuthenticated) {
    const dashboardUrl = getDashboardUrl(userRole)
    return NextResponse.redirect(new URL(dashboardUrl, req.url))
  }

  return NextResponse.next()
}

/**
 * Get dashboard URL based on user role
 */
function getDashboardUrl(role: string): string {
  switch (role) {
    case 'teacher':
    case 'admin':
      return '/dashboard/teacher'
    case 'student':
    default:
      return '/dashboard/student'
  }
}

// ============================================================================
// Middleware Matcher Configuration
// ============================================================================

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - API routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/).*)'
  ]
}
