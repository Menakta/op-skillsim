/**
 * LTI 1.0 Launch Endpoint for iQualify
 *
 * Authentication Flow:
 * - Students: LTI launch → SessionManager creates session → redirect to / (training)
 * - Teachers/Admins: LTI launch → SessionManager creates session → redirect to /admin (direct access)
 *
 * Updated with Absolute HTTPS Redirects for Ngrok compatibility.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createHmac, randomUUID } from 'crypto'
import { logger } from '@/app/lib/logger'
import { sessionManager } from '@/app/lib/sessions'
import { findOrCreateLtiUser, LtiPayload } from '@/app/lib/database'
import { getSupabaseAdmin } from '@/app/lib/supabase/admin'
import type { UserRole, AdminPermissions, TeacherPermissions } from '@/app/types'

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
    .filter(([, value]) => value !== undefined)  // Include empty strings - they're part of the signature!
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => {
      // Values from URLSearchParams are already decoded, so we need to encode them
      return `${encodeRFC3986(key)}=${encodeRFC3986(value || '')}`
    })
    .join('&')
}

// Alternative: Use standard percent encoding as per OAuth spec
function createParameterStringOAuth(params: LtiLaunchParams): string {
  return Object.entries(params)
    .filter(([key]) => key !== 'oauth_signature')
    .filter(([, value]) => value !== undefined)  // Include empty strings - they're part of the signature!
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => {
      return `${encodeURIComponent(key)}=${encodeURIComponent(value || '')}`
    })
    .join('&')
}

interface SignatureResult {
  rfc3986: string
  oauth: string
  debug?: {
    signatureBaseRFC3986: string
    signatureBaseOAuth: string
    signingKey: string
  }
}

function calculateOAuthSignatures(
  method: string,
  url: string,
  params: LtiLaunchParams,
  consumerSecret: string,
  debug: boolean = false
): SignatureResult {
  const baseUrl = url.split('?')[0]

  // Try both encoding methods
  const paramStringRFC3986 = createParameterString(params)
  const paramStringOAuth = createParameterStringOAuth(params)

  const signatureBaseRFC3986 = [
    method.toUpperCase(),
    encodeRFC3986(baseUrl),
    encodeRFC3986(paramStringRFC3986),
  ].join('&')

  const signatureBaseOAuth = [
    method.toUpperCase(),
    encodeURIComponent(baseUrl),
    encodeURIComponent(paramStringOAuth),
  ].join('&')

  // OAuth 1.0 signing key is: consumer_secret&token_secret
  // For LTI 1.0, there's no token secret, so it's just: consumer_secret&
  const trimmedSecret = consumerSecret.trim()
  const signingKey = `${trimmedSecret}&`

  // Calculate both signatures
  const hmac1 = createHmac('sha1', signingKey)
  hmac1.update(signatureBaseRFC3986)
  const sig1 = hmac1.digest('base64')

  const hmac2 = createHmac('sha1', signingKey)
  hmac2.update(signatureBaseOAuth)
  const sig2 = hmac2.digest('base64')

  if (debug) {
    console.log('=== OAuth Signature Calculation Debug ===')
    console.log('Method:', method.toUpperCase())
    console.log('Base URL:', baseUrl)
    console.log('Raw secret length:', consumerSecret.length)
    console.log('Trimmed secret length:', trimmedSecret.length)
    console.log('Signing Key:', signingKey)
    console.log('Signature (RFC3986):', sig1)
    console.log('Signature (OAuth/encodeURIComponent):', sig2)
    console.log('Signature Base (RFC3986):', signatureBaseRFC3986.substring(0, 200) + '...')
    console.log('=========================================')
  }

  return {
    rfc3986: sig1,
    oauth: sig2,
    debug: debug ? { signatureBaseRFC3986, signatureBaseOAuth, signingKey } : undefined
  }
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
  // No role provided (coaches or other users) → admin
  if (!ltiRoles) return 'admin'
  const roles = ltiRoles.toLowerCase()
  // Learner → student
  if (roles.includes('learner') || roles.includes('student')) {
    return 'student'
  }
  // Instructor → teacher
  if (roles.includes('instructor') || roles.includes('teacher') || roles.includes('staff')) {
    return 'teacher'
  }
  // Explicit admin role
  if (roles.includes('admin')) return 'admin'
  // Unknown/unrecognized role (coaches, etc.) → admin
  return 'admin'
}

function getRedirectPath(role: UserRole): string {
  // Students: Go directly to training
  // Teachers/Admins: Go directly to admin dashboard (auto-login via LTI session)
  return role === 'student' ? '/' : '/admin'
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

    // Debug logging for signature validation
    console.log('=== LTI Signature Debug ===')
    console.log('Launch URL used for signature:', launchUrl)
    console.log('Consumer Key from request:', params.oauth_consumer_key)
    console.log('Consumer Key from env:', credentials.key)
    console.log('Keys match:', params.oauth_consumer_key === credentials.key)
    console.log('Secret length from env:', credentials.secret?.length || 0)
    console.log('Secret first 4 chars:', credentials.secret?.substring(0, 4) || 'N/A')
    console.log('x-forwarded-proto:', req.headers.get('x-forwarded-proto'))
    console.log('x-forwarded-host:', req.headers.get('x-forwarded-host'))
    console.log('host:', req.headers.get('host'))
    console.log('req.url:', req.url)
    console.log('===========================')

    // Try multiple URL variations - some LTI providers calculate signature differently
    const urlVariations = [
      launchUrl,                                    // Standard URL
      launchUrl.replace(/\/$/, ''),                // Without trailing slash
      launchUrl + '/',                             // With trailing slash
      req.url,                                     // Original request URL
    ]

    // Also try with HTTP if HTTPS doesn't work (some providers misconfigure)
    const httpUrl = launchUrl.replace('https://', 'http://')
    if (httpUrl !== launchUrl) {
      urlVariations.push(httpUrl)
      urlVariations.push(httpUrl.replace(/\/$/, ''))
    }

    const providedSignature = decodeURIComponent(params.oauth_signature || '')
    let signatureValid = false
    let matchedUrl = ''
    let matchedMethod = ''

    console.log('=== Trying URL Variations ===')
    for (const url of urlVariations) {
      const signatures = calculateOAuthSignatures('POST', url, params, credentials.secret, false)

      if (timingSafeEqual(providedSignature, signatures.rfc3986)) {
        signatureValid = true
        matchedUrl = url
        matchedMethod = 'RFC3986'
        console.log(`✓ MATCH found with URL: ${url} (RFC3986)`)
        break
      }
      if (timingSafeEqual(providedSignature, signatures.oauth)) {
        signatureValid = true
        matchedUrl = url
        matchedMethod = 'OAuth'
        console.log(`✓ MATCH found with URL: ${url} (OAuth)`)
        break
      }
      console.log(`✗ No match for URL: ${url}`)
    }
    console.log('=============================')

    // Full debug output if no match
    if (!signatureValid) {
      const signatures = calculateOAuthSignatures('POST', launchUrl, params, credentials.secret, true)
      console.log('Provided signature:', providedSignature)

      // Log raw POST body for comparison
      console.log('=== Raw params count:', Object.keys(params).length)
      console.log('=== All param keys:', Object.keys(params).sort().join(', '))

      // Check if roles parameter exists (common missing param)
      console.log('=== Has roles param:', 'roles' in params, '- value:', params.roles || 'MISSING')

      // Show the exact encoded parameter string we're using
      const paramEntries = Object.entries(params)
        .filter(([key]) => key !== 'oauth_signature')
        .filter(([, value]) => value !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))

      console.log('=== Parameter string components ===')
      paramEntries.forEach(([key, value]) => {
        console.log(`  ${key} = "${value || ''}" → encoded: ${encodeRFC3986(key)}=${encodeRFC3986(value || '')}`)
      })
      console.log('===================================')
    }

    if (!signatureValid) {
      // Log the parameter string used for signature (for debugging)
      const paramString = Object.entries(params)
        .filter(([key]) => key !== 'oauth_signature')
        .filter(([, value]) => value !== undefined && value !== '')
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('&')

      console.log('=== LTI Signature FAILED - Details ===')
      console.log('OAuth params used for signature:')
      console.log(paramString)
      console.log('======================================')

      const signatures = calculateOAuthSignatures('POST', launchUrl, params, credentials.secret, false)
      logger.warn({
        providedSignature,
        expectedRFC3986: signatures.rfc3986,
        expectedOAuth: signatures.oauth,
        launchUrl,
        consumerKey: params.oauth_consumer_key,
        urlsAttempted: urlVariations,
      }, 'LTI Signature Mismatch - tried all URL variations')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    console.log(`=== LTI Signature VALID (${matchedMethod} with URL: ${matchedUrl}) ===`)

    // Extract user data from LTI params
    const ltiPayload: LtiPayload = {
      user_id: params.user_id || `user-${Date.now()}`,
      roles: params.roles || 'Learner',
      context_title: params.context_title,
      resource_link_id: params.resource_link_id,
    }

    // Log ALL LTI params for debugging (to see exactly what the LTI provider sends)
    console.log('=== ALL LTI Launch Params ===')
    console.log(JSON.stringify(params, null, 2))
    console.log('=============================')

    // Log LTI user data for debugging
    console.log('=== LTI Launch User Data ===')
    console.log({
      user_id: params.user_id,
      roles: params.roles,
      email: params.lis_person_contact_email_primary,
      full_name: params.lis_person_name_full,
      given_name: params.lis_person_name_given,
      family_name: params.lis_person_name_family,
      context_id: params.context_id,
      context_title: params.context_title,
      resource_link_id: params.resource_link_id,
      institution: params.tool_consumer_instance_name,
      return_url: params.launch_presentation_return_url,
    })
    console.log('============================')

    const user = await findOrCreateLtiUser(ltiPayload)
    const appRole = mapLtiRole(params.roles)
    const redirectPath = getRedirectPath(appRole)

    // Debug: Log role mapping
    console.log('=== LTI Role Mapping ===')
    console.log('Raw LTI roles:', params.roles)
    console.log('Mapped appRole:', appRole)
    console.log('Redirect path:', redirectPath)
    console.log('========================')

    // Build absolute redirect URL
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
    const protocol = 'https'
    const absoluteRedirectUrl = new URL(redirectPath, `${protocol}://${host}`)

    // Use 303 (See Other) to force GET method on redirect
    // 307 preserves POST method which causes 405 on Next.js pages
    const response = NextResponse.redirect(absoluteRedirectUrl.toString(), 303)

    // Cookie options for iframe compatibility (iQualify)
    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'none' as const,
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    }

    // ==========================================================================
    // Student Flow: Check for existing active training or create new session
    // ==========================================================================
    if (appRole === 'student') {
      // Build full name from available LTI params
      // Fallback chain: full_name -> given+family -> given -> family -> email prefix -> 'Student'
      const emailPrefix = params.lis_person_contact_email_primary?.split('@')[0]
      const fullName = params.lis_person_name_full
        || (params.lis_person_name_given && params.lis_person_name_family
          ? `${params.lis_person_name_given} ${params.lis_person_name_family}`
          : params.lis_person_name_given || params.lis_person_name_family)
        || emailPrefix
        || 'Student'

      // Use real email if available, otherwise create a placeholder
      const email = params.lis_person_contact_email_primary || `lti-${params.user_id}@lti.local`

      console.log('=== LTI Student Session Data ===')
      console.log({ fullName, email, emailPrefix, rawUserId: params.user_id })
      console.log('================================')

      const ltiData = {
        userId: user.id,
        email,
        fullName,
        courseId: params.context_id || '',
        courseName: params.context_title || 'OP-Skillsim Plumbing Training',
        resourceId: params.resource_link_id,
        institution: params.tool_consumer_instance_name || 'Open Polytechnic Kuratini Tuwhera',
        returnUrl: params.launch_presentation_return_url,
        rawLtiRole: params.roles,
      }

      // Get request info for session tracking
      const requestInfo = await sessionManager.getRequestInfo()

      // ==========================================================================
      // Resume Training Logic:
      // 1. Find active training session by email (stored in student JSONB)
      // 2. If status = 'active' → Resume from current_training_phase
      // 3. If status = 'completed' OR no record → Create new session starting at phase 0
      // ==========================================================================
      const supabase = getSupabaseAdmin()

      // Query training_sessions directly by student email (JSONB field)
      // This finds any active training for this student regardless of which user_session created it
      const { data: existingTrainingSession, error: queryError } = await supabase
        .from('training_sessions')
        .select('id, session_id, current_training_phase, overall_progress, training_state, student, status')
        .eq('student->>email', email)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (queryError && queryError.code !== 'PGRST116') {
        // Log non-"no rows" errors
        logger.warn({ error: queryError.message, email }, 'Error querying for active training session')
      }

      // Debug: Log query result
      console.log('=== Training Session Query Result ===')
      console.log({ email, found: !!existingTrainingSession, error: queryError?.message || null })
      if (existingTrainingSession) {
        console.log({
          id: existingTrainingSession.id,
          session_id: existingTrainingSession.session_id,
          current_training_phase: existingTrainingSession.current_training_phase,
          status: existingTrainingSession.status,
        })
      }
      console.log('=====================================');

      let sessionId: string
      let token: string
      let isResuming = false
      let resumePhase: string | null = null

      if (existingTrainingSession && existingTrainingSession.status === 'active') {
        // ==========================================================================
        // RESUME: Found an active training session for this email
        // ==========================================================================
        isResuming = true
        resumePhase = existingTrainingSession.current_training_phase || '0'

        console.log('=== RESUME: Active Training Session Found (JOIN query) ===')
        console.log({
          email,
          trainingSessionId: existingTrainingSession.id,
          existingSessionId: existingTrainingSession.session_id,
          currentPhase: resumePhase,
          progress: existingTrainingSession.overall_progress,
          hasState: !!existingTrainingSession.training_state,
        })
        console.log('==========================================================')

        // Create a new user_session (each LTI launch creates a new login record)
        const result = await sessionManager.createStudentSession(ltiData, requestInfo)
        sessionId = result.sessionId
        token = result.token

        // Update the training_session to use the new user_session's session_id
        // This links the new login to the existing training progress
        const updatedStudent = {
          ...(existingTrainingSession.student as Record<string, unknown>),
          user_id: ltiData.userId, // Update to current LTI userId (changes each launch)
        }

        const { error: updateError } = await supabase
          .from('training_sessions')
          .update({
            session_id: sessionId,
            student: updatedStudent,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingTrainingSession.id)

        if (updateError) {
          logger.warn({ error: updateError }, 'Failed to update training session with new session_id')
        }

        logger.info({
          email,
          userId: user.id,
          sessionId,
          trainingSessionId: existingTrainingSession.id,
          resumePhase,
          progress: existingTrainingSession.overall_progress,
        }, 'LTI Student Resume - Continuing from phase ' + resumePhase)
      } else {
        // ==========================================================================
        // NEW SESSION: No active training (completed or never started)
        // ==========================================================================
        console.log('=== NEW SESSION: No active training found ===')
        console.log({ email, reason: existingTrainingSession ? 'Previous session completed' : 'First time user' })
        console.log('=============================================')

        // Create new user_session
        const result = await sessionManager.createStudentSession(ltiData, requestInfo)
        sessionId = result.sessionId
        token = result.token

        // NOTE: We do NOT create a training_session here anymore.
        // The training_session will be created when:
        // 1. User clicks "Start New Training Session" in SessionSelectionScreen
        // 2. OR when user clicks "Skip to Training" from cinematic mode
        // This allows students to see the session selection screen first
        // and decide whether to start fresh or resume an existing session.
        logger.info({
          userId: user.id,
          sessionId,
          email,
        }, 'LTI Student Launch - User session created, training session will be created on demand')
      }

      // Set session token cookie
      response.cookies.set('session_token', token, cookieOptions)

      logger.info({
        userId: user.id,
        sessionId,
        role: appRole,
        isResuming,
        redirect: absoluteRedirectUrl.toString(),
      }, 'LTI Student Launch Success')
    }
    // ==========================================================================
    // Teacher/Admin Flow: Create session directly, redirect to admin
    // ==========================================================================
    else {
      // Build full name from available LTI params
      // Fallback chain: full_name -> given+family -> given -> family -> email prefix -> 'Teacher'/'Admin'
      const emailPrefix = params.lis_person_contact_email_primary?.split('@')[0]
      const defaultName = appRole === 'admin' ? 'Admin' : 'Teacher'
      const fullName = params.lis_person_name_full
        || (params.lis_person_name_given && params.lis_person_name_family
          ? `${params.lis_person_name_given} ${params.lis_person_name_family}`
          : params.lis_person_name_given || params.lis_person_name_family)
        || emailPrefix
        || defaultName

      // Use real email if available, otherwise create a placeholder
      const email = params.lis_person_contact_email_primary || `lti-${params.user_id}@lti.local`

      console.log('=== LTI Teacher/Admin Session Data ===')
      console.log({ fullName, email, emailPrefix, rawUserId: params.user_id, role: appRole })
      console.log('======================================')

      const ltiData = {
        userId: user.id,
        email,
        fullName,
        institution: params.tool_consumer_instance_name || 'Open Polytechnic Kuratini Tuwhera',
        rawLtiRole: params.roles,
      }

      // Get request info for session tracking
      const requestInfo = await sessionManager.getRequestInfo()

      // Define permissions based on role
      const adminPermissions: AdminPermissions = {
        editQuestionnaires: true,
        viewResults: true,
        manageUsers: true,
        viewAnalytics: true,
      }

      const teacherPermissions: TeacherPermissions = {
        editQuestionnaires: true,
        viewResults: true,
      }

      // Save or update teacher_profiles in Supabase
      const supabase = getSupabaseAdmin()
      const permissions = appRole === 'admin' ? adminPermissions : teacherPermissions

      // Check if profile exists by email first (since id is UUID and LTI sends different format)
      const { data: existingProfile } = await supabase
        .from('teacher_profiles')
        .select('id')
        .eq('email', ltiData.email)
        .single()

      let profileId: string

      if (existingProfile) {
        // Use existing profile ID
        profileId = existingProfile.id

        // Update existing profile
        const { error: updateError } = await supabase
          .from('teacher_profiles')
          .update({
            full_name: ltiData.fullName,
            institution: ltiData.institution,
            role: appRole,
            permissions: JSON.stringify(permissions),
            last_login: new Date().toISOString(),
          })
          .eq('id', profileId)

        if (updateError) {
          console.error('=== Failed to update teacher_profile ===')
          console.error(updateError)
          logger.error({ error: updateError, email: ltiData.email }, 'Failed to update teacher_profile')
        } else {
          console.log('=== Teacher Profile Updated Successfully ===')
          console.log({ profileId, email: ltiData.email, role: appRole })
          logger.info({ profileId, email: ltiData.email, role: appRole }, 'Updated teacher_profile from LTI')
        }
      } else {
        // Generate a proper UUID for new profile
        profileId = randomUUID()

        const profileData = {
          id: profileId,
          email: ltiData.email,
          full_name: ltiData.fullName,
          institution: ltiData.institution,
          role: appRole,
          permissions: JSON.stringify(permissions),
          last_login: new Date().toISOString(),
        }

        console.log('=== Saving New Teacher Profile to Supabase ===')
        console.log(profileData)

        const { data: savedProfile, error: insertError } = await supabase
          .from('teacher_profiles')
          .insert(profileData)
          .select()
          .single()

        if (insertError) {
          console.error('=== Failed to save teacher_profile ===')
          console.error(insertError)
          logger.error({ error: insertError, email: ltiData.email }, 'Failed to save teacher_profile')
        } else {
          console.log('=== Teacher Profile Saved Successfully ===')
          console.log(savedProfile)
          logger.info({ profileId, email: ltiData.email, role: appRole }, 'Created teacher_profile from LTI')
        }
      }

      // Create session based on role
      let sessionResult: { sessionId: string; token: string }

      // LTI data for session (returnUrl, institution, and raw role for debugging)
      const sessionLtiData = {
        returnUrl: params.launch_presentation_return_url,
        institution: ltiData.institution,
        rawLtiRole: ltiData.rawLtiRole,
      }

      if (appRole === 'admin') {
        sessionResult = await sessionManager.createAdminSession(
          ltiData.userId,
          ltiData.email,
          ltiData.fullName,
          adminPermissions,
          requestInfo,
          sessionLtiData
        )
      } else {
        sessionResult = await sessionManager.createTeacherSession(
          ltiData.userId,
          ltiData.email,
          ltiData.fullName,
          teacherPermissions,
          requestInfo,
          sessionLtiData
        )
      }

      // Set session token cookie
      response.cookies.set('session_token', sessionResult.token, cookieOptions)

      logger.info({
        userId: user.id,
        sessionId: sessionResult.sessionId,
        role: appRole,
        redirect: absoluteRedirectUrl.toString(),
      }, 'LTI Teacher/Admin Launch Success')
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
