'use client'

/**
 * Sidebar Component
 *
 * Navigation sidebar for the teacher dashboard.
 * Uses global theme classes - no isDark checks needed.
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

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Students', href: '/admin/students', icon: Users },
  { label: 'Questionnaires', href: '/admin/questionnaires', icon: ClipboardList },
  { label: 'Results', href: '/admin/results', icon: BarChart3 },
]

const SECONDARY_ITEMS: NavItem[] = [
  { label: 'Settings', href: '/admin/settings', icon: Settings },
]

interface SidebarProps {
  onLogout: () => void
  userName?: string
  userRole?: string
}

export function Sidebar({ onLogout, userName = 'Teacher', userRole = 'Instructor' }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-64 flex flex-col z-40 theme-bg-sidebar border-r theme-border">
      {/* Logo Section */}
      <div className="p-6 border-b theme-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#39BEAE] flex items-center justify-center">
            <span className="text-white font-bold text-lg">OP</span>
          </div>
          <div>
            <h1 className="font-semibold theme-text-primary">OP Skillsim</h1>
            <span className="theme-text-brand text-xs">Teacher Portal</span>
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
                  ? 'theme-bg-brand-muted theme-text-brand border-l-2 border-purple-400'
                  : 'theme-text-tertiary theme-bg-hover'
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
          className="flex items-center gap-3 px-4 py-3 rounded-lg theme-text-accent hover:theme-bg-accent-muted transition-all mt-4"
        >
          <Play className="w-5 h-5" />
          <span className="font-medium">Launch Demo</span>
        </Link>
      </nav>

      {/* Secondary Navigation */}
      <div className="p-4 border-t theme-border">
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
                  ? 'theme-bg-brand-muted theme-text-brand'
                  : 'theme-text-tertiary theme-bg-hover'
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
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all theme-text-tertiary hover:text-red-400 hover:bg-red-400/10"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>

      {/* User Profile Section */}
      <div className="p-4 border-t theme-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center theme-bg-tertiary">
            <span className="font-medium text-sm theme-text-primary">
              {userName.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate theme-text-primary">{userName}</p>
            <p className="text-xs theme-text-muted">{userRole}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
