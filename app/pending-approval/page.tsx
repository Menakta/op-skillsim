'use client'

/**
 * Pending Approval Page
 *
 * Shown to outsiders after successful registration.
 * Explains that their account is awaiting admin approval.
 */

import Image from 'next/image'
import Link from 'next/link'
import { useTheme } from '../context/ThemeContext'

export default function PendingApprovalPage() {
  const { theme, toggleTheme } = useTheme()
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

      {/* Content Card */}
      <div className="rounded-xl grid md:grid-cols-12 w-[947px] max-w-[947px] min-h-[500px] border-[1px] border-gray-200 dark:border-gray-600 bg-[#D9D9D9] dark:bg-[#000000]">
        <div className={`md:col-span-7 col-span-12 px-6 py-12 md:px-20 md:py-16 md:rounded-l-xl rounded-t-xl rounded-b-xl md:rounded-br-none md:rounded-t-none flex flex-col justify-center ${isDark ? 'bg-[#000000]' : 'bg-[#D9D9D9]'}`}>
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isDark ? 'bg-[#39BEAE]/20' : 'bg-[#39BEAE]/10'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-[#39BEAE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          <h1 className={`text-2xl font-semibold text-center mb-4 ${isDark ? 'text-white' : 'text-black'}`}>
            Registration Successful!
          </h1>

          <div className={`text-center space-y-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            <p>
              Thank you for registering with OP Skillsim.
            </p>
            <p>
              Your account is currently <span className="font-semibold text-amber-500">pending approval</span> by an administrator.
            </p>
            <p className="text-sm">
              You will receive an email notification once your account has been reviewed.
              This process typically takes 1-2 business days.
            </p>
          </div>

          {/* Info Box */}
          <div className={`mt-8 p-4 rounded-lg ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-gray-200 border border-gray-300'}`}>
            <h3 className={`font-medium mb-2 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              What happens next?
            </h3>
            <ul className={`text-sm space-y-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              <li className="flex items-start gap-2">
                <span className="text-[#39BEAE] mt-0.5">1.</span>
                An administrator will review your registration request
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#39BEAE] mt-0.5">2.</span>
                Once approved, you&apos;ll receive an email confirmation
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#39BEAE] mt-0.5">3.</span>
                You can then sign in and access the training platform
              </li>
            </ul>
          </div>

          {/* Back to Login Link */}
          <div className="mt-8 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-[#39BEAE] hover:underline"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Sign In
            </Link>
          </div>
        </div>

        {/* Right side branding */}
        <div className="col-span-5 hidden md:block">
          <div className={`grid grid-rows-8 rounded-r-xl overflow-hidden h-full w-full ${isDark ? 'bg-[#44CF8A]' : 'bg-[#0D1D40]'}`}>
            <div className="row-span-6 pt-28">
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
