import { NextRequest, NextResponse } from 'next/server'
import PlatformAdmin from '@pureweb/platform-admin-sdk'

import { logger } from '@/app/lib/logger'

import { verifyToken } from '@/app/auth'
import { originAllowed } from '@/app/origin'

export async function POST(req: NextRequest) {
  logger.info({ method: req.method }, 'Stream request received')

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

    //Generate a new agent access token
    await admin.authenticate()
    const environmentId = (await admin.createAgentEnvironment()).id
    const agent = await admin.createAgentToken(environmentId)

    // TODO: Generate full URL dynamically or use template launch
    const streamUrl =
      `https://preview.pureweb.io/463fc2e5e30dea450d565aae5984fb69079bd6e71d6464c1fa661c203b2942d7/z1ii6j?token=` +
      agent.access_token +
      `&resolution=FHD%20%20%20%20[1920x1080]`

    logger.info({ userId: payload.sub }, 'Stream created successfully')
    return NextResponse.json({ streamUrl })
  } catch (err) {
    logger.error({ error: err }, 'Failed to create stream')
    return NextResponse.json({ error: 'Failed to create stream' }, { status: 500 })
  }
}
