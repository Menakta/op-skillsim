'use client'

/**
 * Header Component
 *
 * Top header bar for the teacher dashboard.
 */

import { Bell, Menu } from 'lucide-react'

interface HeaderProps {
  title: string
  subtitle?: string
  onMenuClick?: () => void
  showMenuButton?: boolean
}

export function Header({ title, subtitle, onMenuClick, showMenuButton = false }: HeaderProps) {
  return (
    <header className="h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        {showMenuButton && (
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-xl font-semibold text-white">{title}</h1>
          {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
      </div>
    </header>
  )
}
