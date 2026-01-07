/**
 * Teacher Detail Modal
 *
 * Displays detailed information about a teacher session.
 */

import { Calendar, Activity, Globe } from 'lucide-react'
import { BaseModal } from './BaseModal'
import type { SessionTeacher } from '../../types'
import { formatDate, getInitials } from '../../utils'

interface TeacherDetailModalProps {
  teacher: SessionTeacher
  onClose: () => void
}

export function TeacherDetailModal({ teacher, onClose }: TeacherDetailModalProps) {
  return (
    <BaseModal onClose={onClose} title="Teacher Session" subtitle={teacher.email} maxWidth="md">
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
            <Calendar className="w-4 h-4" />
            <span className="text-xs">Created</span>
          </div>
          <p className="theme-text-primary text-sm font-medium">{formatDate(teacher.createdAt)}</p>
        </div>
        <div className="p-3 theme-bg-tertiary rounded-lg">
          <div className="flex items-center gap-2 theme-text-muted mb-1">
            <Activity className="w-4 h-4" />
            <span className="text-xs">Last Activity</span>
          </div>
          <p className="theme-text-primary text-sm font-medium">{formatDate(teacher.lastActivity)}</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Globe className="w-4 h-4 text-gray-400" />
          <span className="theme-text-secondary">IP Address:</span>
          <span className="theme-text-primary">{teacher.ipAddress || 'N/A'}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Activity className="w-4 h-4 text-gray-400" />
          <span className="theme-text-secondary">Login Count:</span>
          <span className="theme-text-primary">{teacher.loginCount}</span>
        </div>
      </div>
    </BaseModal>
  )
}
