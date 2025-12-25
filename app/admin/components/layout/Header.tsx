'use client'

/**
 * Header Component
 *
 * Top header bar for the teacher dashboard.
 * Uses global theme classes - no isDark checks needed.
 * Responsive with hamburger menu on mobile.
 */

import { Bell, Menu, Sun, Moon } from 'lucide-react'
import { useTheme } from '@/app/context/ThemeContext'

interface HeaderProps {
  title: string
  subtitle?: string
  onMenuClick?: () => void
  showMenuButton?: boolean
}

export function Header({ title, subtitle, onMenuClick, showMenuButton = false }: HeaderProps) {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="h-14 md:h-16 border-b flex items-center justify-between px-4 md:px-6 theme-bg-header border-b-black sticky top-0 z-20">
      <div className="flex items-center gap-3 md:gap-4 min-w-0">
        {/* Hamburger menu - visible on mobile only */}
        {showMenuButton && (
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg transition-colors theme-btn-ghost lg:hidden flex-shrink-0"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-lg md:text-xl font-semibold theme-text-primary truncate">{title}</h1>
          {subtitle && <p className="text-xs md:text-sm theme-text-muted truncate hidden sm:block">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg transition-colors theme-btn-ghost"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg transition-colors theme-btn-ghost">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
      </div>
    </header>
  )
}
