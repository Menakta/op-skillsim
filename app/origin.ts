import { NextRequest } from 'next/server'

const whitelistEnv = process.env.ORIGIN_WHITELIST || ''
// Split by comma, trim, and filter out empty strings
const ORIGIN_WHITELIST = new Set(
  whitelistEnv
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
)

export function originAllowed(req: NextRequest): boolean {
  const origin = req.headers.get('origin') || req.headers.get('referer')
  if (!origin) return false
  try {
    const url = new URL(origin)
    return ORIGIN_WHITELIST.has(url.origin)
  } catch {
    return false
  }
}
