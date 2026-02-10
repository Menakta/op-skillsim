/**
 * Session Column Configurations
 *
 * Column definitions for DataTable and PDF export.
 */

import { Badge, ProgressBar, type Column } from '../../components'
import type { SessionStudent, SessionTeacher, SessionAdmin } from '../../types'
import { formatDate, getInitials, type ExportColumn } from '../../utils'

// =============================================================================
// PDF Export Columns
// =============================================================================

// Format seconds to human readable time (e.g., "1h 23m" or "45m")
const formatTimeSpent = (seconds: number): string => {
  if (!seconds || seconds < 60) return '< 1m'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }
  return `${minutes}m`
}

export const STUDENT_PDF_COLUMNS: ExportColumn<SessionStudent>[] = [
  { key: 'name', header: 'Name' },
  { key: 'email', header: 'Email' },
  { key: 'institution', header: 'Institution' },
  { key: 'courseName', header: 'Course' },
  { key: 'progress', header: 'Progress (%)', getValue: (s) => `${s.progress}%` },
  { key: 'status', header: 'Status' },
  { key: 'timeSpent', header: 'Time Spent', getValue: (s) => formatTimeSpent(s.timeSpent) },
  { key: 'lastActive', header: 'Last Active', getValue: (s) => formatDate(s.lastActive) },
]

export const TEACHER_PDF_COLUMNS: ExportColumn<SessionTeacher>[] = [
  { key: 'name', header: 'Name' },
  { key: 'email', header: 'Email' },
  { key: 'institution', header: 'Institution' },
  { key: 'status', header: 'Status' },
  { key: 'ipAddress', header: 'IP Address', getValue: (t) => t.ipAddress || 'N/A' },
  { key: 'loginCount', header: 'Login Count', getValue: (t) => String(t.loginCount) },
  { key: 'lastLoginAt', header: 'Last Login', getValue: (t) => t.lastLoginAt ? formatDate(t.lastLoginAt) : 'N/A' },
  { key: 'createdAt', header: 'Created', getValue: (t) => formatDate(t.createdAt) },
]

export const ADMIN_PDF_COLUMNS: ExportColumn<SessionAdmin>[] = [
  { key: 'name', header: 'Name' },
  { key: 'email', header: 'Email' },
  { key: 'institution', header: 'Institution' },
  { key: 'status', header: 'Status' },
  { key: 'ipAddress', header: 'IP Address', getValue: (a) => a.ipAddress || 'N/A' },
  { key: 'loginCount', header: 'Login Count', getValue: (a) => String(a.loginCount) },
  { key: 'lastLoginAt', header: 'Last Login', getValue: (a) => a.lastLoginAt ? formatDate(a.lastLoginAt) : 'N/A' },
  { key: 'createdAt', header: 'Created', getValue: (a) => formatDate(a.createdAt) },
]

// =============================================================================
// DataTable Columns
// =============================================================================

export const studentColumns: Column<SessionStudent>[] = [
  {
    key: 'student',
    header: 'Student',
    render: (student) => (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-medium text-sm">
            {getInitials(student.name)}
          </span>
        </div>
        <div className="min-w-0">
          <p className="theme-text-primary font-medium truncate">{student.name}</p>
          <p className="text-gray-500 text-xs truncate">{student.email}</p>
        </div>
      </div>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (student) => (
      <Badge
        variant={
          student.status === 'completed' ? 'success' :
          student.status === 'active' ? 'info' : 'warning'
        }
      >
        {student.status}
      </Badge>
    ),
  },
  {
    key: 'progress',
    header: 'Progress',
    headerClassName: 'hidden lg:table-cell',
    className: 'hidden lg:table-cell',
    render: (student) => (
      <div className="w-32">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">Progress</span>
          <span className="theme-text-secondary">{student.progress}%</span>
        </div>
        <ProgressBar value={student.progress} size="sm" color="teal" />
      </div>
    ),
  },
  {
    key: 'lastActive',
    header: 'Last Active',
    headerClassName: 'hidden lg:table-cell',
    className: 'hidden lg:table-cell',
    render: (student) => <span className="text-gray-400">{formatDate(student.lastActive)}</span>,
  },
]

export const teacherColumns: Column<SessionTeacher>[] = [
  {
    key: 'teacher',
    header: 'Teacher',
    render: (teacher) => (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-medium text-sm">
            {getInitials(teacher.name)}
          </span>
        </div>
        <div className="min-w-0">
          <p className="theme-text-primary font-medium truncate">{teacher.name}</p>
          <p className="text-gray-500 text-xs truncate">{teacher.email}</p>
        </div>
      </div>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (teacher) => (
      <Badge variant={teacher.status === 'active' ? 'success' : 'warning'}>
        {teacher.status}
      </Badge>
    ),
  },
  {
    key: 'loginCount',
    header: 'Logins',
    headerClassName: 'hidden lg:table-cell',
    className: 'hidden lg:table-cell',
    render: (teacher) => <span className="theme-text-secondary">{teacher.loginCount}</span>,
  },
  {
    key: 'lastLoginAt',
    header: 'Last Login',
    headerClassName: 'hidden lg:table-cell',
    className: 'hidden lg:table-cell',
    render: (teacher) => <span className="text-gray-400">{teacher.lastLoginAt ? formatDate(teacher.lastLoginAt) : 'N/A'}</span>,
  },
]

export const adminColumns: Column<SessionAdmin>[] = [
  {
    key: 'admin',
    header: 'Admin',
    render: (admin) => (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-yellow-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-medium text-sm">
            {getInitials(admin.name)}
          </span>
        </div>
        <div className="min-w-0">
          <p className="theme-text-primary font-medium truncate">{admin.name}</p>
          <p className="text-gray-500 text-xs truncate">{admin.email}</p>
        </div>
      </div>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (admin) => (
      <Badge variant={admin.status === 'active' ? 'success' : 'warning'}>
        {admin.status}
      </Badge>
    ),
  },
  {
    key: 'loginCount',
    header: 'Logins',
    headerClassName: 'hidden lg:table-cell',
    className: 'hidden lg:table-cell',
    render: (admin) => <span className="theme-text-secondary">{admin.loginCount}</span>,
  },
  {
    key: 'lastLoginAt',
    header: 'Last Login',
    headerClassName: 'hidden lg:table-cell',
    className: 'hidden lg:table-cell',
    render: (admin) => <span className="text-gray-400">{admin.lastLoginAt ? formatDate(admin.lastLoginAt) : 'N/A'}</span>,
  },
]
