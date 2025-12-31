'use client'

/**
 * DashboardLayout Component
 *
 * Main layout wrapper for all teacher/admin dashboard pages.
 * Uses global theme classes - no isDark checks needed.
 * Fully responsive with mobile sidebar toggle.
 */

import { type ReactNode, useEffect, useState } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

interface DashboardLayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
}

interface UserInfo {
  id: string
  email: string
  name: string
  role: 'teacher' | 'admin'
  isLti: boolean
}

export function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    // First try to load from localStorage
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch {
        localStorage.removeItem('user')
        localStorage.removeItem('userRole')
      }
    }

    // Then fetch session to verify/update role based on sessionType
    async function fetchSession() {
      try {
        const response = await fetch('/api/auth/session')
        const data = await response.json()

        if (data.session) {
          // Determine role based on sessionType
          let role: 'teacher' | 'admin' = 'teacher'
          if (data.session.sessionType === 'admin') {
            role = 'admin'
          } else if (data.session.sessionType === 'teacher') {
            role = 'teacher'
          }

          const userInfo: UserInfo = {
            id: data.session.userId,
            email: data.session.email,
            name: localStorage.getItem('user')
              ? JSON.parse(localStorage.getItem('user')!).name
              : 'User',
            role: role,
            isLti: data.session.isLti !== false, // Default to true for backward compatibility
          }

          console.log('👤 User session details:', {
            userId: userInfo.id,
            email: userInfo.email,
            name: userInfo.name,
            role: userInfo.role,
            isLti: userInfo.isLti,
            sessionType: data.session.sessionType,
            returnUrl: data.session.returnUrl || null,
          })

          // Save to localStorage
          localStorage.setItem('user', JSON.stringify(userInfo))
          localStorage.setItem('userRole', role)

          setUser(userInfo)
        }
      } catch (error) {
        console.error('Failed to fetch session:', error)
      }
    }

    fetchSession()
  }, [])

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleLogout = async () => {
    try {
      // Call logout API to clear server-side session
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Logout API error:', error)
    }

    // Clear localStorage
    localStorage.removeItem('user')
    localStorage.removeItem('userRole')

    // Redirect to login
    window.location.href = '/login'
  }

  const displayName = user?.name || 'User'
  const displayRole = user?.role === 'admin' ? 'Administrator' : 'Teacher'

  return (
    <div className="min-h-screen theme-bg-primary">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        onLogout={handleLogout}
        userName={displayName}
        userRole={displayRole}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isLti={user?.isLti ?? true}
      />

      {/* Main Content */}
      <div className="lg:ml-64 min-h-screen flex flex-col">
        <Header
          title={title}
          subtitle={subtitle}
          onMenuClick={() => setSidebarOpen(true)}
          showMenuButton={true}
        />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
