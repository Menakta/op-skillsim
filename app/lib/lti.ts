/**
 * LTI 1.0 OAuth Signature Validation
 *
 * Implements OAuth 1.0a signature validation for LTI 1.0 launches.
 * The signature is created using HMAC-SHA1 with the consumer secret.
 */

import { createHmac } from 'crypto'
import { logger } from './logger'

// ============================================================================
// Types
// ============================================================================

export interface LtiLaunchParams {
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
  context_id?: string
  context_title?: string
  resource_link_title?: string
  lis_person_name_full?: string
  lis_person_name_given?: string
  lis_person_name_family?: string
  lis_person_contact_email_primary?: string
  tool_consumer_instance_guid?: string
  tool_consumer_info_product_family_code?: string
  launch_presentation_return_url?: string
  [key: string]: string | undefined
}

export interface LtiConsumer {
  key: string
  secret: string
  name: string
}

// ============================================================================
// LTI Consumer Configuration
// Mock consumers for development - in production, store in database
// ============================================================================

const LTI_CONSUMERS: Map<string, LtiConsumer> = new Map([
  ['iqualify-dev', {
    key: 'iqualify-dev',
    secret: 'iqualify-dev-secret-2024',
    name: 'iQualify Development'
  }],
  ['iqualify-prod', {
    key: 'iqualify-prod',
    secret: process.env.IQUALIFY_LTI_SECRET || 'change-me-in-production',
    name: 'iQualify Production'
  }],
  ['demo-consumer', {
    key: 'demo-consumer',
    secret: 'demo-secret-key',
    name: 'Demo LTI Consumer'
  }]
])

/**
 * Get LTI consumer by key
 */
export function getLtiConsumer(consumerKey: string): LtiConsumer | null {
  return LTI_CONSUMERS.get(consumerKey) || null
}

// ============================================================================
// OAuth 1.0a Signature Validation
// ============================================================================

/**
 * Validate OAuth 1.0a signature for LTI launch
 */
export function validateOAuthSignature(
  method: string,
  url: string,
  params: LtiLaunchParams,
  consumerSecret: string
): boolean {
  try {
    // Get the signature from params
    const providedSignature = params.oauth_signature
    if (!providedSignature) {
      logger.warn('Missing oauth_signature in LTI params')
      return false
    }

    // Calculate expected signature
    const expectedSignature = calculateOAuthSignature(method, url, params, consumerSecret)

    // Compare signatures (timing-safe comparison)
    const valid = timingSafeEqual(providedSignature, expectedSignature)

    if (!valid) {
      logger.debug({
        provided: providedSignature,
        expected: expectedSignature
      }, 'OAuth signature mismatch')
    }

    return valid
  } catch (error) {
    logger.error({ error }, 'Error validating OAuth signature')
    return false
  }
}

/**
 * Calculate OAuth 1.0a base signature
 */
export function calculateOAuthSignature(
  method: string,
  url: string,
  params: LtiLaunchParams,
  consumerSecret: string
): string {
  // 1. Create parameter string (excluding oauth_signature)
  const paramString = createParameterString(params)

  // 2. Create signature base string
  const signatureBase = createSignatureBaseString(method, url, paramString)

  // 3. Create signing key (consumer_secret&token_secret, but token_secret is empty for LTI)
  const signingKey = `${encodeURIComponent(consumerSecret)}&`

  // 4. Calculate HMAC-SHA1 signature
  const hmac = createHmac('sha1', signingKey)
  hmac.update(signatureBase)
  const signature = hmac.digest('base64')

  return signature
}

/**
 * Create sorted, encoded parameter string
 */
function createParameterString(params: LtiLaunchParams): string {
  // Filter out oauth_signature and sort parameters
  const sortedParams = Object.entries(params)
    .filter(([key]) => key !== 'oauth_signature')
    .filter(([, value]) => value !== undefined && value !== '')
    .sort(([a], [b]) => a.localeCompare(b))

  // Encode and join
  return sortedParams
    .map(([key, value]) => `${encodeRFC3986(key)}=${encodeRFC3986(value!)}`)
    .join('&')
}

/**
 * Create signature base string
 */
function createSignatureBaseString(
  method: string,
  url: string,
  paramString: string
): string {
  // Remove query string from URL if present
  const baseUrl = url.split('?')[0]

  return [
    method.toUpperCase(),
    encodeRFC3986(baseUrl),
    encodeRFC3986(paramString)
  ].join('&')
}

/**
 * RFC 3986 compliant URL encoding
 */
function encodeRFC3986(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/\*/g, '%2A')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do the comparison to maintain constant time
    // Using void to suppress unused variable warning while maintaining timing safety
    let dummy = 0
    for (let i = 0; i < a.length; i++) {
      dummy |= a.charCodeAt(i) ^ (b.charCodeAt(i % b.length) || 0)
    }
    void dummy // Prevent optimization from removing the loop
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

// ============================================================================
// LTI Request Validation
// ============================================================================

/**
 * Validate timestamp is within acceptable window (5 minutes)
 */
export function validateTimestamp(timestamp: string): boolean {
  const requestTime = parseInt(timestamp, 10)
  const currentTime = Math.floor(Date.now() / 1000)
  const maxDrift = 5 * 60 // 5 minutes

  return Math.abs(currentTime - requestTime) <= maxDrift
}

/**
 * Nonce tracking to prevent replay attacks
 * In production, store in Redis or database with TTL
 */
const usedNonces = new Set<string>()
const NONCE_EXPIRY_MS = 10 * 60 * 1000 // 10 minutes

/**
 * Check if nonce has been used (replay attack prevention)
 */
export function checkNonce(nonce: string, timestamp: string): boolean {
  const nonceKey = `${nonce}:${timestamp}`

  if (usedNonces.has(nonceKey)) {
    logger.warn({ nonce }, 'Duplicate nonce detected')
    return false
  }

  usedNonces.add(nonceKey)

  // Clean up old nonces periodically
  setTimeout(() => {
    usedNonces.delete(nonceKey)
  }, NONCE_EXPIRY_MS)

  return true
}

/**
 * Validate LTI message type
 */
export function validateLtiMessageType(messageType: string): boolean {
  return messageType === 'basic-lti-launch-request'
}

/**
 * Validate LTI version
 */
export function validateLtiVersion(version: string): boolean {
  return version === 'LTI-1p0' || version === 'LTI-1.0'
}

// ============================================================================
// Full LTI Launch Validation
// ============================================================================

export interface LtiValidationResult {
  valid: boolean
  error?: string
  consumer?: LtiConsumer
}

/**
 * Perform full LTI launch validation
 */
export function validateLtiLaunch(
  method: string,
  url: string,
  params: LtiLaunchParams
): LtiValidationResult {
  // 1. Check required OAuth parameters
  const requiredOAuthParams = [
    'oauth_consumer_key',
    'oauth_signature_method',
    'oauth_timestamp',
    'oauth_nonce',
    'oauth_version',
    'oauth_signature'
  ]

  for (const param of requiredOAuthParams) {
    if (!params[param]) {
      return { valid: false, error: `Missing required OAuth parameter: ${param}` }
    }
  }

  // 2. Validate signature method
  if (params.oauth_signature_method !== 'HMAC-SHA1') {
    return { valid: false, error: 'Unsupported signature method' }
  }

  // 3. Validate OAuth version
  if (params.oauth_version !== '1.0') {
    return { valid: false, error: 'Unsupported OAuth version' }
  }

  // 4. Validate timestamp
  if (!validateTimestamp(params.oauth_timestamp)) {
    return { valid: false, error: 'Request timestamp is too old or in the future' }
  }

  // 5. Check nonce for replay attacks
  if (!checkNonce(params.oauth_nonce, params.oauth_timestamp)) {
    return { valid: false, error: 'Duplicate request (nonce already used)' }
  }

  // 6. Validate LTI-specific parameters
  if (!params.lti_message_type || !validateLtiMessageType(params.lti_message_type)) {
    return { valid: false, error: 'Invalid LTI message type' }
  }

  if (!params.lti_version || !validateLtiVersion(params.lti_version)) {
    return { valid: false, error: 'Unsupported LTI version' }
  }

  if (!params.resource_link_id) {
    return { valid: false, error: 'Missing resource_link_id' }
  }

  // 7. Get consumer and validate signature
  const consumer = getLtiConsumer(params.oauth_consumer_key)
  if (!consumer) {
    return { valid: false, error: 'Unknown consumer key' }
  }

  // 8. Validate OAuth signature
  if (!validateOAuthSignature(method, url, params, consumer.secret)) {
    return { valid: false, error: 'Invalid OAuth signature' }
  }

  return { valid: true, consumer }
}

// ============================================================================
// Helper to generate LTI launch params (for testing/demo purposes)
// ============================================================================

/**
 * Generate valid LTI launch parameters for testing
 */
export function generateTestLtiParams(
  url: string,
  consumerKey: string,
  overrides: Partial<LtiLaunchParams> = {}
): LtiLaunchParams {
  const consumer = getLtiConsumer(consumerKey)
  if (!consumer) {
    throw new Error(`Unknown consumer key: ${consumerKey}`)
  }

  const baseParams: Omit<LtiLaunchParams, 'oauth_signature'> = {
    oauth_consumer_key: consumerKey,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: crypto.randomUUID().replace(/-/g, ''),
    oauth_version: '1.0',
    lti_message_type: 'basic-lti-launch-request',
    lti_version: 'LTI-1p0',
    resource_link_id: 'test-resource-001',
    user_id: 'test-user-001',
    roles: 'Learner',
    context_id: 'test-course-001',
    context_title: 'Test Course',
    lis_person_name_full: 'Test User',
    lis_person_contact_email_primary: 'test@example.com',
    tool_consumer_instance_guid: 'iqualify.test.com',
    tool_consumer_info_product_family_code: 'iqualify',
    ...overrides
  }

  // Calculate signature
  const signature = calculateOAuthSignature('POST', url, baseParams as LtiLaunchParams, consumer.secret)

  return {
    ...baseParams,
    oauth_signature: signature
  } as LtiLaunchParams
}
