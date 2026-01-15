'use client'

/**
 * UsersTable Component
 *
 * Displays registered users with DataTable for desktop and MobileCardList for mobile.
 */

import { useMemo } from 'react'
import { UserCheck, CheckCircle, XCircle } from 'lucide-react'
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

  const handleSelectUser = (userId: string) => {
    const newSet = new Set(selectedKeys)
    if (newSet.has(userId)) {
      newSet.delete(userId)
    } else {
      newSet.add(userId)
    }
    onSelectionChange(newSet)
  }

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
        onSelectionChange={onSelectionChange}
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
                  onChange={() => handleSelectUser(user.id)}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-[#39BEAE] focus:ring-[#39BEAE] focus:ring-offset-0 cursor-pointer"
                />
                <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-medium">
                    {getInitials(user.full_name)}
                  </span>
                </div>
                <div>
                  <p className="font-medium theme-text-primary">
                    {user.full_name || 'No name'}
                  </p>
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
                {isAdmin ? (
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
            </div>

            <p className="text-xs theme-text-muted mt-2">
              Registered {formatDate(user.created_at)}
            </p>
          </Card>
        )}
      />
    </>
  )
}
