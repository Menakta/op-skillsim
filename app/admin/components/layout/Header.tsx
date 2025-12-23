'use client'

/**
 * Header Component
 *
 * Top header bar for the teacher dashboard.
 * Uses global theme classes - no isDark checks needed.
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
    <header className="h-16 border-b flex items-center justify-between px-6 theme-bg-header theme-border">
      <div className="flex items-center gap-4">
        {showMenuButton && (
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg transition-colors lg:hidden theme-btn-ghost"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-xl font-semibold theme-text-primary">{title}</h1>
          {subtitle && <p className="text-sm theme-text-muted">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-4">
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
