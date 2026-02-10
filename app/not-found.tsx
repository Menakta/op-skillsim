'use client'

/**
 * 404 Not Found Page
 *
 * Custom 404 page that matches the app's design system.
 * Displays when a user navigates to a non-existent route.
 */

import Link from 'next/link'
import Image from 'next/image'
import { Home, ArrowLeft, Search } from 'lucide-react'
import { useTheme } from './context/ThemeContext'

export default function NotFound() {
  const { theme } = useTheme()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 theme-bg-primary">
      {/* Logo */}
      <div className="mb-8">
        <Image
          src={theme === 'dark' ? '/logos/Main_Logo.png' : '/logos/Dark_logo.png'}
          alt="OP SkillSim Logo"
          width={180}
          height={40}
          priority
        />
      </div>

      {/* 404 Illustration */}
      <div className="relative mb-8">
        <div className="text-[150px] md:text-[200px] font-bold text-[#39BEAE]/10 select-none leading-none">
          404
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-[#39BEAE]/10 flex items-center justify-center">
            <Search className="w-12 h-12 md:w-16 md:h-16 text-[#39BEAE]" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="text-center max-w-md mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold theme-text-primary mb-3">
          Page Not Found
        </h1>
        <p className="theme-text-secondary mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Let&apos;s get you back on track.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#39BEAE] hover:bg-[#2EA89A] text-white font-medium rounded-lg transition-colors"
          >
            <Home className="w-5 h-5" />
            Go Home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-[#39BEAE] text-[#39BEAE] hover:bg-[#39BEAE]/10 font-medium rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
        </div>
      </div>

      {/* Helpful Links */}
      <div className="mt-12 text-center">
        <p className="theme-text-muted text-sm mb-4">Looking for something specific?</p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            href="/login"
            className="text-sm text-[#39BEAE] hover:underline"
          >
            Login
          </Link>
          <span className="theme-text-muted">|</span>
          <Link
            href="/register"
            className="text-sm text-[#39BEAE] hover:underline"
          >
            Register
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-center">
        <p className="theme-text-muted text-xs">
          Open Polytechnic Kuratini Tuwhera - OP SkillSim
        </p>
      </div>
    </div>
  )
}
