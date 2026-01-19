'use client'

/**
 * Email Verified Page
 *
 * Shown to outsiders after they verify their email address.
 * Informs them to wait for admin approval before they can sign in.
 */

import Image from 'next/image'
import Link from 'next/link'
import { useTheme } from '../context/ThemeContext'
import { CheckCircle, Mail, Clock, ArrowLeft } from 'lucide-react'

export default function EmailVerifiedPage() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 ${isDark ? 'bg-[#000000]' : 'bg-gray-100'}`}>

      {/* Content Card */}
      <div className="rounded-xl grid md:grid-cols-12 w-[947px] max-w-[947px] min-h-[500px] border-[1px] border-gray-200 dark:border-gray-600 bg-[#D9D9D9] dark:bg-[#000000]">
        <div className={`md:col-span-7 col-span-12 px-6 py-12 md:px-20 md:py-16 md:rounded-l-xl rounded-t-xl rounded-b-xl md:rounded-br-none md:rounded-t-none flex flex-col justify-center ${isDark ? 'bg-[#000000]' : 'bg-[#D9D9D9]'}`}>
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isDark ? 'bg-green-500/20' : 'bg-green-500/10'}`}>
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
          </div>

          <h1 className={`text-2xl font-semibold text-center mb-4 ${isDark ? 'text-white' : 'text-black'}`}>
            Email Verified Successfully!
          </h1>

          <div className={`text-center space-y-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            <p>
              Thank you for verifying your email address.
            </p>
            <p>
              Your account is now <span className="font-semibold text-amber-500">awaiting admin approval</span>.
            </p>
            <p className="text-sm">
              You will receive an email notification once your account has been approved.
            </p>
          </div>

          {/* Info Box */}
          <div className={`mt-8 p-4 rounded-lg ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-gray-200 border border-gray-300'}`}>
            <h3 className={`font-medium mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              What happens next?
            </h3>
            <ul className={`text-sm space-y-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              <li className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-[#39BEAE] mt-0.5 flex-shrink-0" />
                <span>An administrator will review your registration request</span>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-[#39BEAE] mt-0.5 flex-shrink-0" />
                <span>Once approved, you&apos;ll receive an email confirmation</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-[#39BEAE] mt-0.5 flex-shrink-0" />
                <span>You can then sign in and access the training platform</span>
              </li>
            </ul>
          </div>

          {/* Spam Notice */}
          <div className={`mt-4 p-3 rounded-lg ${isDark ? 'bg-amber-900/20 border border-amber-700/50' : 'bg-amber-50 border border-amber-200'}`}>
            <p className={`text-sm flex items-start gap-2 ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
              <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                <strong>Tip:</strong> Please also check your spam/junk folder for the approval email.
              </span>
            </p>
          </div>

          {/* Back to Login Link */}
          <div className="mt-8 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-[#39BEAE] hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
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
