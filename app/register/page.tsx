'use client'

/**
 * Registration Page for Outsiders
 *
 * Public registration for users outside the LTI system.
 * New accounts require admin approval before access is granted.
 * Admin is notified via email when new users register.
 */

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTheme } from '../context/ThemeContext'
import { validatePhoneNumber, formatToE164 } from '../lib/phoneValidation'

export default function RegisterPage() {
  const { theme, toggleTheme } = useTheme()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phoneError, setPhoneError] = useState<string | null>(null)

  const isDark = theme === 'dark'

  // Validate phone number on blur for immediate feedback
  function handlePhoneBlur() {
    if (phone.trim()) {
      const result = validatePhoneNumber(phone)
      if (!result.isValid) {
        setPhoneError(result.error || 'Invalid phone number')
      } else {
        setPhoneError(null)
      }
    } else {
      setPhoneError(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setPhoneError(null)

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    // Validate password strength
    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      setLoading(false)
      return
    }

    // Validate phone number using libphonenumber-js
    const phoneValidation = validatePhoneNumber(phone)
    if (!phoneValidation.isValid) {
      setPhoneError(phoneValidation.error || 'Invalid phone number')
      setLoading(false)
      return
    }

    // Format phone to E.164 for storage
    const formattedPhone = formatToE164(phone) || phone

    try {
      // Call the registration API endpoint
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName, phone: formattedPhone }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || 'Registration failed. Please try again.')
        setLoading(false)
        return
      }

      // Success - redirect to pending approval page
      router.push('/pending-approval')
    } catch (err) {
      console.error('Registration error:', err)
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 ${isDark ? 'bg-[#000000]' : 'bg-gray-100'}`}>
      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        aria-label="Toggle theme"
      >
        {isDark ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>

      {/* Registration Form */}
      <div className="rounded-xl grid md:grid-cols-12 w-[947px] max-w-[947px] min-h-[611px] border-[1px] border-gray-200 dark:border-gray-600 bg-[#D9D9D9] dark:bg-[#000000]">
        <div className={`md:col-span-7 col-span-12 px-6 py-8 md:px-20 md:py-12 md:rounded-l-xl rounded-t-xl rounded-b-xl md:rounded-br-none md:rounded-t-none ${isDark ? 'bg-[#000000]' : 'bg-[#D9D9D9]'}`}>
          <h2 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-black'}`}>Create Account</h2>
          <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Register for access to OP Skillsim training
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 md:pr-20">
            {/* Full Name */}
            <div>
              <input
                type="text"
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-8 py-2 border-2 rounded-md focus:outline-none focus:ring-1 bg-[#FFFFFF] border-[#848484] text-black placeholder-gray-500 focus:ring-gray-800"
                placeholder="Full Name"
                required
              />
            </div>

            {/* Email */}
            <div>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-8 py-2 border-2 rounded-md focus:outline-none focus:ring-1 bg-[#FFFFFF] border-[#848484] text-black placeholder-gray-500 focus:ring-gray-800"
                placeholder="Email"
                required
              />
            </div>

            {/* Phone Number */}
            <div>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value)
                  if (phoneError) setPhoneError(null) // Clear error on typing
                }}
                onBlur={handlePhoneBlur}
                className={`w-full px-8 py-2 border-2 rounded-md focus:outline-none focus:ring-1 bg-[#FFFFFF] text-black placeholder-gray-500 focus:ring-gray-800 ${
                  phoneError ? 'border-red-500' : 'border-[#848484]'
                }`}
                placeholder="Phone (e.g., +64 21 123 4567)"
                required
              />
              {phoneError && (
                <p className="mt-1 text-xs text-red-500">{phoneError}</p>
              )}
              <p className={`mt-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                Include country code (e.g., +64 for NZ, +1 for US)
              </p>
            </div>

            {/* Password */}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-8 py-2 pr-12 border-2 rounded-md focus:outline-none focus:ring-1 bg-[#FFFFFF] border-[#848484] text-black placeholder-gray-500 focus:ring-gray-800"
                placeholder="Password"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Confirm Password */}
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-8 py-2 pr-12 border-2 rounded-md focus:outline-none focus:ring-1 bg-[#FFFFFF] border-[#848484] text-black placeholder-gray-500 focus:ring-gray-800"
                placeholder="Confirm Password"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>

            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
              Password must be at least 8 characters long
            </p>

            {/* Submit Button */}
            <div className="flex flex-col gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-10 bg-[#39BEAE] rounded-[20px] hover:bg-[#2EA89A] disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium transition-colors"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>

              <p className={`text-sm text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Already have an account?{' '}
                <Link href="/login" className="text-[#39BEAE] hover:underline">
                  Sign In
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* Right side branding */}
        <div className="col-span-5 hidden md:block">
          <div className={`grid grid-rows-8 rounded-r-xl overflow-hidden h-full w-full ${isDark ? 'bg-[#44CF8A]' : 'bg-[#0D1D40]'}`}>
            <div className="row-span-6 pt-32">
              <div className="w-[130px] rounded-full h-[130px] bg-[#44CF8A] mx-auto border-1 border-white"></div>
              <h1 className="text-white text-2xl font-semibold text-center mt-5 text-[40px]">OP Skillsim</h1>
            </div>
            <div className="row-span-2 flex flex-col justify-center items-center">
              <Image
                src="/logos/Main_Logo.png"
                width={200}
                height={50}
                alt="OP-Skillsim Logo"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
