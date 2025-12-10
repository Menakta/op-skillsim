import jwt from 'jsonwebtoken'
import * as fs from 'node:fs'
import { logger } from './lib/logger'

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
  logger.error(err, 'Failed to read keys:')
  throw err
}

export interface JwtPayload {
  // export interface SessionPayload extends JwtPayload {
  sub: string
  aud: string
  iat: number
  exp: number
  jti: string
  fp?: string // optional fingerprint
}

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
