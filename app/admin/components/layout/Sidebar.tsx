'use client'

/**
 * Sidebar Component
 *
 * Navigation sidebar for the teacher dashboard.
 * Uses global theme classes - no isDark checks needed.
 * Responsive: slides in on mobile, fixed on desktop.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  BarChart3,
  Play,
  LogOut,
  X,
  Wrench,
  UserCheck,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Sessions', href: '/admin/sessions', icon: Users },
  { label: 'Users', href: '/admin/users', icon: UserCheck },
  { label: 'Questionnaires', href: '/admin/questionnaires', icon: ClipboardList },
  { label: 'Fittings', href: '/admin/fittings', icon: Wrench },
  { label: 'Results', href: '/admin/results', icon: BarChart3 },
]

const SECONDARY_ITEMS: NavItem[] = [
  // { label: 'Settings', href: '/admin/settings', icon: Settings },
]

interface SidebarProps {
  onLogout: () => void
  userName?: string
  userRole?: string
  isOpen?: boolean
  onClose?: () => void
  isLti?: boolean // Hide logout for LTI users (they should return via LMS)
}

export function Sidebar({
  onLogout,
  userName = 'Teacher',
  userRole = 'Instructor',
  isOpen = false,
  onClose,
  isLti = true,
}: SidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  const handleNavClick = () => {
    // Close sidebar on mobile after navigation
    if (onClose && window.innerWidth < 1024) {
      onClose()
    }
  }

  return (
    <aside
      className={`
        fixed left-0 top-0 h-full w-64 flex flex-col z-40
        theme-bg-sidebar border-r theme-border
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}
    >
      {/* Logo Section */}
      <div className="p-4 md:p-6 border-b theme-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="font-semibold theme-text-primary">OP Skillsim</h1>
            <span className="theme-text-tertiary text-xs">Teacher Portal</span>
          </div>
        </div>
        {/* Close button - mobile only */}
        <button
          onClick={onClose}
          className="p-2 rounded-lg theme-btn-ghost lg:hidden"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleNavClick}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                ${active
                  ? 'bg-white/40 text-black border-l-2 border-gray-100'
                  : 'theme-text-tertiary hover:bg-white/30'
                }
              `}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}

        {/* Demo Simulation Button */}
        <Link
          href="/"
          onClick={handleNavClick}
          className="flex items-center gap-3 px-4 py-3 rounded-lg theme-text-accent hover:bg-white/30 transition-all mt-4"
        >
          <Play className="w-5 h-5 flex-shrink-0" />
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
              onClick={handleNavClick}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                ${active
                  ? 'theme-bg-brand-muted theme-text-brand'
                  : 'theme-text-tertiary theme-bg-hover'
                }
              `}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}

        {/* Only show logout button for non-LTI users (test users from login page) */}
        {!isLti && (
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all theme-text-tertiary hover:text-red-400 hover:bg-red-400/10"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">Logout</span>
          </button>
        )}
      </div>

      {/* User Profile Section */}
      <div className="p-4 border-t theme-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center theme-bg-tertiary flex-shrink-0">
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
