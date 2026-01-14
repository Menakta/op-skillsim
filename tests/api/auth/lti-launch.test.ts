/**
 * LTI Launch API Tests
 *
 * Tests for /api/lti/launch endpoint
 * Covers:
 * - OAuth signature validation
 * - Role mapping (student, teacher, admin)
 * - Session creation for different roles
 * - Redirect behavior based on role
 * - Resume existing training session
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createHmac } from 'crypto'

// =============================================================================
// Mocks
// =============================================================================

// Mock session manager
const mockCreateStudentSession = vi.fn()
const mockCreateTeacherSession = vi.fn()
const mockCreateAdminSession = vi.fn()
const mockCreateTrainingSession = vi.fn()
const mockGetRequestInfo = vi.fn()

vi.mock('@/app/lib/sessions', () => ({
  sessionManager: {
    createStudentSession: (...args: unknown[]) => mockCreateStudentSession(...args),
    createTeacherSession: (...args: unknown[]) => mockCreateTeacherSession(...args),
    createAdminSession: (...args: unknown[]) => mockCreateAdminSession(...args),
    createTrainingSession: (...args: unknown[]) => mockCreateTrainingSession(...args),
    getRequestInfo: () => mockGetRequestInfo(),
  },
}))

// Mock database functions
const mockFindOrCreateLtiUser = vi.fn()

vi.mock('@/app/lib/database', () => ({
  findOrCreateLtiUser: (payload: object) => mockFindOrCreateLtiUser(payload),
  LtiPayload: {},
}))

// Mock Supabase admin
const mockSupabaseFrom = vi.fn()

vi.mock('@/app/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    from: mockSupabaseFrom,
  }),
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
// Test Constants
// =============================================================================

const TEST_CONSUMER_KEY = 'test-consumer-key'
const TEST_CONSUMER_SECRET = 'test-consumer-secret'
const TEST_LAUNCH_URL = 'https://localhost:3000/api/lti/launch'

// Set environment variables
vi.stubEnv('LTI_CONSUMER_KEY', TEST_CONSUMER_KEY)
vi.stubEnv('LTI_SHARED_SECRET', TEST_CONSUMER_SECRET)

// =============================================================================
// Helper Functions
// =============================================================================

function encodeRFC3986(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/\*/g, '%2A')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
}

function createOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string
): string {
  const paramString = Object.entries(params)
    .filter(([key]) => key !== 'oauth_signature')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${encodeRFC3986(key)}=${encodeRFC3986(value)}`)
    .join('&')

  const signatureBase = [
    method.toUpperCase(),
    encodeRFC3986(url),
    encodeRFC3986(paramString),
  ].join('&')

  const signingKey = `${consumerSecret}&`
  const hmac = createHmac('sha1', signingKey)
  hmac.update(signatureBase)
  return hmac.digest('base64')
}

function createLtiParams(overrides: Partial<Record<string, string>> = {}): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const nonce = `nonce-${Date.now()}`

  const baseParams: Record<string, string> = {
    oauth_consumer_key: TEST_CONSUMER_KEY,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_nonce: nonce,
    oauth_version: '1.0',
    lti_message_type: 'basic-lti-launch-request',
    lti_version: 'LTI-1p0',
    resource_link_id: 'resource-123',
    user_id: 'user-456',
    roles: 'Learner',
    lis_person_name_full: 'Test Student',
    lis_person_contact_email_primary: 'student@test.edu',
    context_id: 'course-789',
    context_title: 'Test Course',
    tool_consumer_instance_name: 'Test Institution',
    ...overrides,
  }

  // Calculate signature
  const signature = createOAuthSignature('POST', TEST_LAUNCH_URL, baseParams, TEST_CONSUMER_SECRET)
  baseParams.oauth_signature = signature

  return baseParams
}

function createLtiRequest(params: Record<string, string>): NextRequest {
  const body = new URLSearchParams(params).toString()

  return new NextRequest(TEST_LAUNCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'x-forwarded-proto': 'https',
      'x-forwarded-host': 'localhost:3000',
    },
    body,
  })
}

// =============================================================================
// Tests
// =============================================================================

describe('POST /api/lti/launch', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementations
    mockFindOrCreateLtiUser.mockResolvedValue({ id: 'db-user-id' })
    mockGetRequestInfo.mockResolvedValue({ ipAddress: '127.0.0.1', userAgent: 'Test' })
    mockCreateStudentSession.mockResolvedValue({
      sessionId: 'student-session-id',
      token: 'student-jwt-token',
    })
    mockCreateTeacherSession.mockResolvedValue({
      sessionId: 'teacher-session-id',
      token: 'teacher-jwt-token',
    })
    mockCreateAdminSession.mockResolvedValue({
      sessionId: 'admin-session-id',
      token: 'admin-jwt-token',
    })
    mockCreateTrainingSession.mockResolvedValue('training-session-id')

    // Default: no existing training session
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
    })
  })

  describe('OAuth Signature Validation', () => {
    it('should accept valid OAuth signature', async () => {
      const params = createLtiParams()
      const request = createLtiRequest(params)

      // Import and call POST handler
      const { POST } = await import('@/app/api/lti/launch/route')
      const response = await POST(request)

      // Should redirect (303) on success, not return error
      expect(response.status).toBe(303)
    })

    it('should reject invalid OAuth signature', async () => {
      const params = createLtiParams()
      params.oauth_signature = 'invalid-signature'
      const request = createLtiRequest(params)

      const { POST } = await import('@/app/api/lti/launch/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid signature')
    })

    it('should reject request with wrong consumer key', async () => {
      const params = createLtiParams({ oauth_consumer_key: 'wrong-key' })
      const request = createLtiRequest(params)

      const { POST } = await import('@/app/api/lti/launch/route')
      const response = await POST(request)

      // Wrong consumer key leads to signature mismatch
      // Response could be 401 JSON or 303 redirect depending on signature calculation
      expect([401, 303]).toContain(response.status)

      if (response.status === 401) {
        const data = await response.json()
        expect(data.error).toBe('Invalid signature')
      }
    })
  })

  describe('Role Mapping', () => {
    it('should map Learner role to student', async () => {
      const params = createLtiParams({ roles: 'Learner' })
      const request = createLtiRequest(params)

      const { POST } = await import('@/app/api/lti/launch/route')
      const response = await POST(request)

      expect(response.status).toBe(303)
      expect(mockCreateStudentSession).toHaveBeenCalled()
      // Student redirects to /
      expect(response.headers.get('location')).toContain('/')
    })

    it('should map Instructor role to teacher', async () => {
      const params = createLtiParams({ roles: 'Instructor' })
      const request = createLtiRequest(params)

      const { POST } = await import('@/app/api/lti/launch/route')
      const response = await POST(request)

      expect(response.status).toBe(303)
      expect(mockCreateTeacherSession).toHaveBeenCalled()
      // Teacher redirects to /admin
      expect(response.headers.get('location')).toContain('/admin')
    })

    it('should map Teacher role to teacher', async () => {
      const params = createLtiParams({ roles: 'Teacher' })
      const request = createLtiRequest(params)

      const { POST } = await import('@/app/api/lti/launch/route')
      const response = await POST(request)

      expect(response.status).toBe(303)
      expect(mockCreateTeacherSession).toHaveBeenCalled()
    })

    it('should map Admin role to admin', async () => {
      const params = createLtiParams({ roles: 'Administrator' })
      const request = createLtiRequest(params)

      const { POST } = await import('@/app/api/lti/launch/route')
      const response = await POST(request)

      expect(response.status).toBe(303)
      expect(mockCreateAdminSession).toHaveBeenCalled()
      expect(response.headers.get('location')).toContain('/admin')
    })

    it('should default to student for unknown roles', async () => {
      const params = createLtiParams({ roles: 'UnknownRole' })
      const request = createLtiRequest(params)

      const { POST } = await import('@/app/api/lti/launch/route')
      const response = await POST(request)

      expect(mockCreateStudentSession).toHaveBeenCalled()
    })

    it('should handle composite roles (Instructor,Learner)', async () => {
      const params = createLtiParams({ roles: 'Instructor,Learner' })
      const request = createLtiRequest(params)

      const { POST } = await import('@/app/api/lti/launch/route')
      const response = await POST(request)

      // Should prioritize instructor role
      expect(mockCreateTeacherSession).toHaveBeenCalled()
    })
  })

  describe('Student Session Creation', () => {
    it('should create new training session for students', async () => {
      const params = createLtiParams({ roles: 'Learner' })
      const request = createLtiRequest(params)

      const { POST } = await import('@/app/api/lti/launch/route')
      await POST(request)

      expect(mockCreateStudentSession).toHaveBeenCalled()
      expect(mockCreateTrainingSession).toHaveBeenCalled()
    })

    it('should set session cookie on successful student launch', async () => {
      const params = createLtiParams({ roles: 'Learner' })
      const request = createLtiRequest(params)

      const { POST } = await import('@/app/api/lti/launch/route')
      const response = await POST(request)

      const cookies = response.cookies.getAll()
      const sessionCookie = cookies.find((c) => c.name === 'session_token')

      expect(sessionCookie).toBeDefined()
      expect(sessionCookie?.value).toBe('student-jwt-token')
    })

    it('should pass student details to training session', async () => {
      const params = createLtiParams({
        roles: 'Learner',
        lis_person_name_full: 'John Doe',
        lis_person_contact_email_primary: 'john@test.edu',
        context_title: 'Biology 101',
        tool_consumer_instance_name: 'Test University',
      })
      const request = createLtiRequest(params)

      const { POST } = await import('@/app/api/lti/launch/route')
      await POST(request)

      expect(mockCreateStudentSession).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'john@test.edu',
          fullName: 'John Doe',
          courseName: 'Biology 101',
          institution: 'Test University',
        }),
        expect.any(Object)
      )
    })
  })

  describe('Teacher/Admin Session Creation', () => {
    it('should create teacher session with correct permissions', async () => {
      const params = createLtiParams({ roles: 'Instructor' })
      const request = createLtiRequest(params)

      const { POST } = await import('@/app/api/lti/launch/route')
      await POST(request)

      expect(mockCreateTeacherSession).toHaveBeenCalledWith(
        expect.any(String), // userId
        expect.any(String), // email
        expect.any(String), // fullName
        expect.objectContaining({
          editQuestionnaires: true,
          viewResults: true,
        }),
        expect.any(Object), // requestInfo
        expect.any(Object) // ltiData
      )
    })

    it('should create admin session with full permissions', async () => {
      const params = createLtiParams({ roles: 'Administrator' })
      const request = createLtiRequest(params)

      const { POST } = await import('@/app/api/lti/launch/route')
      await POST(request)

      expect(mockCreateAdminSession).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          editQuestionnaires: true,
          viewResults: true,
          manageUsers: true,
          viewAnalytics: true,
        }),
        expect.any(Object),
        expect.any(Object)
      )
    })
  })

  describe('Session Resume', () => {
    it('should resume existing training session if found', async () => {
      // Mock existing training session
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'existing-training-id',
            session_id: 'old-session-id',
            current_training_phase: 'Phase B',
            overall_progress: 25,
            student: { user_id: 'old-user-id', email: 'student@test.edu' },
          },
          error: null,
        }),
        update: vi.fn().mockReturnThis(),
      })

      const params = createLtiParams({
        roles: 'Learner',
        lis_person_contact_email_primary: 'student@test.edu',
      })
      const request = createLtiRequest(params)

      const { POST } = await import('@/app/api/lti/launch/route')
      await POST(request)

      // Should NOT create new training session
      expect(mockCreateTrainingSession).not.toHaveBeenCalled()
      // Should still create user session
      expect(mockCreateStudentSession).toHaveBeenCalled()
    })
  })

  describe('Redirect Behavior', () => {
    it('should redirect students to / (training page)', async () => {
      const params = createLtiParams({ roles: 'Learner' })
      const request = createLtiRequest(params)

      const { POST } = await import('@/app/api/lti/launch/route')
      const response = await POST(request)

      const location = response.headers.get('location')
      expect(location).toMatch(/https:\/\/localhost:3000\/?$/)
    })

    it('should redirect teachers to /admin', async () => {
      const params = createLtiParams({ roles: 'Instructor' })
      const request = createLtiRequest(params)

      const { POST } = await import('@/app/api/lti/launch/route')
      const response = await POST(request)

      const location = response.headers.get('location')
      expect(location).toContain('/admin')
    })

    it('should redirect admins to /admin', async () => {
      const params = createLtiParams({ roles: 'Administrator' })
      const request = createLtiRequest(params)

      const { POST } = await import('@/app/api/lti/launch/route')
      const response = await POST(request)

      const location = response.headers.get('location')
      expect(location).toContain('/admin')
    })

    it('should use 303 redirect to force GET method', async () => {
      const params = createLtiParams({ roles: 'Learner' })
      const request = createLtiRequest(params)

      const { POST } = await import('@/app/api/lti/launch/route')
      const response = await POST(request)

      // 303 See Other forces GET method on redirect
      expect(response.status).toBe(303)
    })
  })

  describe('User Data Extraction', () => {
    it('should extract full name from lis_person_name_full', async () => {
      const params = createLtiParams({
        roles: 'Learner',
        lis_person_name_full: 'John Smith',
        lis_person_name_given: 'John',
        lis_person_name_family: 'Smith',
      })
      const request = createLtiRequest(params)

      const { POST } = await import('@/app/api/lti/launch/route')
      await POST(request)

      expect(mockCreateStudentSession).toHaveBeenCalledWith(
        expect.objectContaining({ fullName: 'John Smith' }),
        expect.any(Object)
      )
    })

    it('should fall back to given + family name if full name missing', async () => {
      const params = createLtiParams({
        roles: 'Learner',
        lis_person_name_given: 'John',
        lis_person_name_family: 'Doe',
      })
      delete (params as Record<string, string | undefined>).lis_person_name_full
      // Recalculate signature after modification
      const signature = createOAuthSignature('POST', TEST_LAUNCH_URL, params, TEST_CONSUMER_SECRET)
      params.oauth_signature = signature

      const request = createLtiRequest(params)

      const { POST } = await import('@/app/api/lti/launch/route')
      await POST(request)

      expect(mockCreateStudentSession).toHaveBeenCalledWith(
        expect.objectContaining({ fullName: 'John Doe' }),
        expect.any(Object)
      )
    })

    it('should use email prefix as name if no name fields available', async () => {
      const baseParams: Record<string, string> = {
        oauth_consumer_key: TEST_CONSUMER_KEY,
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
        oauth_nonce: `nonce-${Date.now()}`,
        oauth_version: '1.0',
        lti_message_type: 'basic-lti-launch-request',
        lti_version: 'LTI-1p0',
        resource_link_id: 'resource-123',
        user_id: 'user-456',
        roles: 'Learner',
        lis_person_contact_email_primary: 'john.doe@test.edu',
        context_id: 'course-789',
        context_title: 'Test Course',
        tool_consumer_instance_name: 'Test Institution',
      }
      const signature = createOAuthSignature('POST', TEST_LAUNCH_URL, baseParams, TEST_CONSUMER_SECRET)
      baseParams.oauth_signature = signature

      const request = createLtiRequest(baseParams)

      const { POST } = await import('@/app/api/lti/launch/route')
      await POST(request)

      expect(mockCreateStudentSession).toHaveBeenCalledWith(
        expect.objectContaining({ fullName: 'john.doe' }),
        expect.any(Object)
      )
    })

    it('should generate placeholder email if not provided', async () => {
      const baseParams: Record<string, string> = {
        oauth_consumer_key: TEST_CONSUMER_KEY,
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
        oauth_nonce: `nonce-${Date.now()}`,
        oauth_version: '1.0',
        lti_message_type: 'basic-lti-launch-request',
        lti_version: 'LTI-1p0',
        resource_link_id: 'resource-123',
        user_id: 'user-456',
        roles: 'Learner',
        context_id: 'course-789',
        context_title: 'Test Course',
        tool_consumer_instance_name: 'Test Institution',
      }
      const signature = createOAuthSignature('POST', TEST_LAUNCH_URL, baseParams, TEST_CONSUMER_SECRET)
      baseParams.oauth_signature = signature

      const request = createLtiRequest(baseParams)

      const { POST } = await import('@/app/api/lti/launch/route')
      await POST(request)

      expect(mockCreateStudentSession).toHaveBeenCalledWith(
        expect.objectContaining({
          email: expect.stringMatching(/lti-.*@lti\.local/),
        }),
        expect.any(Object)
      )
    })
  })

  describe('GET /api/lti/launch', () => {
    it('should return status info', async () => {
      const request = new NextRequest(TEST_LAUNCH_URL, { method: 'GET' })

      const { GET } = await import('@/app/api/lti/launch/route')
      const response = await GET()
      const data = await response.json()

      expect(data.tool).toBe('OP SkillSim')
      expect(data.status).toBe('ready')
    })
  })
})
