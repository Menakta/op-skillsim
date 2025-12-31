/**
 * Admin Detail Modal
 *
 * Displays detailed information about an admin session.
 */

import { Shield, Calendar, Activity, Globe } from 'lucide-react'
import { BaseModal } from './BaseModal'
import type { SessionAdmin } from '../../types'
import { formatDate } from '../../utils'

interface AdminDetailModalProps {
  admin: SessionAdmin
  onClose: () => void
}

export function AdminDetailModal({ admin, onClose }: AdminDetailModalProps) {
  return (
    <BaseModal onClose={onClose} title="Admin Session" subtitle={admin.email} maxWidth="md">
      {/* Header with avatar */}
      <div className="flex items-center gap-3 mb-6 p-3 theme-bg-tertiary rounded-lg">
        <div className="w-12 h-12 rounded-full bg-yellow-600 flex items-center justify-center">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="theme-text-primary font-medium">Admin</p>
          <p className="theme-text-muted text-sm truncate">{admin.email}</p>
        </div>
      </div>

      {/* Info Cards */}
      <div className="space-y-4">
        <div className="p-3 theme-bg-tertiary rounded-lg">
          <div className="flex items-center gap-2 theme-text-muted mb-1">
            <Calendar className="w-4 h-4" />
            <span className="text-xs">Created</span>
          </div>
          <p className="theme-text-primary text-sm font-medium">{formatDate(admin.createdAt)}</p>
        </div>
        <div className="p-3 theme-bg-tertiary rounded-lg">
          <div className="flex items-center gap-2 theme-text-muted mb-1">
            <Activity className="w-4 h-4" />
            <span className="text-xs">Last Activity</span>
          </div>
          <p className="theme-text-primary text-sm font-medium">{formatDate(admin.lastActivity)}</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Globe className="w-4 h-4 text-gray-400" />
          <span className="theme-text-secondary">IP Address:</span>
          <span className="theme-text-primary">{admin.ipAddress || 'N/A'}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Activity className="w-4 h-4 text-gray-400" />
          <span className="theme-text-secondary">Login Count:</span>
          <span className="theme-text-primary">{admin.loginCount}</span>
        </div>
      </div>
    </BaseModal>
  )
}
