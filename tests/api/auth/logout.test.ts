/**
 * Logout API Tests
 *
 * Tests for /api/auth/logout endpoint
 * Covers:
 * - Session termination
 * - Cookie clearing
 * - GET and POST methods
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/auth/logout/route'

// =============================================================================
// Mocks
// =============================================================================

// Mock jose for JWT verification
const mockJwtVerify = vi.fn()

vi.mock('jose', () => ({
  jwtVerify: (...args: unknown[]) => mockJwtVerify(...args),
}))

// Mock session manager
const mockTerminateSession = vi.fn()

vi.mock('@/app/lib/sessions', () => ({
  sessionManager: {
    terminateSession: (sessionId: string) => mockTerminateSession(sessionId),
  },
}))

// Mock logger
vi.mock('@/app/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// =============================================================================
// Helper Functions
// =============================================================================

function createRequest(
  method: 'GET' | 'POST',
  cookies: Record<string, string> = {}
): NextRequest {
  const request = new NextRequest('http://localhost:3000/api/auth/logout', {
    method,
  })

  // Add cookies
  Object.entries(cookies).forEach(([name, value]) => {
    request.cookies.set(name, value)
  })

  return request
}

// =============================================================================
// Tests
// =============================================================================

describe('/api/auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: JWT verification succeeds
    mockJwtVerify.mockResolvedValue({
      payload: { sessionId: 'test-session-id' },
    })
    mockTerminateSession.mockResolvedValue(undefined)
  })

  describe('POST /api/auth/logout', () => {
    it('should return success response', async () => {
      const request = createRequest('POST', { session_token: 'valid-token' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should terminate session when valid token provided', async () => {
      const request = createRequest('POST', { session_token: 'valid-token' })
      await POST(request)

      expect(mockJwtVerify).toHaveBeenCalled()
      expect(mockTerminateSession).toHaveBeenCalledWith('test-session-id')
    })

    it('should clear session_token cookie', async () => {
      const request = createRequest('POST', { session_token: 'valid-token' })
      const response = await POST(request)

      const cookies = response.cookies.getAll()
      const sessionCookie = cookies.find((c) => c.name === 'session_token')

      expect(sessionCookie).toBeDefined()
      expect(sessionCookie?.value).toBe('')
      expect(sessionCookie?.maxAge).toBe(0)
    })

    it('should clear legacy cookies', async () => {
      const request = createRequest('POST', {
        session_token: 'valid-token',
        access_token: 'old-access-token',
        user_role: 'student',
        lti_role: 'Learner',
      })
      const response = await POST(request)

      const cookies = response.cookies.getAll()

      const legacyCookies = ['access_token', 'user_role', 'lti_role']
      for (const cookieName of legacyCookies) {
        const cookie = cookies.find((c) => c.name === cookieName)
        expect(cookie).toBeDefined()
        expect(cookie?.value).toBe('')
        expect(cookie?.maxAge).toBe(0)
      }
    })

    it('should succeed even without session token', async () => {
      const request = createRequest('POST', {})
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      // Should not attempt to terminate session
      expect(mockJwtVerify).not.toHaveBeenCalled()
    })

    it('should succeed even if JWT verification fails', async () => {
      mockJwtVerify.mockRejectedValue(new Error('Invalid token'))

      const request = createRequest('POST', { session_token: 'invalid-token' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should succeed even if session termination fails', async () => {
      mockTerminateSession.mockRejectedValue(new Error('Database error'))

      const request = createRequest('POST', { session_token: 'valid-token' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('GET /api/auth/logout', () => {
    it('should work the same as POST', async () => {
      const request = createRequest('GET', { session_token: 'valid-token' })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockTerminateSession).toHaveBeenCalledWith('test-session-id')
    })

    it('should clear cookies on GET request', async () => {
      const request = createRequest('GET', { session_token: 'valid-token' })
      const response = await GET(request)

      const cookies = response.cookies.getAll()
      const sessionCookie = cookies.find((c) => c.name === 'session_token')

      expect(sessionCookie?.value).toBe('')
      expect(sessionCookie?.maxAge).toBe(0)
    })
  })

  describe('Cookie Security', () => {
    it('should set httpOnly on session_token cookie', async () => {
      const request = createRequest('POST', { session_token: 'valid-token' })
      const response = await POST(request)

      const cookies = response.cookies.getAll()
      const sessionCookie = cookies.find((c) => c.name === 'session_token')

      expect(sessionCookie?.httpOnly).toBe(true)
    })

    it('should set sameSite=lax on cookies', async () => {
      const request = createRequest('POST', { session_token: 'valid-token' })
      const response = await POST(request)

      const cookies = response.cookies.getAll()
      const sessionCookie = cookies.find((c) => c.name === 'session_token')

      expect(sessionCookie?.sameSite).toBe('lax')
    })

    it('should set path=/ on cookies', async () => {
      const request = createRequest('POST', { session_token: 'valid-token' })
      const response = await POST(request)

      const cookies = response.cookies.getAll()
      const sessionCookie = cookies.find((c) => c.name === 'session_token')

      expect(sessionCookie?.path).toBe('/')
    })
  })
})
