'use client'

/**
 * Students Management Page
 *
 * Displays student list with progress tracking, filtering, and detailed views.
 */

import { useState } from 'react'
import { Users, Mail, Calendar, Activity, Eye, Filter } from 'lucide-react'
import { DashboardLayout } from '../components/layout'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table'
import { Badge } from '../components/ui/Badge'
import { ProgressBar } from '../components/ui/ProgressBar'
import { SearchInput } from '../components/ui/SearchInput'
import { EmptyState } from '../components/ui/EmptyState'
import { mockStudents, mockResults } from '../data/mockData'
import type { Student } from '../types'

type StatusFilter = 'all' | 'active' | 'inactive' | 'completed'

export default function StudentsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)

  // Filter students
  const filteredStudents = mockStudents.filter(student => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'all' || student.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Calculate stats
  const totalStudents = mockStudents.length
  const activeStudents = mockStudents.filter(s => s.status === 'active').length
  const completedStudents = mockStudents.filter(s => s.status === 'completed').length
  const avgProgress = Math.round(mockStudents.reduce((acc, s) => acc + s.progress, 0) / totalStudents)

  return (
    <DashboardLayout title="Students" subtitle="Manage and track student progress">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatMini label="Total Students" value={totalStudents} icon={<Users className="w-5 h-5" />} />
        <StatMini label="Active" value={activeStudents} icon={<Activity className="w-5 h-5" />} color="green" />
        <StatMini label="Completed" value={completedStudents} icon={<Users className="w-5 h-5" />} color="blue" />
        <StatMini label="Avg Progress" value={`${avgProgress}%`} icon={<Activity className="w-5 h-5" />} color="purple" />
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search students..."
              className="w-full sm:w-80"
            />
            <div className="flex gap-2">
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
                active={statusFilter === 'inactive'}
                onClick={() => setStatusFilter('inactive')}
              >
                Inactive
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

      {/* Students Table */}
      <Card>
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
              description="Try adjusting your search or filter criteria"
              className="py-12"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Modules</TableHead>
                  <TableHead>Avg Score</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {student.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-medium">{student.name}</p>
                          <p className="text-gray-500 text-xs">{student.email}</p>
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
                    <TableCell>
                      <div className="w-32">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400">Progress</span>
                          <span className="text-white">{student.progress}%</span>
                        </div>
                        <ProgressBar value={student.progress} size="sm" color="teal" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-white">{student.completedModules}</span>
                      <span className="text-gray-500">/{student.totalModules}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${
                        student.averageScore >= 80 ? 'text-green-400' :
                        student.averageScore >= 60 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {student.averageScore}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-gray-400">{formatDate(student.lastActive)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => setSelectedStudent(student)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
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

function StatMini({ label, value, icon, color = 'default' }: StatMiniProps) {
  const colorClasses = {
    default: 'text-gray-400 bg-gray-700',
    green: 'text-green-400 bg-green-600/20',
    blue: 'text-blue-400 bg-blue-600/20',
    purple: 'text-purple-400 bg-purple-600/20',
  }

  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-gray-400 text-sm">{label}</p>
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
        px-4 py-2 rounded-lg text-sm font-medium transition-colors
        ${active
          ? 'bg-purple-600 text-white'
          : 'bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600'
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
  // Get student's results
  const studentResults = mockResults.filter(r => r.studentId === student.id)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gray-600 flex items-center justify-center">
                <span className="text-white font-bold text-xl">
                  {student.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">{student.name}</h2>
                <p className="text-gray-400 text-sm flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {student.email}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-gray-900/50 rounded-lg text-center">
              <p className="text-2xl font-bold text-white">{student.progress}%</p>
              <p className="text-gray-400 text-sm">Progress</p>
            </div>
            <div className="p-4 bg-gray-900/50 rounded-lg text-center">
              <p className="text-2xl font-bold text-white">{student.completedModules}/{student.totalModules}</p>
              <p className="text-gray-400 text-sm">Modules</p>
            </div>
            <div className="p-4 bg-gray-900/50 rounded-lg text-center">
              <p className="text-2xl font-bold text-white">{student.averageScore}%</p>
              <p className="text-gray-400 text-sm">Avg Score</p>
            </div>
            <div className="p-4 bg-gray-900/50 rounded-lg text-center">
              <Badge
                variant={
                  student.status === 'completed' ? 'success' :
                  student.status === 'active' ? 'info' : 'warning'
                }
              >
                {student.status}
              </Badge>
              <p className="text-gray-400 text-sm mt-2">Status</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Overall Progress</span>
              <span className="text-white">{student.progress}%</span>
            </div>
            <ProgressBar value={student.progress} size="lg" color="teal" />
          </div>

          {/* Timeline */}
          <div className="mb-6">
            <h3 className="text-white font-medium mb-3">Timeline</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400">Enrolled:</span>
                <span className="text-white">{formatDate(student.enrolledDate)}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Activity className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400">Last Active:</span>
                <span className="text-white">{formatDate(student.lastActive)}</span>
              </div>
            </div>
          </div>

          {/* Recent Results */}
          <div>
            <h3 className="text-white font-medium mb-3">Assessment Results</h3>
            {studentResults.length === 0 ? (
              <p className="text-gray-400 text-sm">No assessment results yet</p>
            ) : (
              <div className="space-y-3">
                {studentResults.map((result) => (
                  <div key={result.id} className="p-4 bg-gray-900/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">{result.questionnaireTitle}</p>
                        <p className="text-gray-500 text-xs">{formatDate(result.completedAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${result.passed ? 'text-green-400' : 'text-red-400'}`}>
                          {result.percentage}%
                        </p>
                        <Badge variant={result.passed ? 'success' : 'danger'}>
                          {result.passed ? 'Passed' : 'Failed'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
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
  })
}
