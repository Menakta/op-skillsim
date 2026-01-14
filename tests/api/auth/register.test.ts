/**
 * Registration API Tests
 *
 * Tests for /api/auth/register endpoint
 * Covers:
 * - Input validation (email, password, fullName)
 * - Successful outsider registration
 * - Duplicate email handling
 * - Admin notification email
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/auth/register/route'

// =============================================================================
// Mocks
// =============================================================================

// Mock Supabase client
const mockSupabaseAuth = {
  signUp: vi.fn(),
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: mockSupabaseAuth,
  })),
}))

// Mock email service
const mockSendAdminNotificationEmail = vi.fn()

vi.mock('@/app/lib/email', () => ({
  sendAdminNotificationEmail: (data: object) => mockSendAdminNotificationEmail(data),
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

function createRequest(body: object): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// =============================================================================
// Tests
// =============================================================================

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: email notification succeeds
    mockSendAdminNotificationEmail.mockResolvedValue({ success: true })
  })

  describe('Input Validation', () => {
    it('should return 400 if email is missing', async () => {
      const request = createRequest({
        password: 'password123',
        fullName: 'Test User',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('required')
    })

    it('should return 400 if password is missing', async () => {
      const request = createRequest({
        email: 'test@example.com',
        fullName: 'Test User',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('required')
    })

    it('should return 400 if fullName is missing', async () => {
      const request = createRequest({
        email: 'test@example.com',
        password: 'password123',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('required')
    })

    it('should return 400 if password is too short', async () => {
      const request = createRequest({
        email: 'test@example.com',
        password: 'short',
        fullName: 'Test User',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('8 characters')
    })

    it('should return 400 for invalid email format', async () => {
      const request = createRequest({
        email: 'invalid-email',
        password: 'password123',
        fullName: 'Test User',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid email')
    })

    it('should accept valid email formats', async () => {
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: { id: 'new-user-id' }, session: null },
        error: null,
      })

      const validEmails = [
        'user@example.com',
        'user.name@example.com',
        'user+tag@example.com',
        'user@subdomain.example.com',
      ]

      for (const email of validEmails) {
        const request = createRequest({
          email,
          password: 'password123',
          fullName: 'Test User',
        })
        const response = await POST(request)
        // Should not fail on email validation
        expect(response.status).not.toBe(400)
      }
    })
  })

  describe('Successful Registration', () => {
    it('should register new user successfully', async () => {
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: { id: 'new-user-id' }, session: null },
        error: null,
      })

      const request = createRequest({
        email: 'newuser@example.com',
        password: 'password123',
        fullName: 'New User',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toContain('pending admin approval')
    })

    it('should pass correct metadata to Supabase signUp', async () => {
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: { id: 'new-user-id' }, session: null },
        error: null,
      })

      const request = createRequest({
        email: 'newuser@example.com',
        password: 'password123',
        fullName: 'New User',
      })
      await POST(request)

      expect(mockSupabaseAuth.signUp).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'password123',
        options: {
          data: {
            full_name: 'New User',
            registration_type: 'outsider',
            approval_status: 'pending',
            role: 'student',
          },
        },
      })
    })

    it('should send admin notification email on successful registration', async () => {
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: { id: 'new-user-id' }, session: null },
        error: null,
      })

      const request = createRequest({
        email: 'newuser@example.com',
        password: 'password123',
        fullName: 'New User',
      })
      await POST(request)

      expect(mockSendAdminNotificationEmail).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        fullName: 'New User',
      })
    })

    it('should succeed even if admin notification email fails', async () => {
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: { id: 'new-user-id' }, session: null },
        error: null,
      })
      mockSendAdminNotificationEmail.mockResolvedValue({
        success: false,
        error: 'Email service unavailable',
      })

      const request = createRequest({
        email: 'newuser@example.com',
        password: 'password123',
        fullName: 'New User',
      })
      const response = await POST(request)
      const data = await response.json()

      // Registration should still succeed
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should indicate if email confirmation is required', async () => {
      // Supabase returns no session when email confirmation is required
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: { id: 'new-user-id' }, session: null },
        error: null,
      })

      const request = createRequest({
        email: 'newuser@example.com',
        password: 'password123',
        fullName: 'New User',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(data.emailConfirmationRequired).toBe(true)
    })
  })

  describe('Duplicate Email Handling', () => {
    it('should return 409 if email already exists', async () => {
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: null },
        error: { message: 'User already registered' },
      })

      const request = createRequest({
        email: 'existing@example.com',
        password: 'password123',
        fullName: 'Existing User',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.success).toBe(false)
      expect(data.error).toContain('already exists')
    })
  })

  describe('Error Handling', () => {
    it('should return 400 for other Supabase errors', async () => {
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: null },
        error: { message: 'Password is too weak' },
      })

      const request = createRequest({
        email: 'newuser@example.com',
        password: 'password123',
        fullName: 'New User',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('weak')
    })

    it('should return 500 if Supabase returns no user', async () => {
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      })

      const request = createRequest({
        email: 'newuser@example.com',
        password: 'password123',
        fullName: 'New User',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })
  })
})
