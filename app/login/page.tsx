'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { useTheme } from '../context/ThemeContext'
import { sessionService } from '@/app/services'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnUrl = searchParams.get('returnUrl') || '/dashboard'
  const { theme, toggleTheme } = useTheme()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Use sessionService for login
      const result = await sessionService.login(email, password)

      if (!result.success) {
        setError(result.error)
        return
      }

      // Redirect to the appropriate dashboard
      router.push(result.data.redirectUrl || returnUrl)
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const isDark = theme === 'dark'

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>

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
        <div className="rounded-xl grid md:grid-cols-12 w-[947px] max-w-[947px] min-h-[611px]">
          <div className={`md:col-span-7 col-span-12 px-6 py-10 md:px-20 md:py-20 md:rounded-l-xl rounded-t-xl rounded-b-xl md:rounded-br-none md:rounded-t-none ${isDark ? 'bg-gray-800' : 'bg-[#D9D9D9]'}`}>
             <h2 className={`text-xl font-semibold mb-6 ${isDark ? 'text-white' : 'text-black'}`}>Sign In</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 md:pr-20">
             <div className='my-6'>
              <input
                type="text"
                id="name"
                className={`w-full px-8 py-2 border-2  rounded-md focus:outline-none focus:ring-1 ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-gray-500' : 'bg-[#D9D9D9] border-[#848484] text-black placeholder-gray-900 focus:ring-gray-800'}`}
                placeholder="Name"
                required
              />
            </div>
            <div className='my-6'>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-8 py-2 border-2 rounded-md focus:outline-none focus:ring-1 ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-gray-500' : 'bg-[#D9D9D9] border-[#848484] text-black placeholder-gray-900 focus:ring-gray-800'}`}
                placeholder="Email"
                required
              />
            </div>

            <div className='my-6'>

              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-8 py-2 border-2 rounded-md focus:outline-none focus:ring-1 ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-gray-500' : 'bg-[#D9D9D9] border-[#848484] text-black placeholder-gray-900 focus:ring-gray-800'}`}
                placeholder="Password"
                required
              />
            </div>

            <div className='flex justify-between'>
              <button
                type="submit"
                disabled={loading}
                className="mr-4 py-2 px-10 bg-[#39BEAE] rounded-[20px] hover:bg-gray-100 hover:text-black disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-small transition-colors"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
              <button
                type="button"
                className={`py-1 px-10 border border-[#39BEAE] rounded-[20px] hover:bg-gray-100 hover:text-black disabled:bg-blue-800 disabled:cursor-not-allowed font-small transition-colors ${isDark ? 'text-white' : 'text-black'}`}
              >
                Sign Up
              </button>

            </div>
          </form>

          </div>
           <div className='col-span-5 hidden md:block'>
            <div className='grid grid-rows-8 bg-[#0D1D40] rounded-r-xl overflow-hidden h-full w-full'>
              <div className='row-span-6 bg-[#0D1D40] pt-40'>
                <div className='w-[130px] rounded-full h-[130px] bg-[#39BEAE] mx-auto'></div>
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
