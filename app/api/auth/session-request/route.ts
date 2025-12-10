import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/app/lib/logger'
import { signToken } from '@/app/auth'
import { originAllowed } from '@/app/origin'

export async function POST(req: NextRequest) {
  const body = await req.json()
  logger.info({ method: req.method, body }, 'Session request received')

  if (!originAllowed(req)) {
    logger.warn({ origin: req.headers.get('origin') }, 'Invalid origin')
    return NextResponse.json(
      { error: 'Access denied (invalid origin)' },
      { status: 403 }
    )
  }

  //TODO: Check if needed
  const { userId } = body
  if (!userId) {
    logger.warn('Missing userId in request body')
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  }

  const token = signToken(userId)

  //TODO: Customize token expiration and cookie settings as needed
  //TODO: Consider adding a fingerprint (fp) claim and validating it on use
  // Set HttpOnly cookie for iframe usage
  const response = NextResponse.json({ status: 'ok', expiresIn: 600 })
  response.cookies.set('access_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
    maxAge: 10 * 60
  })

  logger.info({ userId }, 'Session token created successfully')
  return response
}
