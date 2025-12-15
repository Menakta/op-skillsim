/**
 * LTI 1.0 Launch Endpoint
 *
 * This endpoint receives POST requests from LTI Tool Consumers (like iQualify).
 * It validates the OAuth signature, extracts user information, creates/finds the user,
 * and redirects to the appropriate dashboard based on role.
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/app/lib/logger'
import { signTokenWithRole } from '@/app/auth'
import { validateLtiLaunch, LtiLaunchParams } from '@/app/lib/lti'
import { findOrCreateLtiUser, LtiPayload } from '@/app/lib/database'

/**
 * Parse form data from LTI POST request
 */
async function parseLtiFormData(req: NextRequest): Promise<LtiLaunchParams> {
  const contentType = req.headers.get('content-type') || ''

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await req.text()
    const params: Record<string, string> = {}

    for (const pair of text.split('&')) {
      const [key, value] = pair.split('=')
      if (key && value !== undefined) {
        params[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, ' '))
      }
    }

    return params as LtiLaunchParams
  }

  // Try JSON (for testing purposes)
  if (contentType.includes('application/json')) {
    return await req.json()
  }

  throw new Error('Unsupported content type')
}

/**
 * Get the full launch URL for signature validation
 */
function getLaunchUrl(req: NextRequest): string {
  // Use the URL from the request, but ensure it matches what the consumer signed
  const protocol = req.headers.get('x-forwarded-proto') || 'https'
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000'

  return `${protocol}://${host}/api/auth/lti`
}

/**
 * Handle LTI 1.0 launch request (POST)
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Parse LTI parameters from form data
    const params = await parseLtiFormData(req)

    logger.info({
      consumerKey: params.oauth_consumer_key,
      userId: params.user_id,
      roles: params.roles,
      contextId: params.context_id
    }, 'LTI launch request received')

    // 2. Get the launch URL for signature validation
    const launchUrl = getLaunchUrl(req)

    // 3. Validate the LTI launch (OAuth signature + LTI params)
    const validation = validateLtiLaunch('POST', launchUrl, params)

    if (!validation.valid) {
      logger.warn({
        error: validation.error,
        consumerKey: params.oauth_consumer_key
      }, 'LTI validation failed')

      return NextResponse.json(
        { error: validation.error },
        { status: 401 }
      )
    }

    // 4. Create LTI payload for user creation
    const ltiPayload: LtiPayload = {
      user_id: params.user_id || 'anonymous',
      lis_person_name_full: params.lis_person_name_full,
      lis_person_name_given: params.lis_person_name_given,
      lis_person_name_family: params.lis_person_name_family,
      lis_person_contact_email_primary: params.lis_person_contact_email_primary,
      roles: params.roles || 'Learner',
      context_id: params.context_id,
      context_title: params.context_title,
      resource_link_id: params.resource_link_id,
      resource_link_title: params.resource_link_title,
      tool_consumer_instance_guid: params.tool_consumer_instance_guid,
      tool_consumer_info_product_family_code: params.tool_consumer_info_product_family_code
    }

    // 5. Find or create user in database
    const user = await findOrCreateLtiUser(ltiPayload)

    // 6. Generate JWT token with role
    const token = signTokenWithRole(user.id, user.role)

    // 7. Determine redirect URL based on role
    const redirectUrl = getRedirectUrl(user.role)

    // 8. Create response with redirect and set auth cookie
    const response = NextResponse.redirect(new URL(redirectUrl, req.url))

    response.cookies.set('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 20 * 60 // 20 minutes
    })

    // Also set a non-httpOnly cookie for client-side role access
    response.cookies.set('user_role', user.role, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 20 * 60
    })

    logger.info({
      userId: user.id,
      role: user.role,
      redirectUrl
    }, 'LTI launch successful')

    return response
  } catch (error) {
    logger.error({ error }, 'LTI launch error')

    return NextResponse.json(
      { error: 'LTI launch failed' },
      { status: 500 }
    )
  }
}

/**
 * Get redirect URL based on user role
 */
function getRedirectUrl(role: string): string {
  switch (role) {
    case 'teacher':
    case 'admin':
      return '/dashboard/teacher'
    case 'student':
    default:
      return '/dashboard/student'
  }
}

/**
 * Handle GET requests (for LTI configuration/discovery)
 */
export async function GET() {
  // Return LTI tool configuration info
  return NextResponse.json({
    tool_name: 'OP SkillSim',
    tool_description: 'VR Training Simulation Platform',
    launch_url: '/api/auth/lti',
    supported_lti_version: 'LTI-1.0',
    oauth_signature_method: 'HMAC-SHA1',
    required_params: [
      'oauth_consumer_key',
      'oauth_signature',
      'lti_message_type',
      'lti_version',
      'resource_link_id'
    ],
    optional_params: [
      'user_id',
      'roles',
      'context_id',
      'lis_person_name_full',
      'lis_person_contact_email_primary'
    ]
  })
}
