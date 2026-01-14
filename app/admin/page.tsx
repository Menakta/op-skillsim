'use client'

/**
 * Teacher Dashboard Home Page
 *
 * Main overview page displaying real statistics from Supabase.
 * Uses global theme classes - no isDark checks needed.
 */

import { useState, useEffect, useMemo } from 'react'
import { Users, BookOpen, Award, TrendingUp } from 'lucide-react'
import { DashboardLayout } from './components/layout'
import { StatCard } from './components/ui/StatCard'
import { Card, CardHeader, CardTitle, CardContent } from './components/ui/Card'
import { Badge } from './components/ui/Badge'
import { ProgressBar } from './components/ui/ProgressBar'
import { EmptyState } from './components/ui/EmptyState'
import { LoadingState } from './components/ui/LoadingState'
import { Pagination } from './components/ui/Pagination'
import { SessionsChart } from './components/ui/SessionsChart'
import { formatTimeAgo } from './utils'

// =============================================================================
// Constants
// =============================================================================

const ITEMS_PER_PAGE = 10

// =============================================================================
// Types
// =============================================================================

interface DashboardStats {
  totalStudents: number
  activeSessions: number
  completedTrainings: number
  averageCompletionRate: number
  averageScore: number
  passedAssessments: number
  failedAssessments: number
  recentActivity: {
    id: string
    studentName: string
    action: string
    timestamp: string
    details: string
  }[]
}

interface Student {
  id: string
  name: string
  email: string
  enrolledDate: string
  lastActive: string
  progress: number
  status: string
  averageScore: number
  completedModules: number
  totalModules: number
}

// =============================================================================
// Main Component
// =============================================================================

export default function TeacherDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [topPerformers, setTopPerformers] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Pagination state
  const [activityPage, setActivityPage] = useState(1)
  const [performersPage, setPerformersPage] = useState(1)
  const [studentsPage, setStudentsPage] = useState(1)

  // Paginated data
  const paginatedActivity = useMemo(() => {
    if (!stats?.recentActivity) return []
    const start = (activityPage - 1) * ITEMS_PER_PAGE
    return stats.recentActivity.slice(start, start + ITEMS_PER_PAGE)
  }, [stats?.recentActivity, activityPage])

  const paginatedPerformers = useMemo(() => {
    // Filter top performers: 100% progress and high score
    const filtered = topPerformers.filter(s => s.progress === 100)
      .sort((a, b) => b.averageScore - a.averageScore)
    const start = (performersPage - 1) * ITEMS_PER_PAGE
    return {
      items: filtered.slice(start, start + ITEMS_PER_PAGE),
      total: filtered.length
    }
  }, [topPerformers, performersPage])

  const paginatedStudents = useMemo(() => {
    const start = (studentsPage - 1) * ITEMS_PER_PAGE
    return students.slice(start, start + ITEMS_PER_PAGE)
  }, [students, studentsPage])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/admin/dashboard')
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch dashboard data')
      }

      setStats(data.stats)
      setStudents(data.students || [])
      setTopPerformers(data.topPerformers || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout title="Dashboard" subtitle="Welcome back! Here's your overview.">
        <LoadingState message="Loading dashboard..." />
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout title="Dashboard" subtitle="Error loading data">
        <div className="p-6 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
        </div>
      </DashboardLayout>
    )
  }

  if (!stats) {
    return (
      <DashboardLayout title="Dashboard" subtitle="No data available">
        <EmptyState
          icon={<Users className="w-12 h-12" />}
          title="No data yet"
          description="Training data will appear here once students start using the platform."
        />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Dashboard" subtitle="Welcome back! Here's your overview.">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-8">
        <StatCard
          label="Total Students"
          value={stats.totalStudents}
          color="blue"
          icon={<Users className="w-6 h-6" />}
        />
        <StatCard
          label="Active Sessions"
          value={stats.activeSessions}
          color="green"
          icon={<BookOpen className="w-6 h-6" />}
        />
        <StatCard
          label="Completed Trainings"
          value={stats.completedTrainings}
          color="purple"
          icon={<Award className="w-6 h-6" />}
        />
        <StatCard
          label="Avg. Completion Rate"
          value={`${stats.averageCompletionRate}%`}
          color="yellow"
          icon={<TrendingUp className="w-6 h-6" />}
        />
      </div>

      {/* Sessions Chart - Lazy loaded */}
      <SessionsChart className="mb-6" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {stats.recentActivity.length === 0 ? (
              <div className="px-6 py-8 text-center theme-text-muted">
                No recent activity yet
              </div>
            ) : (
              <>
                <div className="divide-y theme-divide">
                  {paginatedActivity.map((activity) => (
                    <div key={activity.id} className="px-6 py-4 transition-colors theme-bg-hover">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium theme-text-primary">{activity.studentName}</p>
                          <p className="text-sm theme-text-muted">{activity.action}</p>
                          {activity.details && (
                            <p className="text-xs mt-1 theme-text-tertiary">{activity.details}</p>
                          )}
                        </div>
                        <span className="text-xs theme-text-muted">
                          {formatTimeAgo(activity.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {stats.recentActivity.length > ITEMS_PER_PAGE && (
                  <div className="px-6 py-4 border-t theme-border">
                    <Pagination
                      currentPage={activityPage}
                      totalPages={Math.ceil(stats.recentActivity.length / ITEMS_PER_PAGE)}
                      totalItems={stats.recentActivity.length}
                      itemsPerPage={ITEMS_PER_PAGE}
                      onPageChange={setActivityPage}
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {paginatedPerformers.total === 0 ? (
              <div className="py-4 text-center theme-text-muted text-sm">
                No performers yet
              </div>
            ) : (
              <>
                {paginatedPerformers.items.map((student, index) => {
                  const rank = (performersPage - 1) * ITEMS_PER_PAGE + index
                  return (
                    <div key={student.id} className="flex items-center gap-3">
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                        ${rank === 0 ? 'bg-yellow-500 text-black' : ''}
                        ${rank === 1 ? 'bg-gray-400 text-black' : ''}
                        ${rank === 2 ? 'bg-amber-600 text-white' : ''}
                        ${rank > 2 ? 'theme-bg-tertiary theme-text-muted' : ''}
                      `}>
                        {rank + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate theme-text-primary">{student.name}</p>
                        <p className="text-xs theme-text-muted">Quiz Score: {student.averageScore}</p>
                      </div>
                      <Badge variant={student.status === 'completed' ? 'success' : 'info'}>
                        {student.status}
                      </Badge>
                    </div>
                  )
                })}
                {paginatedPerformers.total > ITEMS_PER_PAGE && (
                  <div className="pt-4 border-t theme-border">
                    <Pagination
                      currentPage={performersPage}
                      totalPages={Math.ceil(paginatedPerformers.total / ITEMS_PER_PAGE)}
                      totalItems={paginatedPerformers.total}
                      itemsPerPage={ITEMS_PER_PAGE}
                      onPageChange={setPerformersPage}
                      showItemCount={false}
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Student Progress Overview */}
      <Card className="mt-6 p-0 lg:p-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Student Progress Overview</CardTitle>
            <a href="/admin/sessions" className="text-sm theme-text-brand hover:opacity-80">
              View all →
            </a>
          </div>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <div className="py-8 text-center theme-text-muted">
              No students enrolled yet
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {paginatedStudents.map((student) => (
                  <div
                    key={student.id}
                    className="p-3 rounded-lg border theme-bg-secondary theme-border"
                  >
                    <div className="flex flex-col sm:flex-row gap-3 items-center justify-between mb-3 p-1">
                      <div>
                        <p className="font-medium theme-text-primary">{student.name}</p>
                        <p className="text-[10px] theme-text-muted">{student.email}</p>
                      </div>
                      <Badge
                        variant={
                          student.status === 'completed' ? 'success' :
                          student.status === 'active' ? 'info' : 'warning'
                        }
                      >
                        {student.status}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="theme-text-muted">Progress</span>
                        <span className="theme-text-primary">{student.progress}%</span>
                      </div>
                      <ProgressBar value={student.progress} color="teal" size="sm" />
                      <div className="flex justify-between text-xs mt-2 theme-text-muted">
                        <span>{student.completedModules}/{student.totalModules} phases</span>
                        <span>Score: {student.averageScore}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {students.length > ITEMS_PER_PAGE && (
                <div className="mt-6 pt-4 border-t theme-border">
                  <Pagination
                    currentPage={studentsPage}
                    totalPages={Math.ceil(students.length / ITEMS_PER_PAGE)}
                    totalItems={students.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setStudentsPage}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl theme-bg-success flex items-center justify-center">
              <Award className="w-7 h-7 theme-text-success" />
            </div>
            <div>
              <p className="text-3xl font-bold theme-text-primary">
                {stats.passedAssessments}
              </p>
              <p className="text-sm theme-text-muted">Passed Trainings</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl theme-bg-error flex items-center justify-center">
              <Award className="w-7 h-7 theme-text-error" />
            </div>
            <div>
              <p className="text-3xl font-bold theme-text-primary">
                {stats.failedAssessments}
              </p>
              <p className="text-sm theme-text-muted">Below Target</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl theme-bg-brand-muted flex items-center justify-center">
              <TrendingUp className="w-7 h-7 theme-text-brand" />
            </div>
            <div>
              <p className="text-3xl font-bold theme-text-primary">{stats.averageScore}%</p>
              <p className="text-sm theme-text-muted">Average Score</p>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}

// Helper function to format timestamps
