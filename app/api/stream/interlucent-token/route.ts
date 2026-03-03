/**
 * Interlucent Admission Token API Route
 *
 * POST /api/stream/interlucent-token
 *
 * This route generates admission tokens for Interlucent pixel streaming
 * using the official @interlucent/admission-sdk.
 *
 * Environment Variables Required:
 * - INTERLUCENT_SECRET_KEY: Your project's secret key (for signing tokens)
 * - NEXT_PUBLIC_INTERLUCENT_APP_ID: Application ID to stream
 */

import { NextResponse } from 'next/server'
import { AdmissionClient } from '@interlucent/admission-sdk'

// =============================================================================
// Environment Variables
// =============================================================================

const INTERLUCENT_SECRET_KEY = process.env.INTERLUCENT_SECRET_KEY
const INTERLUCENT_PUBLISHABLE_TOKEN = process.env.INTERLUCENT_PUBLISHABLE_TOKEN
const INTERLUCENT_APP_ID = process.env.NEXT_PUBLIC_INTERLUCENT_APP_ID || ''

// Mode detection
const USE_DIRECT_TOKEN = !!INTERLUCENT_PUBLISHABLE_TOKEN
const USE_SDK = !!INTERLUCENT_SECRET_KEY && !USE_DIRECT_TOKEN
const USE_MOCK = process.env.INTERLUCENT_USE_MOCK === 'true' && !USE_DIRECT_TOKEN && !USE_SDK

// =============================================================================
// Types
// =============================================================================

interface TokenRequest {
  userId?: string
  sessionType?: 'training' | 'cinematic'
  appId?: string
  appVersion?: string
  queueWaitTolerance?: number
  swiftJobRequest?: boolean
}

interface TokenResponse {
  token: string
  expiresIn: number
  appId: string
  appVersion?: string
  mode: 'direct' | 'sdk' | 'mock'
}

// =============================================================================
// Mock Token Generation (fallback)
// =============================================================================

function generateMockToken(appId: string, userId: string): string {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'EdDSA', typ: 'JWT' }
  const payload = {
    iss: 'interlucent-mock',
    sub: userId,
    iat: now,
    exp: now + 300,
    app: appId,
    agt: 'browser',
  }
  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url')
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${base64Header}.${base64Payload}.MOCK_SIGNATURE`
}

// =============================================================================
// Route Handler
// =============================================================================

export async function POST(request: Request) {
  try {
    // Parse request body
    let body: TokenRequest = {}
    try {
      body = await request.json()
    } catch {
      // Empty body is OK
    }

    const {
      userId,
      appId = INTERLUCENT_APP_ID,
      appVersion,
      queueWaitTolerance = 45,
      swiftJobRequest = true,
    } = body

    const effectiveUserId = userId || `user-${Date.now()}`
    const expiresIn = 300

    console.log('🔑 Interlucent token request:', {
      userId: effectiveUserId,
      appId: appId || '(not set)',
      mode: USE_DIRECT_TOKEN ? 'direct' : USE_SDK ? 'sdk' : 'mock',
    })

    let token: string
    let mode: 'direct' | 'sdk' | 'mock'

    // ==========================================================================
    // MODE 1: Direct Token (use pre-generated publishable token)
    // ==========================================================================
    if (USE_DIRECT_TOKEN && INTERLUCENT_PUBLISHABLE_TOKEN) {
      console.log('✅ Using direct publishable token')
      token = INTERLUCENT_PUBLISHABLE_TOKEN
      mode = 'direct'
    }
    // ==========================================================================
    // MODE 2: SDK (generate tokens with @interlucent/admission-sdk)
    // ==========================================================================
    else if (USE_SDK && INTERLUCENT_SECRET_KEY) {
      console.log('🔐 Generating token with @interlucent/admission-sdk')
      console.log('📝 App ID:', appId)
      console.log('📝 App Version:', appVersion || '(latest)')

      try {
        const client = await AdmissionClient.create(INTERLUCENT_SECRET_KEY)

        // Build token using actual SDK API
        let tokenBuilder = client
          .createToken()
          .withApplication(appId)
          .withQueueWaitTolerance(queueWaitTolerance)
          .withRendezvousTolerance(30)
          .withFlexiblePresenceAllowance(120)
          .withLingerTolerance(30)
          .withWebRtcNegotiationTolerance(15)
          .withSwiftJobRequest(swiftJobRequest)
          .withReference(`session-${effectiveUserId}-${Date.now()}`)
          .expiresIn(expiresIn)

        // Add version if specified
        if (appVersion) {
          tokenBuilder = tokenBuilder.withVersion(appVersion)
        }

        token = await tokenBuilder.sign()
        mode = 'sdk'

        console.log('✅ Token generated successfully with SDK')
        console.log('🎫 Token preview:', token.substring(0, 50) + '...')
      } catch (sdkError) {
        console.error('❌ SDK token generation failed:', sdkError)
        throw new Error(`SDK error: ${sdkError instanceof Error ? sdkError.message : 'Unknown'}`)
      }
    }
    // ==========================================================================
    // MODE 3: Mock (fallback for development)
    // ==========================================================================
    else {
      console.log('⚠️ Using mock token (no keys configured)')
      token = generateMockToken(appId || 'mock-app', effectiveUserId)
      mode = 'mock'
    }

    const response: TokenResponse = {
      token,
      expiresIn,
      appId: appId || 'mock-app',
      appVersion,
      mode,
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Token generation error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate admission token',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// =============================================================================
// GET handler (status check)
// =============================================================================

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/stream/interlucent-token',
    method: 'POST',
    configuration: {
      mode: USE_DIRECT_TOKEN ? 'direct' : USE_SDK ? 'sdk' : 'mock',
      hasPublishableToken: !!INTERLUCENT_PUBLISHABLE_TOKEN,
      hasSecretKey: !!INTERLUCENT_SECRET_KEY,
      sdkAvailable: true,
      appId: INTERLUCENT_APP_ID || '(not set)',
    },
  })
}
