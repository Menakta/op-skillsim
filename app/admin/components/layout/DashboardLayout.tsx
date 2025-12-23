'use client'

/**
 * DashboardLayout Component
 *
 * Main layout wrapper for all teacher/admin dashboard pages.
 * Uses global theme classes - no isDark checks needed.
 */

import { type ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

interface DashboardLayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
}

export function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen theme-bg-primary">
      {/* Sidebar */}
      <Sidebar
        onLogout={() => window.location.href = '/login'}
        userName="User"
        userRole="Administrator"
      />

      {/* Main Content */}
      <div className="ml-64">
        <Header title={title} subtitle={subtitle} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
