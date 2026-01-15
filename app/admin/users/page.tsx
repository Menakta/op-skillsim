'use client'

/**
 * Registered Users Page
 *
 * Admin page for managing registered users (outsiders).
 * Displays user list with approval status and actions.
 */

import { useState, useMemo, useCallback } from 'react'
import { UserPlus, Users, Clock, CheckCircle, XCircle, Trash2 } from 'lucide-react'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { Card, CardContent } from '../components/ui/Card'
import { SearchInput } from '../components/ui/SearchInput'
import { FilterButton } from '../components/ui/FilterButton'
import { StatCard } from '../components/ui/StatCard'
import { LoadingState } from '../components/ui/LoadingState'
import { ExportDropdown } from '../components/ui/ExportDropdown'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useUsers, useUpdateUserApproval, useUpdateUserRole, useDeleteUsers } from '../hooks/useAdminQueries'
import { useExport } from '../hooks/useExport'
import { useIsLtiAdmin } from '../hooks/useCurrentUser'
import { useAdmin } from '../context/AdminContext'
import type { ApprovalFilter, ApprovalStatus } from '../types'
import { UsersTable, EXPORT_COLUMNS, type UserRole } from './components'

// =============================================================================
// Constants
// =============================================================================

const ITEMS_PER_PAGE = 10

// =============================================================================
// Page Component
// =============================================================================

export default function UsersPage() {
  const { data, isLoading, error, refetch } = useUsers()
  const updateApproval = useUpdateUserApproval()
  const updateRole = useUpdateUserRole()
  const deleteUsers = useDeleteUsers()
  const { userRole: currentUserRole } = useAdmin()
  const { isLtiAdmin } = useIsLtiAdmin()

  const isAdmin = currentUserRole === 'admin'

  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ApprovalFilter>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Extract data
  const users = data?.users || []
  const stats = data?.stats || { total: 0, pending: 0, approved: 0, rejected: 0, outsiders: 0 }

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch =
        searchQuery === '' ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (user.institution?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)

      const matchesStatus =
        statusFilter === 'all' || user.approval_status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [users, searchQuery, statusFilter])

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredUsers.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredUsers, currentPage])

  // Reset page on filter change
  useMemo(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter])

  // Handlers
  const handleApproval = useCallback(async (userId: string, newStatus: ApprovalStatus) => {
    try {
      await updateApproval.mutateAsync({ userId, approval_status: newStatus })
    } catch (error) {
      console.error('Failed to update approval status:', error)
    }
  }, [updateApproval])

  const handleRoleChange = useCallback(async (userId: string, newRole: UserRole) => {
    try {
      await updateRole.mutateAsync({ userId, role: newRole })
    } catch (error) {
      console.error('Failed to update user role:', error)
    }
  }, [updateRole])

  const handleDeleteClick = useCallback(() => {
    setShowDeleteConfirm(true)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    const ids = Array.from(selectedUsers)
    if (ids.length === 0) return

    try {
      await deleteUsers.mutateAsync({ ids })
      setSelectedUsers(new Set())
      setShowDeleteConfirm(false)
      refetch()
    } catch (error) {
      console.error('Delete failed:', error)
    }
  }, [selectedUsers, deleteUsers, refetch])

  // Export hook
  const {
    showExportMenu,
    setShowExportMenu,
    exportMenuRef,
    handleExportAll,
    handleExportFiltered,
    handleExportSelected,
  } = useExport({
    data: users,
    filteredData: filteredUsers,
    selectedKeys: selectedUsers,
    getItemKey: (user) => user.id,
    columns: EXPORT_COLUMNS,
    filenamePrefix: 'registered-users',
    title: 'Registered Users',
  })

  // Loading state
  if (isLoading) {
    return (
      <DashboardLayout title="Registered Users" subtitle="Manage user registrations and approvals">
        <LoadingState />
      </DashboardLayout>
    )
  }

  // Error state
  if (error) {
    return (
      <DashboardLayout title="Registered Users" subtitle="Manage user registrations and approvals">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <XCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
              <h3 className="text-lg font-medium theme-text-primary mb-2">Failed to load users</h3>
              <p className="theme-text-muted">{error.message}</p>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Registered Users" subtitle="Manage user registrations and approvals">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2 mb-3">
        <StatCard
          label="Total Users"
          value={stats.total}
          icon={<Users className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          label="Pending"
          value={stats.pending}
          icon={<Clock className="w-5 h-5" />}
          color="yellow"
        />
        <StatCard
          label="Approved"
          value={stats.approved}
          icon={<CheckCircle className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          label="Rejected"
          value={stats.rejected}
          icon={<XCircle className="w-5 h-5" />}
          color="red"
        />
        <StatCard
          label="Outsiders"
          value={stats.outsiders}
          icon={<UserPlus className="w-5 h-5" />}
          color="purple"
        />
      </div>

      {/* Filters */}
      <Card className="mb-3 lg:w-[49%] w-full">
        <CardContent className="py-4">
          <div className="flex flex-col gap-2">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by name, email, or institution..."
              className="w-full lg:w-1/2"
            />

            <div className="flex flex-wrap gap-2 items-center">
              <FilterButton
                active={statusFilter === 'all'}
                onClick={() => setStatusFilter('all')}
              >
                All
              </FilterButton>
              <FilterButton
                active={statusFilter === 'pending'}
                onClick={() => setStatusFilter('pending')}
              >
                Pending ({stats.pending})
              </FilterButton>
              <FilterButton
                active={statusFilter === 'approved'}
                onClick={() => setStatusFilter('approved')}
              >
                Approved
              </FilterButton>
              <FilterButton
                active={statusFilter === 'rejected'}
                onClick={() => setStatusFilter('rejected')}
              >
                Rejected
              </FilterButton>

              <ExportDropdown
                isOpen={showExportMenu}
                onToggle={() => setShowExportMenu(!showExportMenu)}
                menuRef={exportMenuRef}
                onExportAll={handleExportAll}
                onExportFiltered={handleExportFiltered}
                onExportSelected={handleExportSelected}
                allCount={users.length}
                filteredCount={filteredUsers.length}
                selectedCount={selectedUsers.size}
              />

              {isLtiAdmin && selectedUsers.size > 0 && (
                <button
                  onClick={handleDeleteClick}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete ({selectedUsers.size})
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <UsersTable
        data={paginatedUsers}
        totalItems={filteredUsers.length}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={setCurrentPage}
        selectedKeys={selectedUsers}
        onSelectionChange={setSelectedUsers}
        isAdmin={isAdmin}
        isPendingApproval={updateApproval.isPending}
        isPendingRole={updateRole.isPending}
        onApproval={handleApproval}
        onRoleChange={handleRoleChange}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Users"
        message={`Are you sure you want to delete ${selectedUsers.size} selected user${selectedUsers.size > 1 ? 's' : ''}? This will also delete their associated sessions and data. This action cannot be undone.`}
        confirmText="Delete"
        isLoading={deleteUsers.isPending}
        variant="danger"
      />
    </DashboardLayout>
  )
}
