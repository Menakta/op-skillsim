/**
 * Teacher Detail Modal
 *
 * Displays detailed information about a teacher profile.
 */

import { Calendar, Building, Globe, Monitor, LogIn, Clock } from 'lucide-react'
import { BaseModal } from './BaseModal'
import type { SessionTeacher } from '../../types'
import { formatDate, getInitials } from '../../utils'

interface TeacherDetailModalProps {
  teacher: SessionTeacher
  onClose: () => void
}

export function TeacherDetailModal({ teacher, onClose }: TeacherDetailModalProps) {
  return (
    <BaseModal onClose={onClose} title="Teacher Profile" subtitle={teacher.email} maxWidth="md">
      {/* Header with avatar */}
      <div className="flex items-center gap-3 mb-6 p-3 theme-bg-tertiary rounded-lg">
        <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center">
          <span className="text-white font-medium">{getInitials(teacher.name)}</span>
        </div>
        <div>
          <p className="theme-text-primary font-medium">{teacher.name}</p>
          <p className="theme-text-muted text-sm truncate">{teacher.email}</p>
        </div>
      </div>

      {/* Info Cards */}
      <div className="space-y-4">
        <div className="p-3 theme-bg-tertiary rounded-lg">
          <div className="flex items-center gap-2 theme-text-muted mb-1">
            <Building className="w-4 h-4" />
            <span className="text-xs">Institution</span>
          </div>
          <p className="theme-text-primary text-sm font-medium">{teacher.institution}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 theme-bg-tertiary rounded-lg">
            <div className="flex items-center gap-2 theme-text-muted mb-1">
              <LogIn className="w-4 h-4" />
              <span className="text-xs">Login Count</span>
            </div>
            <p className="theme-text-primary text-sm font-medium">{teacher.loginCount}</p>
          </div>
          <div className="p-3 theme-bg-tertiary rounded-lg">
            <div className="flex items-center gap-2 theme-text-muted mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs">Last Login</span>
            </div>
            <p className="theme-text-primary text-sm font-medium">
              {teacher.lastLoginAt ? formatDate(teacher.lastLoginAt) : 'N/A'}
            </p>
          </div>
        </div>

        <div className="p-3 theme-bg-tertiary rounded-lg">
          <div className="flex items-center gap-2 theme-text-muted mb-1">
            <Globe className="w-4 h-4" />
            <span className="text-xs">IP Address</span>
          </div>
          <p className="theme-text-primary text-sm font-medium">{teacher.ipAddress || 'N/A'}</p>
        </div>

        <div className="p-3 theme-bg-tertiary rounded-lg">
          <div className="flex items-center gap-2 theme-text-muted mb-1">
            <Monitor className="w-4 h-4" />
            <span className="text-xs">User Agent</span>
          </div>
          <p className="theme-text-primary text-sm font-medium break-all">
            {teacher.userAgent || 'N/A'}
          </p>
        </div>

        <div className="p-3 theme-bg-tertiary rounded-lg">
          <div className="flex items-center gap-2 theme-text-muted mb-1">
            <Calendar className="w-4 h-4" />
            <span className="text-xs">Created</span>
          </div>
          <p className="theme-text-primary text-sm font-medium">{formatDate(teacher.createdAt)}</p>
        </div>
      </div>
    </BaseModal>
  )
}
