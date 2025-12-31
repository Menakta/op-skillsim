/**
 * Database layer - Mock Supabase implementation
 *
 * This module provides a mock database layer that simulates Supabase functionality.
 * When you have a real Supabase account, replace the mock implementations with actual
 * Supabase client calls.
 *
 * To switch to real Supabase:
 * 1. Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables
 * 2. Uncomment the Supabase client initialization below
 * 3. Replace mock function implementations with actual Supabase queries
 */

import { logger } from './logger'

// ============================================================================
// Types
// ============================================================================

export type UserRole = 'student' | 'teacher' | 'admin'
export type AuthProvider = 'lti' | 'email'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  provider: AuthProvider
  provider_user_id?: string // LTI user_id from iQualify
  lti_context_id?: string   // Course/context from LTI
  created_at: string
  updated_at: string
}

export interface ExternalUser extends User {
  password_hash: string
}

export interface LtiPayload {
  user_id: string
  lis_person_name_full?: string
  lis_person_name_given?: string
  lis_person_name_family?: string
  lis_person_contact_email_primary?: string
  roles: string
  context_id?: string
  context_title?: string
  resource_link_id: string
  resource_link_title?: string
  tool_consumer_instance_guid?: string
  tool_consumer_info_product_family_code?: string
}

// ============================================================================
// Mock Database Storage (In-Memory)
// Replace with Supabase tables in production
// ============================================================================

// Mock LTI users storage
const ltiUsers: Map<string, User> = new Map()

// Mock external users storage with pre-seeded test accounts
const externalUsers: Map<string, ExternalUser> = new Map([
  ['demo1@example.com', {
    id: 'ext-user-001',
    email: 'demo1@example.com',
    name: 'Demo User',
    role: 'student',
    provider: 'email',
    password_hash: 'Demo123!', // In production, use bcrypt
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }],
  ['demo2@example.com', {
    id: 'ext-user-002',
    email: 'demo2@example.com',
    name: 'Teacher',
    role: 'teacher',
    provider: 'email',
    password_hash: 'Teacher123!', // In production, use bcrypt
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }],
  ['admin@example.com', {
    id: 'ext-user-003',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
    provider: 'email',
    password_hash: 'Admin123!', // In production, use bcrypt
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }]
])

// ============================================================================
// Supabase Client (Uncomment when ready)
// ============================================================================

// import { createClient } from '@supabase/supabase-js'
//
// const supabaseUrl = process.env.SUPABASE_URL
// const supabaseKey = process.env.SUPABASE_ANON_KEY
//
// if (!supabaseUrl || !supabaseKey) {
//   logger.warn('Supabase credentials not configured, using mock database')
// }
//
// export const supabase = supabaseUrl && supabaseKey
//   ? createClient(supabaseUrl, supabaseKey)
//   : null

// ============================================================================
// User Management Functions
// ============================================================================

/**
 * Find or create a user from LTI launch payload
 */
export async function findOrCreateLtiUser(payload: LtiPayload): Promise<User> {
  const ltiUserId = payload.user_id
  const contextId = payload.context_id || 'default'
  const compositeKey = `${ltiUserId}:${contextId}`

  // Check if user exists
  const existingUser = ltiUsers.get(compositeKey)
  if (existingUser) {
    logger.info({ userId: existingUser.id }, 'Found existing LTI user')
    return existingUser
  }

  // Determine role from LTI roles claim
  const role = determineLtiRole(payload.roles)

  // Create name from LTI payload
  const name = payload.lis_person_name_full ||
    [payload.lis_person_name_given, payload.lis_person_name_family].filter(Boolean).join(' ') ||
    `User ${ltiUserId.slice(0, 8)}`

  // Create new user
  const newUser: User = {
    id: `lti-${crypto.randomUUID()}`,
    email: payload.lis_person_contact_email_primary || `${ltiUserId}@lti.local`,
    name,
    role,
    provider: 'lti',
    provider_user_id: ltiUserId,
    lti_context_id: contextId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  ltiUsers.set(compositeKey, newUser)
  logger.info({ userId: newUser.id, role: newUser.role }, 'Created new LTI user')

  return newUser
}

/**
 * Determine user role from LTI roles string
 * LTI 1.0 roles are URN-based, e.g., "urn:lti:role:ims/lis/Instructor"
 */
function determineLtiRole(rolesString: string): UserRole {
  const roles = rolesString.toLowerCase()

  // Check for instructor/teacher roles
  if (
    roles.includes('instructor') ||
    roles.includes('teacher') ||
    roles.includes('contentdeveloper') ||
    roles.includes('administrator') ||
    roles.includes('admin')
  ) {
    return 'teacher'
  }

  // Check for admin roles
  if (roles.includes('sysadmin') || roles.includes('systemadministrator')) {
    return 'admin'
  }

  // Default to student
  return 'student'
}

/**
 * Find external user by email
 */
export async function findExternalUserByEmail(email: string): Promise<ExternalUser | null> {
  const user = externalUsers.get(email.toLowerCase())
  return user || null
}

/**
 * Validate external user password
 * In production, use bcrypt.compare()
 */
export async function validateExternalUserPassword(
  user: ExternalUser,
  password: string
): Promise<boolean> {
  // TODO: Replace with bcrypt.compare(password, user.password_hash) in production
  return user.password_hash === password
}

/**
 * Find user by ID (works for both LTI and external users)
 */
export async function findUserById(userId: string): Promise<User | null> {
  // Check LTI users
  for (const user of ltiUsers.values()) {
    if (user.id === userId) {
      return user
    }
  }

  // Check external users
  for (const user of externalUsers.values()) {
    if (user.id === userId) {
      return user
    }
  }

  return null
}

/**
 * Get all external users (for admin purposes)
 */
export async function getAllExternalUsers(): Promise<Omit<ExternalUser, 'password_hash'>[]> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return Array.from(externalUsers.values()).map(({ password_hash, ...user }) => user)
}

// ============================================================================
// Supabase Schema Reference (for when you create the real database)
// ============================================================================

/*
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
  provider TEXT NOT NULL CHECK (provider IN ('lti', 'email')),
  provider_user_id TEXT,
  lti_context_id TEXT,
  password_hash TEXT, -- Only for email provider
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for LTI lookups
CREATE INDEX idx_users_lti ON users (provider_user_id, lti_context_id) WHERE provider = 'lti';

-- Index for email lookups
CREATE INDEX idx_users_email ON users (email);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

-- Policy: Admin can read all data
CREATE POLICY "Admin can read all data" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'
    )
  );
*/
