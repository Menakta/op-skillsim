/**
 * System Admin Seeder
 *
 * Creates a default system administrator if no admin exists.
 * This admin cannot be deleted by anyone.
 *
 * Usage:
 *   npx ts-node scripts/seed-system-admin.ts
 *   or
 *   npm run seed:admin
 *
 * Environment variables required:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - SYSTEM_ADMIN_EMAIL (optional, defaults to admin@op-skillsim.local)
 *   - SYSTEM_ADMIN_PASSWORD (optional, defaults to random generated)
 */

import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Default system admin credentials
const DEFAULT_ADMIN_EMAIL = process.env.SYSTEM_ADMIN_EMAIL || 'admin@op-skillsim.local'
const DEFAULT_ADMIN_NAME = 'System Administrator'

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

function generateSecurePassword(): string {
  // Generate a secure random password
  const length = 16
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  const randomValues = randomBytes(length)
  let password = ''
  for (let i = 0; i < length; i++) {
    password += charset[randomValues[i] % charset.length]
  }
  return password
}

async function seedSystemAdmin() {
  console.log('🔧 System Admin Seeder')
  console.log('='.repeat(50))

  try {
    // Check if any system admin already exists
    const { data: existingSystemAdmin, error: checkError } = await supabase
      .from('user_profiles')
      .select('id, email, full_name')
      .eq('is_system_admin', true)
      .single()

    if (existingSystemAdmin) {
      console.log('✅ System admin already exists:')
      console.log(`   Email: ${existingSystemAdmin.email}`)
      console.log(`   Name: ${existingSystemAdmin.full_name}`)
      console.log('\n💡 No action needed.')
      return
    }

    // Check if we should use an existing admin
    const { data: existingAdmin } = await supabase
      .from('user_profiles')
      .select('id, email, full_name')
      .eq('role', 'admin')
      .limit(1)
      .single()

    if (existingAdmin) {
      // Promote existing admin to system admin
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ is_system_admin: true })
        .eq('id', existingAdmin.id)

      if (updateError) {
        throw new Error(`Failed to promote existing admin: ${updateError.message}`)
      }

      console.log('✅ Promoted existing admin to system admin:')
      console.log(`   Email: ${existingAdmin.email}`)
      console.log(`   Name: ${existingAdmin.full_name}`)
      return
    }

    // No admin exists - create new system admin
    console.log('📝 Creating new system admin...')

    const password = process.env.SYSTEM_ADMIN_PASSWORD || generateSecurePassword()

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: DEFAULT_ADMIN_EMAIL,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: DEFAULT_ADMIN_NAME,
        role: 'admin',
        registration_type: 'system',
      },
    })

    if (authError) {
      throw new Error(`Failed to create auth user: ${authError.message}`)
    }

    if (!authData.user) {
      throw new Error('Auth user creation returned no user')
    }

    // Create user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        email: DEFAULT_ADMIN_EMAIL,
        full_name: DEFAULT_ADMIN_NAME,
        role: 'admin',
        registration_type: 'outsider', // Use outsider type for direct login
        approval_status: 'approved',
        is_system_admin: true,
      })

    if (profileError) {
      // Rollback: delete auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id)
      throw new Error(`Failed to create user profile: ${profileError.message}`)
    }

    console.log('')
    console.log('✅ System admin created successfully!')
    console.log('='.repeat(50))
    console.log('📧 Email:', DEFAULT_ADMIN_EMAIL)
    console.log('🔑 Password:', password)
    console.log('='.repeat(50))
    console.log('')
    console.log('⚠️  IMPORTANT: Save these credentials securely!')
    console.log('   This admin account cannot be deleted.')
    console.log('')

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

// Run the seeder
seedSystemAdmin()
