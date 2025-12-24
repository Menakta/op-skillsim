import jwt from 'jsonwebtoken'
import * as fs from 'node:fs'
import { logger } from './lib/logger'
import type { UserRole } from './lib/database'

// Lazy-loaded keys - prevents build-time errors when env vars aren't set
let PRIVATE_KEY: string | null = null
let PUBLIC_KEY: string | null = null

function getPrivateKey(): string {
  if (PRIVATE_KEY) return PRIVATE_KEY

  const privateKeyPath = process.env.JWT_PRIVATE_KEY_PATH
  if (!privateKeyPath) {
    throw new Error('JWT_PRIVATE_KEY_PATH environment variable is not set')
  }

  try {
    PRIVATE_KEY = fs.readFileSync(privateKeyPath, 'utf8')
    return PRIVATE_KEY
  } catch (err) {
    logger.error({ error: err instanceof Error ? err.message : String(err) }, 'Failed to read private key')
    throw err
  }
}

function getPublicKey(): string {
  if (PUBLIC_KEY) return PUBLIC_KEY

  const publicKeyPath = process.env.JWT_PUBLIC_KEY_PATH
  if (!publicKeyPath) {
    throw new Error('JWT_PUBLIC_KEY_PATH environment variable is not set')
  }

  try {
    PUBLIC_KEY = fs.readFileSync(publicKeyPath, 'utf8')
    return PUBLIC_KEY
  } catch (err) {
    logger.error({ error: err instanceof Error ? err.message : String(err) }, 'Failed to read public key')
    throw err
  }
}

export interface JwtPayload {
  sub: string
  aud: string
  iat: number
  exp: number
  jti: string
  role?: UserRole // User role for authorization
  fp?: string // optional fingerprint
}

/**
 * Sign a JWT token without role (legacy support)
 */
export function signToken(userId: string): string {
  const payload = {
    sub: userId,
    aud: 'webxr-stream',
    jti: crypto.randomUUID()
  }

  return jwt.sign(payload, getPrivateKey(), {
    algorithm: 'RS256',
    expiresIn: '20m',
    issuer: 'your-auth-server'
  })
}

/**
 * Sign a JWT token with user role
 */
export function signTokenWithRole(userId: string, role: UserRole): string {
  const payload = {
    sub: userId,
    aud: 'webxr-stream',
    jti: crypto.randomUUID(),
    role
  }

  return jwt.sign(payload, getPrivateKey(), {
    algorithm: 'RS256',
    expiresIn: '20m',
    issuer: 'your-auth-server'
  })
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, getPublicKey(), {
      algorithms: ['RS256'],
      audience: 'webxr-stream'
    }) as JwtPayload
  } catch {
    return null
  }
}
