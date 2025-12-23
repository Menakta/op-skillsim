/**
 * Session Endpoint - Simplified
 *
 * Returns null session (no session management).
 */

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ session: null })
}
