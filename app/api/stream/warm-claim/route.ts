/**
 * Warm Pool Claim Endpoint
 *
 * Claims a pre-provisioned environment from the warm pool for instant streaming.
 * Falls back to creating a fresh environment if pool is empty.
 */

import { NextRequest, NextResponse } from 'next/server'
import PlatformAdmin from '@pureweb/platform-admin-sdk'
import { logger } from '@/app/lib/logger'
import { claimWarmEnvironment, getPoolStatus } from '@/app/lib/warmPool'

const clientId = process.env.PUREWEB_PROJECT_CLIENT_ID
const clientSecret = process.env.PUREWEB_PROJECT_CLIENT_SECRET
const projectId = process.env.NEXT_PUBLIC_PUREWEB_PROJECT_ID
const modelId = process.env.NEXT_PUBLIC_PUREWEB_MODEL_ID

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    // Try to claim from warm pool first
    const warmEnv = await claimWarmEnvironment()

    if (warmEnv) {
      const duration = Date.now() - startTime
      logger.info({
        source: 'warm-pool',
        duration,
        environmentId: warmEnv.environmentId,
      }, 'Claimed warm environment')

      return NextResponse.json({
        projectId,
        modelId,
        environmentId: warmEnv.environmentId,
        agentToken: warmEnv.agentToken,
        source: 'warm-pool',
        claimTimeMs: duration,
      })
    }

    // Fallback: Create fresh environment
    logger.info('Warm pool empty, creating fresh environment')

    if (!clientId || !clientSecret || !projectId || !modelId) {
      return NextResponse.json(
        { error: 'PureWeb not configured' },
        { status: 500 }
      )
    }

    const admin = new PlatformAdmin(clientId, clientSecret, {
      platformUrl: 'https://api.pureweb.io',
      debug: false,
    })

    await admin.authenticate()
    const environment = await admin.createAgentEnvironment()
    const agent = await admin.createAgentToken(environment.id)

    const duration = Date.now() - startTime
    logger.info({
      source: 'fresh',
      duration,
      environmentId: environment.id,
    }, 'Created fresh environment (warm pool was empty)')

    return NextResponse.json({
      projectId,
      modelId,
      environmentId: environment.id,
      agentToken: agent.access_token,
      source: 'fresh',
      claimTimeMs: duration,
    })
  } catch (error) {
    logger.error({ error }, 'Failed to claim/create environment')
    return NextResponse.json(
      { error: 'Failed to create streaming session' },
      { status: 500 }
    )
  }
}

/**
 * GET - Return warm pool status (for monitoring)
 */
export async function GET() {
  const status = getPoolStatus()
  return NextResponse.json(status)
}
