'use client'

/**
 * Sidebar Component
 *
 * Navigation sidebar for the teacher dashboard.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  BarChart3,
  Settings,
  Play,
  LogOut,
} from 'lucide-react'
import Image from 'next/image'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard/teacher', icon: LayoutDashboard },
  { label: 'Students', href: '/dashboard/teacher/students', icon: Users },
  { label: 'Questionnaires', href: '/dashboard/teacher/questionnaires', icon: ClipboardList },
  { label: 'Results', href: '/dashboard/teacher/results', icon: BarChart3 },
]

const SECONDARY_ITEMS: NavItem[] = [
  { label: 'Settings', href: '/dashboard/teacher/settings', icon: Settings },
]

interface SidebarProps {
  onLogout: () => void
  userName?: string
  userRole?: string
}

export function Sidebar({ onLogout, userName = 'Teacher', userRole = 'Instructor' }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/dashboard/teacher') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-[#0D1D40] flex flex-col z-40">
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">OP</span>
          </div>
          <div>
            <h1 className="text-white font-semibold">OP Skillsim</h1>
            <span className="text-purple-400 text-xs">Teacher Portal</span>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                ${active
                  ? 'bg-purple-600/20 text-purple-400 border-l-2 border-purple-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}

        {/* Demo Simulation Button */}
        <Link
          href="/"
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#39BEAE] hover:bg-[#39BEAE]/10 transition-all mt-4"
        >
          <Play className="w-5 h-5" />
          <span className="font-medium">Launch Demo</span>
        </Link>
      </nav>

      {/* Secondary Navigation */}
      <div className="p-4 border-t border-gray-700/50">
        {SECONDARY_ITEMS.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                ${active
                  ? 'bg-purple-600/20 text-purple-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>

      {/* User Profile Section */}
      <div className="p-4 border-t border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
            <span className="text-white font-medium text-sm">
              {userName.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{userName}</p>
            <p className="text-gray-400 text-xs">{userRole}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
