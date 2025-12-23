/**
 * Middleware - Simplified (no session checks)
 *
 * Currently disabled - all routes are accessible.
 */

import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Pass through all requests
  return NextResponse.next()
}

export const config = {
  matcher: [],
}
