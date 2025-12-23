/**
 * Supabase Admin Client
 *
 * Server-side client with service role key for admin operations.
 * Use this for operations that bypass RLS (Row Level Security).
 *
 * WARNING: Only use on server-side. Never expose service role key to client.
 */

import { createClient } from '@supabase/supabase-js'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Missing SUPABASE_SERVICE_ROLE_KEY - admin operations will fail')
}

/**
 * Supabase admin client with service role privileges.
 * Bypasses RLS for administrative operations.
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
