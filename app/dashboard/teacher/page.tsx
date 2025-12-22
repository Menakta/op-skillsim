'use client'

/**
 * Teacher Dashboard Home Page
 *
 * Main overview page displaying statistics, recent activity, and quick actions.
 */

import { Users, BookOpen, Award, TrendingUp } from 'lucide-react'
import { DashboardLayout } from './components/layout'
import { StatCard } from './components/ui/StatCard'
import { Card, CardHeader, CardTitle, CardContent } from './components/ui/Card'
import { Badge } from './components/ui/Badge'
import { ProgressBar } from './components/ui/ProgressBar'
import { mockDashboardStats, mockStudents, mockResults } from './data/mockData'

export default function TeacherDashboardPage() {
  const stats = mockDashboardStats

  return (
    <DashboardLayout title="Dashboard" subtitle="Welcome back! Here's your overview.">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          label="Total Students"
          value={stats.totalStudents}
          color="blue"
          icon={<Users className="w-6 h-6 text-blue-400" />}
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          label="Active Sessions"
          value={stats.activeSessions}
          color="green"
          icon={<BookOpen className="w-6 h-6 text-green-400" />}
        />
        <StatCard
          label="Completed Trainings"
          value={stats.completedTrainings}
          color="purple"
          icon={<Award className="w-6 h-6 text-purple-400" />}
          trend={{ value: 8, isPositive: true }}
        />
        <StatCard
          label="Avg. Completion Rate"
          value={`${stats.averageCompletionRate}%`}
          color="yellow"
          icon={<TrendingUp className="w-6 h-6 text-yellow-400" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-700">
              {stats.recentActivity.map((activity) => (
                <div key={activity.id} className="px-6 py-4 hover:bg-gray-700/30 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white font-medium">{activity.studentName}</p>
                      <p className="text-gray-400 text-sm">{activity.action}</p>
                      {activity.details && (
                        <p className="text-gray-500 text-xs mt-1">{activity.details}</p>
                      )}
                    </div>
                    <span className="text-gray-500 text-xs">
                      {formatTimeAgo(activity.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockStudents
              .sort((a, b) => b.averageScore - a.averageScore)
              .slice(0, 5)
              .map((student, index) => (
                <div key={student.id} className="flex items-center gap-3">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                    ${index === 0 ? 'bg-yellow-500 text-black' : ''}
                    ${index === 1 ? 'bg-gray-400 text-black' : ''}
                    ${index === 2 ? 'bg-amber-600 text-white' : ''}
                    ${index > 2 ? 'bg-gray-700 text-gray-400' : ''}
                  `}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{student.name}</p>
                    <p className="text-gray-400 text-xs">{student.averageScore}% avg score</p>
                  </div>
                  <Badge variant={student.status === 'completed' ? 'success' : 'info'}>
                    {student.status}
                  </Badge>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>

      {/* Student Progress Overview */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Student Progress Overview</CardTitle>
            <a href="/dashboard/teacher/students" className="text-sm text-purple-400 hover:text-purple-300">
              View all →
            </a>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockStudents.slice(0, 6).map((student) => (
              <div
                key={student.id}
                className="p-4 bg-gray-900/50 rounded-lg border border-gray-700/50"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-white font-medium">{student.name}</p>
                    <p className="text-gray-400 text-xs">{student.email}</p>
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
                    <span className="text-gray-400">Progress</span>
                    <span className="text-white">{student.progress}%</span>
                  </div>
                  <ProgressBar value={student.progress} color="teal" size="sm" />
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>{student.completedModules}/{student.totalModules} modules</span>
                    <span>Avg: {student.averageScore}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-green-600/20 flex items-center justify-center">
              <Award className="w-7 h-7 text-green-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-white">
                {mockResults.filter(r => r.passed).length}
              </p>
              <p className="text-gray-400 text-sm">Passed Assessments</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-red-600/20 flex items-center justify-center">
              <Award className="w-7 h-7 text-red-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-white">
                {mockResults.filter(r => !r.passed).length}
              </p>
              <p className="text-gray-400 text-sm">Failed Assessments</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-purple-600/20 flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-purple-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{stats.averageScore}%</p>
              <p className="text-gray-400 text-sm">Average Score</p>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}

// Helper function to format timestamps
function formatTimeAgo(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}
