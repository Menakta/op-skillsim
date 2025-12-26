'use client'

/**
 * Admin Layout
 *
 * Wraps all admin pages with the AdminProvider context
 * to share isLti state across the admin dashboard.
 */

import { AdminProvider } from './context/AdminContext'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AdminProvider>{children}</AdminProvider>
}
