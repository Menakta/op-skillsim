/**
 * Supabase Admin Client
 *
 * Server-side client with service role key for admin operations.
 * Use this for operations that bypass RLS (Row Level Security).
 *
 * WARNING: Only use on server-side. Never expose service role key to client.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _supabaseAdmin: SupabaseClient | null = null

/**
 * Get the Supabase admin client with service role privileges.
 * Lazily initialized to avoid build-time errors.
 * Bypasses RLS for administrative operations.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (_supabaseAdmin) {
    return _supabaseAdmin
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
  }

  if (!serviceRoleKey) {
    console.warn('Missing SUPABASE_SERVICE_ROLE_KEY - admin operations will fail')
  }

  _supabaseAdmin = createClient(url, serviceRoleKey || '', {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return _supabaseAdmin
}

/**
 * @deprecated Use getSupabaseAdmin() instead for lazy initialization
 * This getter is provided for backward compatibility
 */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return getSupabaseAdmin()[prop as keyof SupabaseClient]
  },
})
