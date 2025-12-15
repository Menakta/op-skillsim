'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  name: string
  role: string
}

export default function TeacherDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Validate session and get user info
    async function validateSession() {
      try {
        const response = await fetch('/api/auth/validate')
        const data = await response.json()

        if (!data.valid) {
          router.push('/login')
          return
        }

        // Verify teacher/admin role
        const role = data.payload.role || 'student'
        if (role === 'student') {
          router.push('/dashboard/student')
          return
        }

        setUser({
          id: data.payload.sub,
          email: '',
          name: role === 'admin' ? 'Administrator' : 'Teacher',
          role
        })
      } catch (error) {
        console.error('Session validation failed:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    validateSession()
  }, [router])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  async function handleStartDemo() {
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-white">OP SkillSim</h1>
              <span className="ml-4 px-3 py-1 bg-purple-600 text-white text-sm rounded-full">
                {user?.role === 'admin' ? 'Admin' : 'Teacher'}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">{user?.name}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            Teacher Dashboard
          </h2>
          <p className="text-gray-400">
            Monitor student progress, manage training modules, and view analytics.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="text-3xl font-bold text-white mb-1">0</div>
            <div className="text-gray-400 text-sm">Total Students</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="text-3xl font-bold text-green-400 mb-1">0</div>
            <div className="text-gray-400 text-sm">Active Sessions</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="text-3xl font-bold text-blue-400 mb-1">0</div>
            <div className="text-gray-400 text-sm">Completed Trainings</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="text-3xl font-bold text-yellow-400 mb-1">0%</div>
            <div className="text-gray-400 text-sm">Avg. Completion Rate</div>
          </div>
        </div>

        {/* Main Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Demo Simulation */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-purple-500 transition-colors">
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Demo Simulation</h3>
            <p className="text-gray-400 mb-4">
              Preview the VR training simulation as a student would experience it.
            </p>
            <button
              onClick={handleStartDemo}
              className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Launch Demo
            </button>
          </div>

          {/* Student Progress */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Student Progress</h3>
            <p className="text-gray-400 mb-4">
              View individual student progress and training completion status.
            </p>
            <button className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
              View Students
            </button>
          </div>

          {/* Analytics */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Analytics</h3>
            <p className="text-gray-400 mb-4">
              View detailed analytics and training performance metrics.
            </p>
            <button className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
              View Analytics
            </button>
          </div>
        </div>

        {/* Recent Student Activity */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-8">
          <h3 className="text-xl font-semibold text-white mb-4">Recent Student Activity</h3>
          <div className="text-gray-400 text-center py-8">
            No student activity recorded yet. Students will appear here once they start training.
          </div>
        </div>

        {/* LTI Configuration Info (for teachers/admins) */}
        {user?.role === 'admin' && (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4">LTI Configuration</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Launch URL:</span>
                <code className="text-green-400 bg-gray-900 px-2 py-1 rounded">
                  {typeof window !== 'undefined' ? `${window.location.origin}/api/auth/lti` : '/api/auth/lti'}
                </code>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Consumer Key (Dev):</span>
                <code className="text-green-400 bg-gray-900 px-2 py-1 rounded">iqualify-dev</code>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Consumer Secret (Dev):</span>
                <code className="text-green-400 bg-gray-900 px-2 py-1 rounded">iqualify-dev-secret-2024</code>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
