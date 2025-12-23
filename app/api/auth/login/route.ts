/**
 * Teacher/Admin Login Endpoint
 *
 * Simple Supabase authentication - no session management.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/app/lib/logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    logger.info({ email }, 'Login attempt')

    // Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !authData.user) {
      logger.warn({ email, error: authError?.message }, 'Login failed')
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Get teacher/admin profile
    const { data: profile, error: profileError } = await supabase
      .from('teacher_profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !profile) {
      logger.warn({ email }, 'Not a teacher/admin')
      return NextResponse.json(
        { error: 'Access denied. Teacher or admin account required.' },
        { status: 403 }
      )
    }

    logger.info({ userId: authData.user.id, role: profile.role }, 'Login successful')

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name: profile.full_name,
        role: profile.role,
      },
    })
  } catch (error) {
    logger.error({ error }, 'Login error')
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}
