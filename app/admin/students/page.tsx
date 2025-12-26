'use client'

/**
 * Students Management Page
 *
 * Displays student list with progress tracking, filtering, and detailed views.
 * Fetches real data from Supabase via API.
 */

import { useState, useEffect } from 'react'
import { Users, Mail, Calendar, Activity, Eye } from 'lucide-react'
import { DashboardLayout } from '../components'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table'
import { Badge } from '../components/ui/Badge'
import { ProgressBar } from '../components/ui/ProgressBar'
import { SearchInput } from '../components/ui/SearchInput'
import { EmptyState } from '../components/ui/EmptyState'
import { LoadingState } from '../components/ui/LoadingState'

// =============================================================================
// Types
// =============================================================================

interface QuizResult {
  id: string
  questionId: string
  isCorrect: boolean
  attempts: number
  completedAt: string
}

interface Student {
  id: string
  name: string
  email: string
  institution: string
  enrolledDate: string
  lastActive: string
  progress: number
  status: string
  averageScore: number
  completedModules: number
  totalModules: number
  sessionsCount: number
  quizResults: QuizResult[]
}

interface Stats {
  totalStudents: number
  activeStudents: number
  completedStudents: number
  avgProgress: number
}

type StatusFilter = 'all' | 'active' | 'paused' | 'completed'

// =============================================================================
// Main Component
// =============================================================================

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)

  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/admin/students')
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch students')
      }

      setStudents(data.students || [])
      setStats(data.stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load students')
    } finally {
      setIsLoading(false)
    }
  }

  // Filter students
  const filteredStudents = students.filter(student => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.institution.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'all' || student.status === statusFilter

    return matchesSearch && matchesStatus
  })

  if (isLoading) {
    return (
      <DashboardLayout title="Students" subtitle="Manage and track student progress">
        <LoadingState message="Loading students..." />
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout title="Students" subtitle="Error loading data">
        <div className="p-6 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Students" subtitle="Manage and track student progress">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatMini label="Total Students" value={stats?.totalStudents || 0} icon={<Users className="w-5 h-5" />} />
        <StatMini label="Active" value={stats?.activeStudents || 0} icon={<Activity className="w-5 h-5" />} color="green" />
        <StatMini label="Completed" value={stats?.completedStudents || 0} icon={<Users className="w-5 h-5" />} color="blue" />
        <StatMini label="Avg Progress" value={`${stats?.avgProgress || 0}%`} icon={<Activity className="w-5 h-5" />} color="purple" />
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-col gap-4">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search students by name, email, or institution..."
              className="max-w-md"
            />
            <div className="flex flex-wrap gap-2">
              <FilterButton
                active={statusFilter === 'all'}
                onClick={() => setStatusFilter('all')}
              >
                All
              </FilterButton>
              <FilterButton
                active={statusFilter === 'active'}
                onClick={() => setStatusFilter('active')}
              >
                Active
              </FilterButton>
              <FilterButton
                active={statusFilter === 'paused'}
                onClick={() => setStatusFilter('paused')}
              >
                Paused
              </FilterButton>
              <FilterButton
                active={statusFilter === 'completed'}
                onClick={() => setStatusFilter('completed')}
              >
                Completed
              </FilterButton>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Table - Desktop */}
      <Card className="hidden md:block">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Student List</CardTitle>
            <span className="text-gray-400 text-sm">{filteredStudents.length} students</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredStudents.length === 0 ? (
            <EmptyState
              icon={<Users className="w-8 h-8 text-gray-400" />}
              title="No students found"
              description={students.length === 0 ? "No students have enrolled yet" : "Try adjusting your search or filter criteria"}
              className="py-12"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Progress</TableHead>
                  <TableHead className="hidden lg:table-cell">Last Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-medium text-sm">
                            {student.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="theme-text-primary font-medium truncate">{student.name}</p>
                          <p className="text-gray-500 text-xs truncate">{student.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          student.status === 'completed' ? 'success' :
                          student.status === 'active' ? 'info' : 'warning'
                        }
                      >
                        {student.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="w-32">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400">Progress</span>
                          <span className="text-white">{student.progress}%</span>
                        </div>
                        <ProgressBar value={student.progress} size="sm" color="teal" />
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-gray-400">{formatDate(student.lastActive)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => setSelectedStudent(student)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-[#39BEAE] rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Students Cards - Mobile */}
      <div className="md:hidden space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-sm font-medium theme-text-primary">Student List</span>
          <span className="text-gray-400 text-sm">{filteredStudents.length} students</span>
        </div>
        {filteredStudents.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Users className="w-8 h-8 text-gray-400" />}
              title="No students found"
              description={students.length === 0 ? "No students have enrolled yet" : "Try adjusting your search or filter criteria"}
              className="py-12"
            />
          </Card>
        ) : (
          filteredStudents.map((student) => (
            <Card key={student.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-medium text-sm">
                      {student.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="theme-text-primary font-medium truncate">{student.name}</p>
                    <p className="text-gray-500 text-xs truncate">{student.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStudent(student)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-[#39BEAE] rounded-lg transition-colors flex-shrink-0"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="p-2 theme-bg-tertiary rounded-lg">
                  <p className="text-sm font-bold theme-text-primary">{student.progress}%</p>
                  <p className="text-xs text-gray-400">Progress</p>
                </div>
                <div className="p-2 theme-bg-tertiary rounded-lg">
                  <p className={`text-sm font-bold ${
                    student.averageScore >= 80 ? 'text-green-400' :
                    student.averageScore >= 60 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {student.averageScore}%
                  </p>
                  <p className="text-xs text-gray-400">Score</p>
                </div>
                <div className="p-2 theme-bg-tertiary rounded-lg">
                  <Badge
                    variant={
                      student.status === 'completed' ? 'success' :
                      student.status === 'active' ? 'info' : 'warning'
                    }
                    className="text-xs"
                  >
                    {student.status}
                  </Badge>
                </div>
              </div>
              <div className="mt-3">
                <ProgressBar value={student.progress} size="sm" color="teal" />
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Student Detail Modal */}
      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </DashboardLayout>
  )
}

// =============================================================================
// Sub-components
// =============================================================================

interface StatMiniProps {
  label: string
  value: string | number
  icon: React.ReactNode
  color?: 'default' | 'green' | 'blue' | 'purple'
}

function StatMini({ label, value, icon }: StatMiniProps) {
  return (
    <div className="bg-[#39BEAE] rounded-xl p-4 border border-gray-700 flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white bg-white/30">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-gray-200 text-sm">{label}</p>
      </div>
    </div>
  )
}

interface FilterButtonProps {
  children: React.ReactNode
  active: boolean
  onClick: () => void
}

function FilterButton({ children, active, onClick }: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer
        ${active
          ? 'bg-[#39BEAE] text-white'
          : 'theme-bg-tertiary theme-text-primary hover:theme-text-primary hover:theme-bg-hover'
        }
      `}
    >
      {children}
    </button>
  )
}

interface StudentDetailModalProps {
  student: Student
  onClose: () => void
}

function StudentDetailModal({ student, onClose }: StudentDetailModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <div
        className="theme-bg-secondary rounded-t-xl sm:rounded-xl w-full sm:max-w-2xl max-h-[90vh] sm:max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-700">
          <div className="flex items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-lg sm:text-xl">
                  {student.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </span>
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-semibold theme-text-primary truncate">{student.name}</h2>
                <p className="theme-text-muted text-xs sm:text-sm flex items-center gap-2 truncate">
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{student.email}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:theme-bg-hover rounded-lg transition-colors flex-shrink-0 text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[60vh] sm:max-h-[55vh]">

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="theme-text-primary">Overall Progress</span>
              <span className="theme-text-primary">{student.progress}%</span>
            </div>
            <ProgressBar value={student.progress} size="lg" color="teal" />
          </div>

          {/* Info */}
          <div className="mb-6">
            <h3 className="theme-text-primary font-medium mb-3">Details</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="theme-text-secondary">Enrolled:</span>
                <span className="theme-text-primary">{formatDate(student.enrolledDate)}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Activity className="w-4 h-4 text-gray-400" />
                <span className="theme-text-secondary">Last Active:</span>
                <span className="theme-text-primary">{formatDate(student.lastActive)}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="theme-text-secondary">Institution:</span>
                <span className="theme-text-primary">{student.institution}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Activity className="w-4 h-4 text-gray-400" />
                <span className="theme-text-secondary">Sessions:</span>
                <span className="theme-text-primary">{student.sessionsCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full py-2 bg-[#39BEAE] hover:bg-[#2a9d8f] text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// Helper function
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-NZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
