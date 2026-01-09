'use client'

/**
 * Login Page
 *
 * Simple email/password login for users coming from outside LTI.
 * - Students: Can do training but data won't be saved
 * - Teachers/Admins: Can view admin panel in read-only mode
 */

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useTheme } from '../context/ThemeContext'

export default function LoginPage() {
  const { theme, toggleTheme } = useTheme()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [redirectPath, setRedirectPath] = useState<string | null>(null)

  // Get redirect path from URL params
  useEffect(() => {
    const redirect = searchParams.get('redirect')
    if (redirect) {
      setRedirectPath(redirect)
    }
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Use simple-login API for non-LTI authentication
      const response = await fetch('/api/auth/simple-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || 'Login failed')
        setLoading(false)
        return
      }

      // Save user info to localStorage (including isLti flag)
      if (data.user) {
        localStorage.setItem('user', JSON.stringify({
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role,
          isLti: false, // Mark as non-LTI user
        }))
        localStorage.setItem('userRole', data.user.role)
        localStorage.setItem('isLti', 'false')
      }

      // Small delay to ensure cookie is set before redirect
      await new Promise(resolve => setTimeout(resolve, 100))

      // Redirect based on role or to the requested path
      if (redirectPath) {
        // If there's a redirect path, go there (unless it's /admin for students)
        if (data.user.role === 'student' && redirectPath.startsWith('/admin')) {
          window.location.href = '/'
        } else {
          window.location.href = redirectPath
        }
      } else if (data.user.role === 'student') {
        window.location.href = '/'
      } else if (data.user.role === 'teacher' || data.user.role === 'admin') {
        window.location.href = '/admin'
      } else {
        window.location.href = '/'
      }
    } catch (err) {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  const isDark = theme === 'dark'

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

        {/* Login Form */}
        <div className="rounded-xl grid md:grid-cols-12 w-[947px] max-w-[947px] min-h-[611px] border-[1px] border-gray-200 dark:border-gray-600 bg-[#D9D9D9] dark:bg-[#000000]">
          <div className={`md:col-span-7 col-span-12 px-6 py-10 md:px-20 md:py-20 md:rounded-l-xl rounded-t-xl rounded-b-xl md:rounded-br-none md:rounded-t-none ${isDark ? 'bg-[#000000]' : 'bg-[#D9D9D9]'}`}>
             <h2 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-black'}`}>Sign In</h2>

             {/* Demo Mode Notice */}
             {/* <div className={`mb-4 p-3 rounded-lg ${isDark ? 'bg-yellow-900/30 border border-yellow-700/50' : 'bg-yellow-100 border border-yellow-300'}`}>
               <p className={`text-xs ${isDark ? 'text-yellow-300' : 'text-yellow-800'}`}>
                 <strong>Demo Mode:</strong> Data will not be saved. For full access, use your LMS.
               </p>
             </div> */}

             {/* Demo Credentials */}
             {/* <div className={`mb-6 p-3 rounded-lg ${isDark ? 'bg-gray-700/50 border border-gray-600' : 'bg-gray-200 border border-gray-300'}`}>
               <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Demo Credentials:</p>
               <div className={`text-xs space-y-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                 <p><span className="font-medium">Student:</span> student@demo.com / student123</p>
                 <p><span className="font-medium">Teacher:</span> teacher@demo.com / teacher123</p>
                 <p><span className="font-medium">Admin:</span> admin@demo.com / admin123</p>
               </div>
             </div> */}

          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 md:pr-20">
            <div className='my-6'>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-8 py-2 border-2 rounded-md focus:outline-none focus:ring-1 bg-[#FFFFFF] border-[#848484] text-black placeholder-gray-900 focus:ring-gray-800`}
                placeholder="Email"
                required
              />
            </div>

            <div className='my-6 relative'>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-8 py-2 pr-12 border-2 rounded-md focus:outline-none focus:ring-1 bg-[#FFFFFF] ${isDark ? 'text-black placeholder-gray-800 focus:ring-gray-500' : 'bg-[#D9D9D9] border-[#848484] text-black placeholder-gray-900 focus:ring-gray-800'}`}
                placeholder="Password"
                required
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

            <div className='flex justify-between'>
              <button
                type="submit"
                disabled={loading}
                className="mr-4 py-2 px-10 bg-[#39BEAE] rounded-[20px] hover:bg-green-600 hover:text-black disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-small transition-colors"
              >
                {loading ? 'Signing in' : 'Sign In'}
              </button>
            </div>

            <p className={`text-sm text-center mt-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-[#39BEAE] hover:underline">
                Register
              </Link>
            </p>
          </form>

          </div>
           <div className={'col-span-5 hidden md:block'}>
            <div className={`grid grid-rows-8 rounded-r-xl overflow-hidden h-full w-full ${isDark ? 'bg-[#44CF8A]' : 'bg-[#0D1D40]' }`}>
              <div className='row-span-6  pt-40'>
                <div className='w-[130px] rounded-full h-[130px] bg-[#44CF8A] mx-auto border-1 border-white'></div>
                <h1 className='text-white text-2xl font-semibold text-center mt-5 text-[40px]'>OP Skillsim</h1>
                </div>
              <div className='row-span-2 flex flex-col justify-center items-center'>
                <Image
                src={'/logos/Main_Logo.png'}
                width={200}
                height={50}
                alt='OP-Skillsim Logo'
                />
              </div>
            </div>
          </div>
        </div>
    </div>
  )
}
