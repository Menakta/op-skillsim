'use client'

import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/app/context/ThemeContext'

// =============================================================================
// Component
// =============================================================================

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      className={`fixed top-4 left-4 z-40 w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-md border transition-all duration-200 ${
        isDark
          ? 'bg-black/70 hover:bg-black/80 text-white/80 hover:text-white border-white/10'
          : 'bg-white/90 hover:bg-white text-gray-700 hover:text-gray-900 border-gray-200 shadow-lg'
      }`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light Mode' : 'Dark Mode'}
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  )
}

export default ThemeToggle
