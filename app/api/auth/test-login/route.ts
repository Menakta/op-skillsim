import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/app/lib/logger'
import { signToken } from '@/app/auth'

// Hardcoded test users - in production, use a database
const TEST_USERS = [
  {
    email: 'test@opskillsim.com',
    password: 'TestUser2024!',
    userId: 'test-user-001',
    name: 'Test User'
  },
  {
    email: 'demo@opskillsim.com',
    password: 'DemoUser2024!',
    userId: 'demo-user-001',
    name: 'Demo User'
  }
]

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body

    logger.info({ email }, 'Test login attempt')

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find matching test user
    const user = TEST_USERS.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    )

    if (!user) {
      logger.warn({ email }, 'Test login failed - invalid credentials')
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Generate JWT token
    const token = signToken(user.userId)

    // Set HttpOnly cookie
    const response = NextResponse.json({
      status: 'ok',
      user: {
        id: user.userId,
        email: user.email,
        name: user.name
      }
    })

    response.cookies.set('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 20 * 60 // 20 minutes to match JWT expiry
    })

    logger.info({ userId: user.userId, email: user.email }, 'Test login successful')
    return response
  } catch (err) {
    logger.error({ error: err }, 'Test login error')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
