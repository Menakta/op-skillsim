import { NextRequest, NextResponse } from 'next/server'
import PlatformAdmin from '@pureweb/platform-admin-sdk'

import { logger } from '@/app/lib/logger'
import { verifyToken } from '@/app/auth'
import { originAllowed } from '@/app/origin'

export async function POST(req: NextRequest) {
  logger.info({ method: req.method }, 'Agent token request received')

  if (!originAllowed(req)) {
    logger.warn({ origin: req.headers.get('origin') }, 'Invalid origin')
    return NextResponse.json(
      { error: 'Access denied (invalid origin)' },
      { status: 403 }
    )
  }

  const token = req.cookies.get('access_token')?.value

  if (!token) {
    logger.warn('No access token provided')
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const payload = verifyToken(token)
  if (!payload) {
    logger.warn('Invalid access token')
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const clientId = process.env.PUREWEB_PROJECT_CLIENT_ID
  const clientSecret = process.env.PUREWEB_PROJECT_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    logger.error('Missing PureWeb credentials')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {
    const admin = new PlatformAdmin(clientId, clientSecret, {
      platformUrl: 'https://api.pureweb.io',
      debug: true
    })

    // Authenticate and create agent token
    await admin.authenticate()
    const environmentId = (await admin.createAgentEnvironment()).id
    const agent = await admin.createAgentToken(environmentId)

    logger.info({ userId: payload.sub }, 'Agent token created successfully')

    return NextResponse.json({
      agentToken: agent.access_token,
      environmentId
    })
  } catch (err) {
    logger.error({ error: err }, 'Failed to create agent token')
    return NextResponse.json({ error: 'Failed to create agent token' }, { status: 500 })
  }
}
