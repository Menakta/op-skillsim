import jwt from 'jsonwebtoken'
import * as fs from 'node:fs'
import { logger } from './lib/logger'
import type { UserRole } from './lib/database'

const privateKeyPath =
  process.env.JWT_PRIVATE_KEY_PATH ||
  logger.error('No JWT_PRIVATE_KEY_PATH env var set')
const publicKeyPath =
  process.env.JWT_PUBLIC_KEY_PATH ||
  logger.error('No JWT_PUBLIC_KEY_PATH env var set')

let PRIVATE_KEY: string
let PUBLIC_KEY: string

try {
  PRIVATE_KEY = fs.readFileSync(privateKeyPath!, 'utf8')
  PUBLIC_KEY = fs.readFileSync(publicKeyPath!, 'utf8')
} catch (err) {
  logger.error({ error: err instanceof Error ? err.message : String(err) }, 'Failed to read keys:')
  throw err
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

  return jwt.sign(payload, PRIVATE_KEY, {
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

  return jwt.sign(payload, PRIVATE_KEY, {
    algorithm: 'RS256',
    expiresIn: '20m',
    issuer: 'your-auth-server'
  })
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, PUBLIC_KEY, {
      algorithms: ['RS256'],
      audience: 'webxr-stream'
    }) as JwtPayload
  } catch {
    return null
  }
}
