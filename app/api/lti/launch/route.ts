/**
 * LTI 1.0 Launch Endpoint for iQualify
 *
 * Authentication Flow:
 * - Students: LTI launch → SessionManager creates session → redirect to / (training)
 * - Teachers/Admins: LTI launch → set role cookie → redirect to /login (Supabase auth required)
 *
 * Updated with Absolute HTTPS Redirects for Ngrok compatibility.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { logger } from '@/app/lib/logger'
import { sessionManager } from '@/app/lib/sessions'
import { findOrCreateLtiUser, LtiPayload } from '@/app/lib/database'
import type { UserRole } from '@/app/types'

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
    .replace(/!/g, '%21')
    .replace(/\*/g, '%2A')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
}

function createParameterString(params: LtiLaunchParams): string {
  return Object.entries(params)
    .filter(([key]) => key !== 'oauth_signature')
    .filter(([, value]) => value !== undefined && value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${encodeRFC3986(key)}=${encodeRFC3986(value!)}`)
    .join('&')
}

function calculateOAuthSignature(
  method: string,
  url: string,
  params: LtiLaunchParams,
  consumerSecret: string
): string {
  const baseUrl = url.split('?')[0]
  const paramString = createParameterString(params)
  const signatureBase = [
    method.toUpperCase(),
    encodeRFC3986(baseUrl),
    encodeRFC3986(paramString),
  ].join('&')
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

function getLaunchUrl(req: NextRequest): string {
  const protocol = req.headers.get('x-forwarded-proto') || 'https'
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000'
  return `${protocol}://${host}/api/lti/launch`
}

function mapLtiRole(ltiRoles: string | undefined): UserRole {
  if (!ltiRoles) return 'student'
  const roles = ltiRoles.toLowerCase()
  if (roles.includes('instructor') || roles.includes('teacher') || roles.includes('staff')) {
    return 'teacher'
  }
  if (roles.includes('admin')) return 'admin'
  return 'student'
}

function getRedirectPath(role: UserRole): string {
  // Students: Go directly to training (auto-login via session)
  // Teachers/Admins: Must authenticate via Supabase login page
  return role === 'student' ? '/' : '/login'
}

// =============================================================================
// POST Handler
// =============================================================================

export async function POST(req: NextRequest) {
  try {
    const credentials = getConsumerCredentials()
    if (!credentials) {
      return NextResponse.json({ error: 'LTI not configured' }, { status: 500 })
    }

    // Parse Form Data
    const text = await req.text()
    const params: LtiLaunchParams = {} as LtiLaunchParams
    new URLSearchParams(text).forEach((value, key) => {
      ;(params as Record<string, string>)[key] = value
    })

    const launchUrl = getLaunchUrl(req)

    // Validate OAuth Signature
    const expectedSignature = calculateOAuthSignature('POST', launchUrl, params, credentials.secret)
    const providedSignature = decodeURIComponent(params.oauth_signature || '')

    if (!timingSafeEqual(providedSignature, expectedSignature)) {
      logger.warn({ providedSignature, expectedSignature }, 'LTI Signature Mismatch')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Extract user data from LTI params
    const ltiPayload: LtiPayload = {
      user_id: params.user_id || `user-${Date.now()}`,
      roles: params.roles || 'Learner',
      context_title: params.context_title,
      resource_link_id: params.resource_link_id,
    }

    const user = await findOrCreateLtiUser(ltiPayload)
    const appRole = mapLtiRole(params.roles)
    const redirectPath = getRedirectPath(appRole)

    // Build absolute redirect URL
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
    const protocol = 'https'
    const absoluteRedirectUrl = new URL(redirectPath, `${protocol}://${host}`)

    const response = NextResponse.redirect(absoluteRedirectUrl.toString(), 307)

    // Cookie options for iframe compatibility (iQualify)
    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'none' as const,
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    }

    // ==========================================================================
    // Student Flow: Create session with SessionManager
    // ==========================================================================
    if (appRole === 'student') {
      const ltiData = {
        userId: user.id,
        email: params.lis_person_contact_email_primary || `${user.id}@lti.local`,
        fullName: params.lis_person_name_full,
        courseId: params.context_id || '',
        courseName: params.context_title || 'Unknown Course',
        resourceId: params.resource_link_id,
        institution: params.tool_consumer_instance_name || 'Unknown Institution',
        returnUrl: params.launch_presentation_return_url,
      }

      // Get request info for session tracking
      const requestInfo = await sessionManager.getRequestInfo()

      // Create student session
      const { sessionId, token } = await sessionManager.createStudentSession(ltiData, requestInfo)

      // Create training session
      try {
        await sessionManager.createTrainingSession(
          sessionId,
          ltiData.courseId,
          ltiData.courseName
        )
      } catch (error) {
        logger.warn({ error }, 'Failed to create training session - continuing without it')
      }

      // Set session token cookie
      response.cookies.set('session_token', token, cookieOptions)

      logger.info({
        userId: user.id,
        sessionId,
        role: appRole,
        redirect: absoluteRedirectUrl.toString(),
      }, 'LTI Student Launch Success')
    }
    // ==========================================================================
    // Teacher/Admin Flow: Set role cookie, redirect to login
    // ==========================================================================
    else {
      // Set role cookie so login page knows they came from LTI
      response.cookies.set('lti_role', appRole, { ...cookieOptions, httpOnly: false })
      response.cookies.set('lti_user_id', user.id, cookieOptions)

      logger.info({
        userId: user.id,
        role: appRole,
        redirect: absoluteRedirectUrl.toString(),
      }, 'LTI Teacher/Admin Launch - Redirecting to login')
    }

    return response
  } catch (error) {
    logger.error({ error }, 'LTI POST Error')
    return NextResponse.json({ error: 'Launch failed' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ tool: 'OP SkillSim', status: 'ready' })
}
