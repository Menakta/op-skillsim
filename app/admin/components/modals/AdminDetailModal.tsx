/**
 * Admin Detail Modal
 *
 * Displays detailed information about an admin profile.
 */

import { Calendar, Building, Globe, Monitor, LogIn, Clock } from 'lucide-react'
import { BaseModal } from './BaseModal'
import type { SessionAdmin } from '../../types'
import { formatDate, getInitials } from '../../utils'

interface AdminDetailModalProps {
  admin: SessionAdmin
  onClose: () => void
}

export function AdminDetailModal({ admin, onClose }: AdminDetailModalProps) {
  return (
    <BaseModal onClose={onClose} title="Admin Profile" subtitle={admin.email} maxWidth="md">
      {/* Header with avatar */}
      <div className="flex items-center gap-3 mb-6 p-3 theme-bg-tertiary rounded-lg">
        <div className="w-12 h-12 rounded-full bg-yellow-600 flex items-center justify-center">
          <span className="text-white font-medium">{getInitials(admin.name)}</span>
        </div>
        <div>
          <p className="theme-text-primary font-medium">{admin.name}</p>
          <p className="theme-text-muted text-sm truncate">{admin.email}</p>
        </div>
      </div>

      {/* Info Cards */}
      <div className="space-y-4">
        <div className="p-3 theme-bg-tertiary rounded-lg">
          <div className="flex items-center gap-2 theme-text-muted mb-1">
            <Building className="w-4 h-4" />
            <span className="text-xs">Institution</span>
          </div>
          <p className="theme-text-primary text-sm font-medium">{admin.institution}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 theme-bg-tertiary rounded-lg">
            <div className="flex items-center gap-2 theme-text-muted mb-1">
              <LogIn className="w-4 h-4" />
              <span className="text-xs">Login Count</span>
            </div>
            <p className="theme-text-primary text-sm font-medium">{admin.loginCount}</p>
          </div>
          <div className="p-3 theme-bg-tertiary rounded-lg">
            <div className="flex items-center gap-2 theme-text-muted mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs">Last Login</span>
            </div>
            <p className="theme-text-primary text-sm font-medium">
              {admin.lastLoginAt ? formatDate(admin.lastLoginAt) : 'N/A'}
            </p>
          </div>
        </div>

        <div className="p-3 theme-bg-tertiary rounded-lg">
          <div className="flex items-center gap-2 theme-text-muted mb-1">
            <Globe className="w-4 h-4" />
            <span className="text-xs">IP Address</span>
          </div>
          <p className="theme-text-primary text-sm font-medium">{admin.ipAddress || 'N/A'}</p>
        </div>

        <div className="p-3 theme-bg-tertiary rounded-lg">
          <div className="flex items-center gap-2 theme-text-muted mb-1">
            <Monitor className="w-4 h-4" />
            <span className="text-xs">User Agent</span>
          </div>
          <p className="theme-text-primary text-sm font-medium break-all">
            {admin.userAgent || 'N/A'}
          </p>
        </div>

        <div className="p-3 theme-bg-tertiary rounded-lg">
          <div className="flex items-center gap-2 theme-text-muted mb-1">
            <Calendar className="w-4 h-4" />
            <span className="text-xs">Created</span>
          </div>
          <p className="theme-text-primary text-sm font-medium">{formatDate(admin.createdAt)}</p>
        </div>
      </div>
    </BaseModal>
  )
}
