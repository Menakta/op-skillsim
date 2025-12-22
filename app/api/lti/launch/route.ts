/**
 * LTI 1.0 Launch Endpoint for iQualify
 * * Updated with Absolute HTTPS Redirects for Ngrok compatibility.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { logger } from '@/app/lib/logger'
import { signTokenWithRole } from '@/app/auth'
import { findOrCreateLtiUser, LtiPayload } from '@/app/lib/database'

// =============================================================================
// Types
// =============================================================================

interface LtiLaunchParams {
  oauth_consumer_key: string
  oauth_signature_method: string
  oauth_timestamp: string
  oauth_nonce: string
  oauth_version: string
  oauth_signature: string
  oauth_callback?: string
  lti_message_type: string
  lti_version: string
  resource_link_id: string
  user_id?: string
  roles?: string
  lis_person_name_full?: string
  lis_person_name_given?: string
  lis_person_name_family?: string
  lis_person_contact_email_primary?: string
  context_id?: string
  context_title?: string
  context_label?: string
  resource_link_title?: string
  resource_link_description?: string
  tool_consumer_instance_guid?: string
  tool_consumer_instance_name?: string
  tool_consumer_info_product_family_code?: string
  tool_consumer_info_version?: string
  launch_presentation_locale?: string
  launch_presentation_return_url?: string
  launch_presentation_document_target?: string
  [key: string]: string | undefined
}

// =============================================================================
// Environment & Helper Functions
// =============================================================================

function getConsumerCredentials(): { key: string; secret: string } | null {
  const key = process.env.LTI_CONSUMER_KEY
  const secret = process.env.LTI_SHARED_SECRET
  if (!key || !secret) {
    logger.error('LTI_CONSUMER_KEY or LTI_SHARED_SECRET not configured')
    return null
  }
  return { key, secret }
}

const usedNonces = new Set<string>()
const NONCE_EXPIRY_MS = 10 * 60 * 1000 

function checkNonce(nonce: string, timestamp: string): boolean {
  const nonceKey = `${nonce}:${timestamp}`
  if (usedNonces.has(nonceKey)) return false
  usedNonces.add(nonceKey)
  setTimeout(() => usedNonces.delete(nonceKey), NONCE_EXPIRY_MS)
  return true
}

function encodeRFC3986(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, '%21').replace(/\*/g, '%2A').replace(/'/g, '%27')
    .replace(/\(/g, '%28').replace(/\)/g, '%29')
}

function createParameterString(params: LtiLaunchParams): string {
  return Object.entries(params)
    .filter(([key]) => key !== 'oauth_signature')
    .filter(([, value]) => value !== undefined && value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${encodeRFC3986(key)}=${encodeRFC3986(value!)}`)
    .join('&')
}

function calculateOAuthSignature(method: string, url: string, params: LtiLaunchParams, consumerSecret: string): string {
  const baseUrl = url.split('?')[0]
  const paramString = createParameterString(params)
  const signatureBase = [method.toUpperCase(), encodeRFC3986(baseUrl), encodeRFC3986(paramString)].join('&')
  const signingKey = `${encodeURIComponent(consumerSecret)}&`
  const hmac = createHmac('sha1', signingKey)
  hmac.update(signatureBase)
  return hmac.digest('base64')
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return result === 0
}

/**
 * FIXED: Uses x-forwarded headers to ensure we generate an HTTPS URL for signature matching
 */
function getLaunchUrl(req: NextRequest): string {
  const protocol = req.headers.get('x-forwarded-proto') || 'https'
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000'
  return `${protocol}://${host}/api/lti/launch`
}

function mapLtiRole(ltiRoles: string | undefined): 'student' | 'teacher' | 'admin' {
  if (!ltiRoles) return 'student'
  const roles = ltiRoles.toLowerCase()
  if (roles.includes('instructor') || roles.includes('teacher') || roles.includes('staff')) return 'teacher'
  if (roles.includes('admin')) return 'admin'
  return 'student'
}

function getRedirectPath(role: string): string {
  return role === 'teacher' || role === 'admin' ? '/dashboard/teacher' : '/'
}

// =============================================================================
// POST Handler
// =============================================================================

export async function POST(req: NextRequest) {
  try {
    const credentials = getConsumerCredentials()
    if (!credentials) return NextResponse.json({ error: 'LTI not configured' }, { status: 500 })

    // Parse Form Data
    const text = await req.text()
    const params: any = {}
    new URLSearchParams(text).forEach((value, key) => { params[key] = value })

    const launchUrl = getLaunchUrl(req)

    // Validate OAuth Signature
    const expectedSignature = calculateOAuthSignature('POST', launchUrl, params, credentials.secret)
    const providedSignature = decodeURIComponent(params.oauth_signature || '')

    if (!timingSafeEqual(providedSignature, expectedSignature)) {
      logger.warn({ providedSignature, expectedSignature }, 'LTI Signature Mismatch')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Auth & User Logic
    const ltiPayload: LtiPayload = {
      user_id: params.user_id || `user-${Date.now()}`,
      roles: params.roles || 'Learner',
      context_title: params.context_title,
      resource_link_id: params.resource_link_id
    }
    
    const user = await findOrCreateLtiUser(ltiPayload)
    const appRole = mapLtiRole(params.roles)
    const token = signTokenWithRole(user.id, appRole)
    const redirectPath = getRedirectPath(appRole)

    /**
     * FIX: ABSOLUTE REDIRECT TO PREVENT SSL_PROTOCOL_ERROR
     * We force 'https' and use the host from headers so ngrok works inside iframes.
     */
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
    const protocol = 'https' 
    const absoluteRedirectUrl = new URL(redirectPath, `${protocol}://${host}`)

    const response = NextResponse.redirect(absoluteRedirectUrl.toString(), 307)

    /**
     * FIX: COOKIE SECURITY FOR IFRAMES
     * Must be secure: true and sameSite: 'none' for the browser to accept them inside iQualify.
     */
    const cookieOptions = {
      httpOnly: true,
      secure: true,      // Required for SameSite=None
      sameSite: 'none' as const, 
      path: '/',
      maxAge: 60 * 60
    }

    response.cookies.set('access_token', token, cookieOptions)
    response.cookies.set('user_role', appRole, { ...cookieOptions, httpOnly: false })

    logger.info({ userId: user.id, redirect: absoluteRedirectUrl.toString() }, 'LTI Launch Success')
    return response

  } catch (error) {
    logger.error({ error }, 'LTI POST Error')
    return NextResponse.json({ error: 'Launch failed' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ tool: 'OP SkillSim', status: 'ready' })
}