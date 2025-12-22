'use client'

/**
 * DashboardLayout Component
 *
 * Main layout wrapper for all teacher dashboard pages.
 * Includes sidebar, header, and content area.
 */

import { ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { mockTeacher } from '../../data/mockData'

interface DashboardLayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
}

export function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(mockTeacher)

  useEffect(() => {
    async function validateSession() {
      try {
        const response = await fetch('/api/auth/validate')
        const data = await response.json()

        if (!data.valid) {
          router.push('/dashboard/teacher/login')
          return
        }

        // Verify teacher/admin role
        const role = data.payload.role || 'student'
        if (role === 'student') {
          router.push('/dashboard/student')
          return
        }

        // Update user info from session
        setUser({
          ...mockTeacher,
          id: data.payload.sub,
          role: role as 'teacher' | 'admin',
          name: role === 'admin' ? 'Administrator' : mockTeacher.name,
        })
      } catch (error) {
        console.error('Session validation failed:', error)
        router.push('/dashboard/teacher/login')
      } finally {
        setLoading(false)
      }
    }

    validateSession()
  }, [router])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/dashboard/teacher/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Sidebar */}
      <Sidebar
        onLogout={handleLogout}
        userName={user.name}
        userRole={user.role === 'admin' ? 'Administrator' : 'Instructor'}
      />

      {/* Main Content */}
      <div className="ml-64">
        <Header title={title} subtitle={subtitle} />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
