/**
 * PureWeb Warm Pool Manager
 *
 * Pre-provisions PureWeb environments to reduce cold start latency.
 * Maintains a pool of ready-to-use environments that can be claimed instantly.
 */

import PlatformAdmin from '@pureweb/platform-admin-sdk'
import { logger } from './logger'

// =============================================================================
// Types
// =============================================================================

interface WarmEnvironment {
  id: string
  environmentId: string
  agentToken: string
  createdAt: number
  expiresAt: number
  claimed: boolean
}

interface WarmPoolConfig {
  minPoolSize: number      // Minimum environments to keep ready
  maxPoolSize: number      // Maximum environments to maintain
  ttlMs: number            // Time-to-live for each environment (ms)
  refreshIntervalMs: number // How often to check and replenish pool
}

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_CONFIG: WarmPoolConfig = {
  minPoolSize: 2,           // Keep 2 environments ready
  maxPoolSize: 5,           // Max 5 environments in pool
  ttlMs: 10 * 60 * 1000,    // 10 minutes TTL (PureWeb tokens expire)
  refreshIntervalMs: 60 * 1000, // Check every minute
}

// Environment variables
const clientId = process.env.PUREWEB_PROJECT_CLIENT_ID
const clientSecret = process.env.PUREWEB_PROJECT_CLIENT_SECRET

// =============================================================================
// Warm Pool State (In-memory for single instance, use Redis for multi-instance)
// =============================================================================

let pool: WarmEnvironment[] = []
let isRefreshing = false
let refreshInterval: NodeJS.Timeout | null = null
let adminInstance: PlatformAdmin | null = null

// =============================================================================
// Helper Functions
// =============================================================================

async function getAdmin(): Promise<PlatformAdmin | null> {
  if (!clientId || !clientSecret) {
    logger.warn('PureWeb credentials not configured - warm pool disabled')
    return null
  }

  if (!adminInstance) {
    adminInstance = new PlatformAdmin(clientId, clientSecret, {
      platformUrl: 'https://api.pureweb.io',
      debug: false,
    })
    await adminInstance.authenticate()
  }

  return adminInstance
}

function isExpired(env: WarmEnvironment): boolean {
  return Date.now() > env.expiresAt
}

function getAvailableEnvironments(): WarmEnvironment[] {
  return pool.filter(env => !env.claimed && !isExpired(env))
}

// =============================================================================
// Pool Management
// =============================================================================

/**
 * Create a new warm environment and add to pool
 */
async function createWarmEnvironment(): Promise<WarmEnvironment | null> {
  const admin = await getAdmin()
  if (!admin) return null

  try {
    const startTime = Date.now()

    // Create environment
    const environment = await admin.createAgentEnvironment()

    // Create agent token for the environment
    const agent = await admin.createAgentToken(environment.id)

    const warmEnv: WarmEnvironment = {
      id: `warm-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      environmentId: environment.id,
      agentToken: agent.access_token,
      createdAt: Date.now(),
      expiresAt: Date.now() + DEFAULT_CONFIG.ttlMs,
      claimed: false,
    }

    const duration = Date.now() - startTime
    logger.info({
      environmentId: warmEnv.environmentId,
      duration,
      poolSize: pool.length + 1
    }, 'Created warm environment')

    return warmEnv
  } catch (error) {
    logger.error({ error }, 'Failed to create warm environment')
    return null
  }
}

/**
 * Remove expired and claimed environments from pool
 */
function cleanupPool(): void {
  const before = pool.length
  pool = pool.filter(env => !env.claimed && !isExpired(env))
  const removed = before - pool.length

  if (removed > 0) {
    logger.info({ removed, remaining: pool.length }, 'Cleaned up warm pool')
  }
}

/**
 * Replenish pool to maintain minimum size
 */
async function replenishPool(): Promise<void> {
  if (isRefreshing) return
  isRefreshing = true

  try {
    cleanupPool()

    const available = getAvailableEnvironments().length
    const needed = DEFAULT_CONFIG.minPoolSize - available

    if (needed > 0) {
      logger.info({ available, needed }, 'Replenishing warm pool')

      // Create environments in parallel (up to maxPoolSize)
      const createCount = Math.min(needed, DEFAULT_CONFIG.maxPoolSize - pool.length)
      const promises = Array(createCount).fill(null).map(() => createWarmEnvironment())
      const results = await Promise.all(promises)

      for (const env of results) {
        if (env) {
          pool.push(env)
        }
      }

      logger.info({ poolSize: pool.length }, 'Warm pool replenished')
    }
  } catch (error) {
    logger.error({ error }, 'Failed to replenish warm pool')
  } finally {
    isRefreshing = false
  }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Initialize the warm pool and start background refresh
 */
export async function initWarmPool(config?: Partial<WarmPoolConfig>): Promise<void> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  logger.info({ config: finalConfig }, 'Initializing warm pool')

  // Initial population
  await replenishPool()

  // Start background refresh
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }

  refreshInterval = setInterval(() => {
    replenishPool()
  }, finalConfig.refreshIntervalMs)

  logger.info({ poolSize: pool.length }, 'Warm pool initialized')
}

/**
 * Claim a warm environment from the pool
 * Returns null if no environments available (caller should create fresh)
 */
export async function claimWarmEnvironment(): Promise<{ environmentId: string; agentToken: string } | null> {
  cleanupPool()

  const available = getAvailableEnvironments()

  if (available.length === 0) {
    logger.info('No warm environments available, will create fresh')

    // Trigger background replenish
    replenishPool()

    return null
  }

  // Claim the oldest environment (FIFO)
  const env = available[0]
  env.claimed = true

  logger.info({
    environmentId: env.environmentId,
    age: Date.now() - env.createdAt,
    remaining: getAvailableEnvironments().length
  }, 'Claimed warm environment')

  // Trigger replenish to maintain pool size
  replenishPool()

  return {
    environmentId: env.environmentId,
    agentToken: env.agentToken,
  }
}

/**
 * Get current pool status
 */
export function getPoolStatus(): {
  total: number
  available: number
  claimed: number
  expired: number
} {
  const now = Date.now()
  return {
    total: pool.length,
    available: pool.filter(e => !e.claimed && e.expiresAt > now).length,
    claimed: pool.filter(e => e.claimed).length,
    expired: pool.filter(e => e.expiresAt <= now).length,
  }
}

/**
 * Shutdown the warm pool
 */
export function shutdownWarmPool(): void {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
  pool = []
  adminInstance = null
  logger.info('Warm pool shutdown')
}

/**
 * Pre-warm a specific number of environments (for manual warming)
 */
export async function preWarmEnvironments(count: number): Promise<number> {
  const created: WarmEnvironment[] = []

  for (let i = 0; i < count; i++) {
    const env = await createWarmEnvironment()
    if (env) {
      pool.push(env)
      created.push(env)
    }
  }

  logger.info({ requested: count, created: created.length }, 'Pre-warmed environments')
  return created.length
}
