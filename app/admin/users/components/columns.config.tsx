/**
 * Users Column Configurations
 *
 * Column definitions, helpers, and export config for users page.
 */

import { CheckCircle, XCircle, Mail, MailX } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import type { RegisteredUser, Column, BadgeVariant, ApprovalStatus } from '../../types'
import { formatDate, type ExportColumn } from '../../utils'

// =============================================================================
// Types
// =============================================================================

export type UserRole = 'student' | 'teacher' | 'admin'

// =============================================================================
// Helper Functions
// =============================================================================

export function getInitials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getApprovalBadgeVariant(status: ApprovalStatus): BadgeVariant {
  switch (status) {
    case 'approved':
      return 'success'
    case 'pending':
      return 'warning'
    case 'rejected':
      return 'danger'
    default:
      return 'default'
  }
}

export function getRegistrationTypeBadgeVariant(type: string): BadgeVariant {
  switch (type) {
    case 'outsider':
      return 'purple'
    case 'lti':
      return 'info'
    case 'demo':
      return 'default'
    default:
      return 'default'
  }
}

// =============================================================================
// PDF Export Columns
// =============================================================================

export const EXPORT_COLUMNS: ExportColumn<RegisteredUser>[] = [
  { key: 'full_name', header: 'Name', getValue: (u) => u.full_name || 'N/A' },
  { key: 'email', header: 'Email' },
  { key: 'role', header: 'Role', getValue: (u) => u.role.charAt(0).toUpperCase() + u.role.slice(1) },
  { key: 'registration_type', header: 'Type', getValue: (u) => u.registration_type.charAt(0).toUpperCase() + u.registration_type.slice(1) },
  { key: 'approval_status', header: 'Status', getValue: (u) => u.approval_status.charAt(0).toUpperCase() + u.approval_status.slice(1) },
  { key: 'is_confirmed', header: 'Email Confirmed', getValue: (u) => u.is_confirmed ? 'Yes' : 'No' },
  { key: 'institution', header: 'Institution', getValue: (u) => u.institution || 'N/A' },
  { key: 'created_at', header: 'Registered', getValue: (u) => formatDate(u.created_at) },
]

// =============================================================================
// DataTable Columns Factory
// =============================================================================

interface ColumnFactoryOptions {
  isAdmin: boolean
  isPendingApproval: boolean
  isPendingRole: boolean
  onApproval: (userId: string, status: ApprovalStatus) => void
  onRoleChange: (userId: string, role: UserRole) => void
}

export function createUserColumns({
  isAdmin,
  isPendingApproval,
  isPendingRole,
  onApproval,
  onRoleChange,
}: ColumnFactoryOptions): Column<RegisteredUser>[] {
  return [
    {
      key: 'user',
      header: 'User',
      render: (user) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-medium">
              {getInitials(user.full_name)}
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-medium theme-text-primary truncate">
              {user.full_name || 'No name'}
            </p>
            <p className="text-xs theme-text-muted truncate">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (user) => (
        <Badge variant={getRegistrationTypeBadgeVariant(user.registration_type)}>
          {user.registration_type}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (user) => (
        <Badge variant={getApprovalBadgeVariant(user.approval_status)}>
          {user.approval_status}
        </Badge>
      ),
    },
    {
      key: 'email_confirmed',
      header: 'Email',
      render: (user) => (
        <div className="flex items-center gap-1" title={user.is_confirmed ? 'Email confirmed' : 'Email not confirmed'}>
          {user.is_confirmed ? (
            <Mail className="w-4 h-4 text-green-500" />
          ) : (
            <MailX className="w-4 h-4 text-red-400" />
          )}
          <span className={`text-xs ${user.is_confirmed ? 'text-green-500' : 'text-red-400'}`}>
            {user.is_confirmed ? 'Verified' : 'Pending'}
          </span>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      className: 'hidden lg:table-cell',
      headerClassName: 'hidden lg:table-cell',
      render: (user) => (
        isAdmin ? (
          <select
            value={user.role}
            onChange={(e) => {
              e.stopPropagation()
              onRoleChange(user.id, e.target.value as UserRole)
            }}
            disabled={isPendingRole}
            className="px-2 py-1 rounded-md text-sm theme-bg-secondary theme-text-primary border theme-border focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          >
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="admin">Admin</option>
          </select>
        ) : (
          <span className="theme-text-secondary capitalize">{user.role}</span>
        )
      ),
    },
    {
      key: 'registered',
      header: 'Registered',
      className: 'hidden lg:table-cell',
      headerClassName: 'hidden lg:table-cell',
      render: (user) => (
        <span className="theme-text-muted text-sm">
          {formatDate(user.created_at)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (user) => (
        <div className="flex items-center gap-2">
          {user.approval_status === 'pending' && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onApproval(user.id, 'approved')
                }}
                disabled={isPendingApproval}
                className="p-1.5 text-green-400 hover:bg-green-400/20 rounded-lg transition-colors disabled:opacity-50"
                title="Approve"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onApproval(user.id, 'rejected')
                }}
                disabled={isPendingApproval}
                className="p-1.5 text-red-400 hover:bg-red-400/20 rounded-lg transition-colors disabled:opacity-50"
                title="Reject"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </>
          )}
          {user.approval_status === 'approved' && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onApproval(user.id, 'rejected')
              }}
              disabled={isPendingApproval}
              className="p-1.5 text-red-400 hover:bg-red-400/20 rounded-lg transition-colors disabled:opacity-50"
              title="Revoke Access"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
          {user.approval_status === 'rejected' && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onApproval(user.id, 'approved')
              }}
              disabled={isPendingApproval}
              className="p-1.5 text-green-400 hover:bg-green-400/20 rounded-lg transition-colors disabled:opacity-50"
              title="Approve"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ]
}
