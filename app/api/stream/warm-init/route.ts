/**
 * Warm Pool Initialization Endpoint
 *
 * Initializes the warm pool with pre-provisioned environments.
 * Call this on app startup or via cron to maintain warm instances.
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/app/lib/logger'
import {
  initWarmPool,
  preWarmEnvironments,
  getPoolStatus,
  shutdownWarmPool,
} from '@/app/lib/warmPool'

// Secret key for admin operations (set in environment)
const ADMIN_SECRET = process.env.WARM_POOL_ADMIN_SECRET

function validateAdminRequest(req: NextRequest): boolean {
  // In development, allow without secret
  if (process.env.NODE_ENV === 'development') {
    return true
  }

  const authHeader = req.headers.get('authorization')
  if (!authHeader || !ADMIN_SECRET) {
    return false
  }

  return authHeader === `Bearer ${ADMIN_SECRET}`
}

/**
 * POST - Initialize or pre-warm the pool
 */
export async function POST(req: NextRequest) {
  if (!validateAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const action = body.action || 'init'
    const count = body.count || 2

    switch (action) {
      case 'init':
        await initWarmPool({
          minPoolSize: count,
          maxPoolSize: Math.max(count * 2, 5),
        })
        logger.info({ action: 'init', count }, 'Warm pool initialized via API')
        break

      case 'prewarm':
        const created = await preWarmEnvironments(count)
        logger.info({ action: 'prewarm', requested: count, created }, 'Pre-warmed environments via API')
        break

      case 'shutdown':
        shutdownWarmPool()
        logger.info({ action: 'shutdown' }, 'Warm pool shutdown via API')
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const status = getPoolStatus()
    return NextResponse.json({
      success: true,
      action,
      status,
    })
  } catch (error) {
    logger.error({ error }, 'Warm pool operation failed')
    return NextResponse.json(
      { error: 'Operation failed' },
      { status: 500 }
    )
  }
}

/**
 * GET - Get pool status
 */
export async function GET(req: NextRequest) {
  const status = getPoolStatus()
  return NextResponse.json(status)
}
