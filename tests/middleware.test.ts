/**
 * Middleware RBAC Tests
 *
 * Tests for middleware.ts route protection
 * Covers:
 * - Admin route protection (role-based access)
 * - Training page authentication
 * - Public route access
 * - Outsider approval status checks
 * - JWT token validation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// =============================================================================
// Mocks
// =============================================================================

// Mock jose for JWT verification
const mockJwtVerify = vi.fn()

vi.mock('jose', () => ({
  jwtVerify: (...args: unknown[]) => mockJwtVerify(...args),
}))

// Mock Supabase admin client
const mockSupabaseFrom = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockSupabaseFrom,
  })),
}))

// Set environment variables
vi.stubEnv('JWT_SECRET', 'test-secret-key-minimum-32-characters')
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')

// =============================================================================
// Helper Functions
// =============================================================================

function createRequest(
  path: string,
  options: {
    cookies?: Record<string, string>
    method?: string
  } = {}
): NextRequest {
  const url = `http://localhost:3000${path}`
  const request = new NextRequest(url, {
    method: options.method || 'GET',
  })

  if (options.cookies) {
    Object.entries(options.cookies).forEach(([name, value]) => {
      request.cookies.set(name, value)
    })
  }

  return request
}

function mockValidSession(role: 'student' | 'teacher' | 'admin', isLti = true) {
  mockJwtVerify.mockResolvedValue({
    payload: {
      sessionId: 'test-session-id',
      userId: 'test-user-id',
      email: `${role}@test.com`,
      role,
      isLti,
    },
  })
}

// =============================================================================
// Tests
// =============================================================================

describe('Middleware RBAC', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: No outsider profile (bypass check)
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })
  })

  describe('Public Routes', () => {
    it('should allow access to /login without authentication', async () => {
      const request = createRequest('/login')

      const { middleware } = await import('@/middleware')
      const response = await middleware(request)

      // NextResponse.next() returns undefined or continues
      expect(response.status).not.toBe(401)
      expect(response.status).not.toBe(403)
    })

    it('should allow access to /register without authentication', async () => {
      const request = createRequest('/register')

      const { middleware } = await import('@/middleware')
      const response = await middleware(request)

      expect(response.status).not.toBe(401)
    })

    it('should allow access to /pending-approval without authentication', async () => {
      const request = createRequest('/pending-approval')

      const { middleware } = await import('@/middleware')
      const response = await middleware(request)

      expect(response.status).not.toBe(401)
    })

    it('should allow access to /api/auth/* without authentication', async () => {
      const authRoutes = [
        '/api/auth/login',
        '/api/auth/simple-login',
        '/api/auth/register',
        '/api/auth/logout',
      ]

      const { middleware } = await import('@/middleware')

      for (const route of authRoutes) {
        const request = createRequest(route)
        const response = await middleware(request)
        expect(response.status).not.toBe(401)
      }
    })

    it('should allow access to /api/lti/* without authentication', async () => {
      const request = createRequest('/api/lti/launch', { method: 'POST' })

      const { middleware } = await import('@/middleware')
      const response = await middleware(request)

      expect(response.status).not.toBe(401)
    })
  })

  describe('Admin Routes - Authentication', () => {
    it('should redirect to login when accessing /admin without token', async () => {
      const request = createRequest('/admin')

      const { middleware } = await import('@/middleware')
      const response = await middleware(request)

      expect(response.status).toBe(307) // Redirect
      expect(response.headers.get('location')).toContain('/login')
      expect(response.headers.get('location')).toContain('redirect=%2Fadmin')
    })

    it('should redirect to login when accessing /admin/sessions without token', async () => {
      const request = createRequest('/admin/sessions')

      const { middleware } = await import('@/middleware')
      const response = await middleware(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/login')
    })

    it('should redirect to login with invalid token', async () => {
      mockJwtVerify.mockRejectedValue(new Error('Invalid token'))

      const request = createRequest('/admin', {
        cookies: { session_token: 'invalid-token' },
      })

      const { middleware } = await import('@/middleware')
      const response = await middleware(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/login')
    })

    it('should clear invalid token cookie on redirect', async () => {
      mockJwtVerify.mockRejectedValue(new Error('Invalid token'))

      const request = createRequest('/admin', {
        cookies: { session_token: 'invalid-token' },
      })

      const { middleware } = await import('@/middleware')
      const response = await middleware(request)

      const cookies = response.cookies.getAll()
      const sessionCookie = cookies.find((c) => c.name === 'session_token')

      // Cookie should be deleted (maxAge: 0 or value: '')
      expect(sessionCookie?.value).toBe('')
    })
  })

  describe('Admin Routes - Authorization', () => {
    it('should allow teacher access to /admin', async () => {
      mockValidSession('teacher')

      const request = createRequest('/admin', {
        cookies: { session_token: 'valid-token' },
      })

      const { middleware } = await import('@/middleware')
      const response = await middleware(request)

      // Should not redirect
      expect(response.status).not.toBe(307)
      expect(response.status).not.toBe(403)
    })

    it('should allow admin access to /admin', async () => {
      mockValidSession('admin')

      const request = createRequest('/admin', {
        cookies: { session_token: 'valid-token' },
      })

      const { middleware } = await import('@/middleware')
      const response = await middleware(request)

      expect(response.status).not.toBe(307)
      expect(response.status).not.toBe(403)
    })

    it('should redirect students away from /admin', async () => {
      mockValidSession('student')

      const request = createRequest('/admin', {
        cookies: { session_token: 'valid-token' },
      })

      const { middleware } = await import('@/middleware')
      const response = await middleware(request)

      expect(response.status).toBe(307)
      // Students redirect to home page, not login
      expect(response.headers.get('location')).toMatch(/\/$/)
    })

    it('should redirect students away from /admin/* routes', async () => {
      mockValidSession('student')

      const adminRoutes = ['/admin/sessions', '/admin/results', '/admin/users']

      const { middleware } = await import('@/middleware')

      for (const route of adminRoutes) {
        const request = createRequest(route, {
          cookies: { session_token: 'valid-token' },
        })
        const response = await middleware(request)

        expect(response.status).toBe(307)
        expect(response.headers.get('location')).toMatch(/\/$/)
      }
    })
  })

  describe('Admin API Routes', () => {
    it('should return 401 for /api/admin/* without token', async () => {
      const request = createRequest('/api/admin/sessions')

      const { middleware } = await import('@/middleware')
      const response = await middleware(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toContain('Authentication required')
    })

    it('should return 401 for /api/admin/* with invalid token', async () => {
      mockJwtVerify.mockRejectedValue(new Error('Invalid token'))

      const request = createRequest('/api/admin/sessions', {
        cookies: { session_token: 'invalid-token' },
      })

      const { middleware } = await import('@/middleware')
      const response = await middleware(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toContain('Invalid')
    })

    it('should return 403 for /api/admin/* as student', async () => {
      mockValidSession('student')

      const request = createRequest('/api/admin/sessions', {
        cookies: { session_token: 'valid-token' },
      })

      const { middleware } = await import('@/middleware')
      const response = await middleware(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('permissions')
    })

    it('should allow teacher access to /api/admin/*', async () => {
      mockValidSession('teacher')

      const request = createRequest('/api/admin/sessions', {
        cookies: { session_token: 'valid-token' },
      })

      const { middleware } = await import('@/middleware')
      const response = await middleware(request)

      expect(response.status).not.toBe(401)
      expect(response.status).not.toBe(403)
    })
  })

  describe('Training Page (/) - Authentication', () => {
    it('should redirect to login when accessing / without token', async () => {
      const request = createRequest('/')

      const { middleware } = await import('@/middleware')
      const response = await middleware(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/login')
    })

    it('should allow access to / with valid student token', async () => {
      mockValidSession('student')

      const request = createRequest('/', {
        cookies: { session_token: 'valid-token' },
      })

      const { middleware } = await import('@/middleware')
      const response = await middleware(request)

      expect(response.status).not.toBe(307)
      expect(response.status).not.toBe(401)
    })

    it('should allow access to / with valid teacher token', async () => {
      mockValidSession('teacher')

      const request = createRequest('/', {
        cookies: { session_token: 'valid-token' },
      })

      const { middleware } = await import('@/middleware')
      const response = await middleware(request)

      expect(response.status).not.toBe(307)
    })
  })

  describe('Outsider Approval Status', () => {
    it('should redirect pending outsider to /pending-approval on admin routes', async () => {
      mockValidSession('teacher', false) // Non-LTI teacher

      // Mock pending outsider profile
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            registration_type: 'outsider',
            approval_status: 'pending',
          },
          error: null,
        }),
      })

      const request = createRequest('/admin', {
        cookies: { session_token: 'valid-token' },
      })

      const { middleware } = await import('@/middleware')
      const response = await middleware(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/pending-approval')
    })

    it('should redirect rejected outsider to /login with error', async () => {
      mockValidSession('teacher', false)

      // Mock rejected outsider profile
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            registration_type: 'outsider',
            approval_status: 'rejected',
          },
          error: null,
        }),
      })

      const request = createRequest('/admin', {
        cookies: { session_token: 'valid-token' },
      })

      const { middleware } = await import('@/middleware')
      const response = await middleware(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/login')
      expect(response.headers.get('location')).toContain('error=rejected')
    })

    it('should clear session cookie for rejected outsider', async () => {
      mockValidSession('teacher', false)

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            registration_type: 'outsider',
            approval_status: 'rejected',
          },
          error: null,
        }),
      })

      const request = createRequest('/admin', {
        cookies: { session_token: 'valid-token' },
      })

      const { middleware } = await import('@/middleware')
      const response = await middleware(request)

      const cookies = response.cookies.getAll()
      const sessionCookie = cookies.find((c) => c.name === 'session_token')

      expect(sessionCookie?.value).toBe('')
    })

    it('should allow approved outsider access to admin', async () => {
      mockValidSession('teacher', false)

      // Mock approved outsider profile
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            registration_type: 'outsider',
            approval_status: 'approved',
          },
          error: null,
        }),
      })

      const request = createRequest('/admin', {
        cookies: { session_token: 'valid-token' },
      })

      const { middleware } = await import('@/middleware')
      const response = await middleware(request)

      expect(response.status).not.toBe(307)
    })

    it('should bypass outsider check for LTI users', async () => {
      mockValidSession('teacher', true) // LTI teacher

      // Even if this returns pending, LTI users should bypass
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            registration_type: 'outsider',
            approval_status: 'pending',
          },
          error: null,
        }),
      })

      const request = createRequest('/admin', {
        cookies: { session_token: 'valid-token' },
      })

      const { middleware } = await import('@/middleware')
      const response = await middleware(request)

      // LTI users bypass outsider check entirely
      expect(response.status).not.toBe(307)
    })

    it('should return 403 for pending outsider on API routes', async () => {
      mockValidSession('teacher', false)

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            registration_type: 'outsider',
            approval_status: 'pending',
          },
          error: null,
        }),
      })

      const request = createRequest('/api/admin/sessions', {
        cookies: { session_token: 'valid-token' },
      })

      const { middleware } = await import('@/middleware')
      const response = await middleware(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('pending')
    })
  })

  describe('Training Page - Outsider Status', () => {
    it('should redirect pending outsider from / to /pending-approval', async () => {
      mockValidSession('student', false)

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            registration_type: 'outsider',
            approval_status: 'pending',
          },
          error: null,
        }),
      })

      const request = createRequest('/', {
        cookies: { session_token: 'valid-token' },
      })

      const { middleware } = await import('@/middleware')
      const response = await middleware(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/pending-approval')
    })

    it('should allow approved outsider access to /', async () => {
      mockValidSession('student', false)

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            registration_type: 'outsider',
            approval_status: 'approved',
          },
          error: null,
        }),
      })

      const request = createRequest('/', {
        cookies: { session_token: 'valid-token' },
      })

      const { middleware } = await import('@/middleware')
      const response = await middleware(request)

      expect(response.status).not.toBe(307)
    })
  })
})
