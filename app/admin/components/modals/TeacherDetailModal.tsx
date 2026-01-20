/**
 * Teacher Detail Modal
 *
 * Displays detailed information about a teacher profile.
 */

import { Calendar, Activity, Building } from 'lucide-react'
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
      </div>
    </BaseModal>
  )
}
