'use client'

/**
 * UsersTable Component
 *
 * Displays registered users with DataTable for desktop and MobileCardList for mobile.
 */

import { useMemo } from 'react'
import { UserCheck, CheckCircle, XCircle, Mail, MailX, Shield } from 'lucide-react'
import { Card, DataTable, MobileCardList, Badge } from '../../components'
import type { RegisteredUser, ApprovalStatus } from '../../types'
import { formatDate } from '../../utils'
import {
  createUserColumns,
  getInitials,
  getApprovalBadgeVariant,
  getRegistrationTypeBadgeVariant,
  type UserRole,
} from './columns.config'

// =============================================================================
// Types
// =============================================================================

interface UsersTableProps {
  data: RegisteredUser[]
  totalItems: number
  currentPage: number
  totalPages: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  selectedKeys: Set<string>
  onSelectionChange: (keys: Set<string>) => void
  isAdmin: boolean
  isPendingApproval: boolean
  isPendingRole: boolean
  onApproval: (userId: string, status: ApprovalStatus) => void
  onRoleChange: (userId: string, role: UserRole) => void
  searchQuery: string
  statusFilter: string
}

// =============================================================================
// Component
// =============================================================================

export function UsersTable({
  data,
  totalItems,
  currentPage,
  totalPages,
  itemsPerPage,
  onPageChange,
  selectedKeys,
  onSelectionChange,
  isAdmin,
  isPendingApproval,
  isPendingRole,
  onApproval,
  onRoleChange,
  searchQuery,
  statusFilter,
}: UsersTableProps) {
  const columns = useMemo(
    () =>
      createUserColumns({
        isAdmin,
        isPendingApproval,
        isPendingRole,
        onApproval,
        onRoleChange,
      }),
    [isAdmin, isPendingApproval, isPendingRole, onApproval, onRoleChange]
  )

  const handleSelectUser = (userId: string, isSystemAdmin?: boolean) => {
    // Prevent selecting system admin for deletion
    if (isSystemAdmin) return

    const newSet = new Set(selectedKeys)
    if (newSet.has(userId)) {
      newSet.delete(userId)
    } else {
      newSet.add(userId)
    }
    onSelectionChange(newSet)
  }

  // Filter out system admins from selection for the DataTable
  const handleSelectionChange = (keys: Set<string>) => {
    // Remove any system admin IDs that might have been selected
    const filteredKeys = new Set<string>()
    keys.forEach(key => {
      const user = data.find(u => u.id === key)
      if (user && !user.is_system_admin) {
        filteredKeys.add(key)
      }
    })
    onSelectionChange(filteredKeys)
  }

  // Create a map of disabled rows (system admins)
  const disabledRows = useMemo(() => {
    const disabled = new Set<string>()
    data.forEach(user => {
      if (user.is_system_admin) {
        disabled.add(user.id)
      }
    })
    return disabled
  }, [data])

  const emptyDescription =
    searchQuery || statusFilter !== 'all'
      ? 'Try adjusting your filters'
      : 'No registered users yet'

  return (
    <>
      {/* Desktop Table */}
      <DataTable<RegisteredUser>
        title="Registered Users"
        data={data}
        columns={columns}
        totalItems={totalItems}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        onPageChange={onPageChange}
        emptyIcon={<UserCheck className="w-12 h-12" />}
        emptyTitle="No users found"
        emptyDescription={emptyDescription}
        getRowKey={(user) => user.id}
        showActions={false}
        selectable={true}
        selectedKeys={selectedKeys}
        onSelectionChange={handleSelectionChange}
        disabledRows={disabledRows}
      />

      {/* Mobile Card List */}
      <MobileCardList<RegisteredUser>
        title="Registered Users"
        data={data}
        totalItems={totalItems}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        onPageChange={onPageChange}
        emptyIcon={<UserCheck className="w-12 h-12" />}
        emptyTitle="No users found"
        emptyDescription={emptyDescription}
        getRowKey={(user) => user.id}
        renderCard={(user) => (
          <Card className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedKeys.has(user.id)}
                  onChange={() => handleSelectUser(user.id, user.is_system_admin)}
                  disabled={user.is_system_admin}
                  className={`w-4 h-4 rounded border-gray-600 bg-gray-700 text-[#39BEAE] focus:ring-[#39BEAE] focus:ring-offset-0 ${
                    user.is_system_admin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                  title={user.is_system_admin ? 'System admin cannot be deleted' : undefined}
                />
                <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-medium">
                    {getInitials(user.full_name)}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium theme-text-primary">
                      {user.full_name || 'No name'}
                    </p>
                    {user.is_system_admin && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        <Shield className="w-3 h-3" />
                        System
                      </span>
                    )}
                  </div>
                  <p className="text-xs theme-text-muted">{user.email}</p>
                </div>
              </div>
              <Badge variant={getApprovalBadgeVariant(user.approval_status)}>
                {user.approval_status}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={getRegistrationTypeBadgeVariant(user.registration_type)}>
                  {user.registration_type}
                </Badge>
                {isAdmin && !user.is_system_admin ? (
                  <select
                    value={user.role}
                    onChange={(e) => onRoleChange(user.id, e.target.value as UserRole)}
                    disabled={isPendingRole}
                    className="px-2 py-1 rounded-md text-xs theme-bg-secondary theme-text-primary border theme-border focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 cursor-pointer"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                ) : (
                  <span className="text-xs theme-text-muted capitalize">{user.role}</span>
                )}
              </div>

              {isAdmin && !user.is_system_admin && (
                <div className="flex items-center gap-1">
                  {user.approval_status === 'pending' && (
                    <>
                      <button
                        onClick={() => onApproval(user.id, 'approved')}
                        disabled={isPendingApproval}
                        className="p-2 text-green-400 hover:bg-green-400/20 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => onApproval(user.id, 'rejected')}
                        disabled={isPendingApproval}
                        className="p-2 text-red-400 hover:bg-red-400/20 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </>
                  )}
                  {user.approval_status === 'approved' && (
                    <button
                      onClick={() => onApproval(user.id, 'rejected')}
                      disabled={isPendingApproval}
                      className="p-2 text-red-400 hover:bg-red-400/20 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  )}
                  {user.approval_status === 'rejected' && (
                    <button
                      onClick={() => onApproval(user.id, 'approved')}
                      disabled={isPendingApproval}
                      className="p-2 text-green-400 hover:bg-green-400/20 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-2">
              <p className="text-xs theme-text-muted">
                Registered {formatDate(user.created_at)}
              </p>
              <div className="flex items-center gap-1" title={user.is_confirmed ? 'Email confirmed' : 'Email not confirmed'}>
                {user.is_confirmed ? (
                  <Mail className="w-4 h-4 text-green-500" />
                ) : (
                  <MailX className="w-4 h-4 text-red-400" />
                )}
                <span className={`text-xs ${user.is_confirmed ? 'text-green-500' : 'text-red-400'}`}>
                  {user.is_confirmed ? 'Verified' : 'Not Verified'}
                </span>
              </div>
            </div>
          </Card>
        )}
      />
    </>
  )
}
