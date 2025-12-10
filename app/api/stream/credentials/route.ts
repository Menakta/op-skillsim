import { NextRequest, NextResponse } from 'next/server'
import PlatformAdmin from '@pureweb/platform-admin-sdk'

import { logger } from '@/app/lib/logger'
import { verifyToken } from '@/app/auth'
import { originAllowed } from '@/app/origin'

export async function POST(req: NextRequest) {
  logger.info({ method: req.method }, 'Stream credentials request received')

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
  const projectId = process.env.NEXT_PUBLIC_PUREWEB_PROJECT_ID
  const modelId = process.env.NEXT_PUBLIC_PUREWEB_MODEL_ID

  if (!clientId || !clientSecret || !projectId || !modelId) {
    logger.error('Missing PureWeb credentials')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {
    const admin = new PlatformAdmin(clientId, clientSecret, {
      platformUrl: 'https://api.pureweb.io',
      debug: true
    })

    // Authenticate and create environment
    await admin.authenticate()
    const environment = await admin.createAgentEnvironment()

    logger.info({ userId: payload.sub, environmentId: environment.id }, 'Stream credentials created')

    return NextResponse.json({
      projectId,
      modelId,
      environmentId: environment.id
    })
  } catch (err) {
    logger.error({ error: err }, 'Failed to create stream credentials')
    return NextResponse.json({ error: 'Failed to create credentials' }, { status: 500 })
  }
}
