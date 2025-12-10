import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/app/auth'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('access_token')?.value

  if (!token) {
    return NextResponse.json({ valid: false, error: 'No token' }, { status: 401 })
  }

  const payload = verifyToken(token)
  if (!payload) {
    return NextResponse.json({ valid: false, error: 'Invalid token' }, { status: 401 })
  }

  return NextResponse.json({ valid: true, payload })
}
