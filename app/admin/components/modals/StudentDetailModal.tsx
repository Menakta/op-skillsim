/**
 * Student Detail Modal
 *
 * Displays detailed information about a student session.
 */

import { Mail, Calendar, Activity, GraduationCap, Clock, Globe } from 'lucide-react'
import { ProgressBar } from '../ui/ProgressBar'
import { BaseModal } from './BaseModal'
import type { SessionStudent } from '../../types'
import { formatDate, formatTime, getInitials } from '../../utils'

interface StudentDetailModalProps {
  student: SessionStudent
  onClose: () => void
}

export function StudentDetailModal({ student, onClose }: StudentDetailModalProps) {
  return (
    <BaseModal onClose={onClose} title={student.name} subtitle={student.email}>
      {/* Header with avatar */}
      <div className="flex items-center gap-3 sm:gap-4 mb-6 p-3 sm:p-4 theme-bg-tertiary rounded-lg">
        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-lg sm:text-xl">
            {getInitials(student.name)}
          </span>
        </div>
        <div className="min-w-0">
          <p className="theme-text-primary font-medium truncate">{student.name}</p>
          <p className="theme-text-muted text-sm flex items-center gap-2 truncate">
            <Mail className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{student.email}</span>
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="theme-text-primary">Overall Progress</span>
          <span className="theme-text-primary">{student.progress}%</span>
        </div>
        <ProgressBar value={student.progress} size="lg" color="teal" />
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-3 theme-bg-tertiary rounded-lg">
          <div className="flex items-center gap-2 theme-text-muted mb-1">
            <Calendar className="w-4 h-4" />
            <span className="text-xs">Enrolled</span>
          </div>
          <p className="theme-text-primary text-sm font-medium">{formatDate(student.enrolledDate)}</p>
        </div>
        <div className="p-3 theme-bg-tertiary rounded-lg">
          <div className="flex items-center gap-2 theme-text-muted mb-1">
            <Activity className="w-4 h-4" />
            <span className="text-xs">Last Active</span>
          </div>
          <p className="theme-text-primary text-sm font-medium">{formatDate(student.lastActive)}</p>
        </div>
        <div className="p-3 theme-bg-tertiary rounded-lg">
          <div className="flex items-center gap-2 theme-text-muted mb-1">
            <GraduationCap className="w-4 h-4" />
            <span className="text-xs">Institution</span>
          </div>
          <p className="theme-text-primary text-sm font-medium truncate">{student.institution}</p>
        </div>
        <div className="p-3 theme-bg-tertiary rounded-lg">
          <div className="flex items-center gap-2 theme-text-muted mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs">Time Spent</span>
          </div>
          <p className="theme-text-primary text-sm font-medium">{formatTime(student.timeSpent)}</p>
        </div>
      </div>

      {/* Additional Details */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 text-sm">
          <Globe className="w-4 h-4 text-gray-400" />
          <span className="theme-text-secondary">IP Address:</span>
          <span className="theme-text-primary">{student.ipAddress || 'N/A'}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Activity className="w-4 h-4 text-gray-400" />
          <span className="theme-text-secondary">Login Count:</span>
          <span className="theme-text-primary">{student.loginCount}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <GraduationCap className="w-4 h-4 text-gray-400" />
          <span className="theme-text-secondary">Course:</span>
          <span className="theme-text-primary">{student.courseName}</span>
        </div>
      </div>
    </BaseModal>
  )
}
