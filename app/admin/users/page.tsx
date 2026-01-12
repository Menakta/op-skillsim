'use client'

/**
 * Registered Users Page
 *
 * Admin page for managing registered users (outsiders).
 * Displays user list with approval status and actions.
 */

import { useState, useMemo } from 'react'
import { UserPlus, Users, Clock, CheckCircle, XCircle, UserCheck } from 'lucide-react'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { Card, CardContent } from '../components/ui/Card'
import { DataTable, MobileCardList } from '../components/ui/DataTable'
import { Badge } from '../components/ui/Badge'
import { SearchInput } from '../components/ui/SearchInput'
import { FilterButton } from '../components/ui/FilterButton'
import { StatCard } from '../components/ui/StatCard'
import { LoadingState } from '../components/ui/LoadingState'
import { ExportDropdown } from '../components/ui/ExportDropdown'
import { useUsers, useUpdateUserApproval, useUpdateUserRole } from '../hooks/useAdminQueries'
import { useExport } from '../hooks/useExport'
import { useAdmin } from '../context/AdminContext'
import { formatDate, type ExportColumn } from '../utils'
import type { RegisteredUser, Column, ApprovalFilter, BadgeVariant, ApprovalStatus } from '../types'

type UserRole = 'student' | 'teacher' | 'admin'

// =============================================================================
// Constants
// =============================================================================

const ITEMS_PER_PAGE = 10

// PDF Export columns configuration
const EXPORT_COLUMNS: ExportColumn<RegisteredUser>[] = [
  { key: 'full_name', header: 'Name', getValue: (u) => u.full_name || 'N/A' },
  { key: 'email', header: 'Email' },
  { key: 'role', header: 'Role', getValue: (u) => u.role.charAt(0).toUpperCase() + u.role.slice(1) },
  { key: 'registration_type', header: 'Type', getValue: (u) => u.registration_type.charAt(0).toUpperCase() + u.registration_type.slice(1) },
  { key: 'approval_status', header: 'Status', getValue: (u) => u.approval_status.charAt(0).toUpperCase() + u.approval_status.slice(1) },
  { key: 'institution', header: 'Institution', getValue: (u) => u.institution || 'N/A' },
  { key: 'created_at', header: 'Registered', getValue: (u) => formatDate(u.created_at) },
]

// =============================================================================
// Helper Functions
// =============================================================================

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getApprovalBadgeVariant(status: ApprovalStatus): BadgeVariant {
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

function getRegistrationTypeBadgeVariant(type: string): BadgeVariant {
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
// Page Component
// =============================================================================

export default function UsersPage() {
  const { data, isLoading, error } = useUsers()
  const updateApproval = useUpdateUserApproval()
  const updateRole = useUpdateUserRole()
  const { userRole: currentUserRole } = useAdmin()

  // Only admins can change roles
  const isAdmin = currentUserRole === 'admin'

  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ApprovalFilter>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())

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

  // Handle approval action
  const handleApproval = async (userId: string, newStatus: ApprovalStatus) => {
    try {
      await updateApproval.mutateAsync({ userId, approval_status: newStatus })
    } catch (error) {
      console.error('Failed to update approval status:', error)
    }
  }

  // Handle role change (admin only)
  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await updateRole.mutateAsync({ userId, role: newRole })
    } catch (error) {
      console.error('Failed to update user role:', error)
    }
  }

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

  // Selection handlers
  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(userId)) {
        newSet.delete(userId)
      } else {
        newSet.add(userId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set())
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)))
    }
  }

  // Column definitions
  const columns: Column<RegisteredUser>[] = useMemo(() => [
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
              handleRoleChange(user.id, e.target.value as UserRole)
            }}
            disabled={updateRole.isPending}
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
                  handleApproval(user.id, 'approved')
                }}
                disabled={updateApproval.isPending}
                className="p-1.5 text-green-400 hover:bg-green-400/20 rounded-lg transition-colors disabled:opacity-50"
                title="Approve"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleApproval(user.id, 'rejected')
                }}
                disabled={updateApproval.isPending}
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
                handleApproval(user.id, 'rejected')
              }}
              disabled={updateApproval.isPending}
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
                handleApproval(user.id, 'approved')
              }}
              disabled={updateApproval.isPending}
              className="p-1.5 text-green-400 hover:bg-green-400/20 rounded-lg transition-colors disabled:opacity-50"
              title="Approve"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ], [updateApproval.isPending, updateRole.isPending, isAdmin, handleApproval, handleRoleChange])

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
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
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
      <Card className="mb-6 lg:w-[49%] w-full">
        <CardContent className="py-4">
          <div className="flex flex-col gap-4">
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

              {/* Export Dropdown */}
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Desktop Table */}
      <DataTable<RegisteredUser>
        title="Registered Users"
        data={paginatedUsers}
        columns={columns}
        totalItems={filteredUsers.length}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={setCurrentPage}
        emptyIcon={<UserCheck className="w-12 h-12" />}
        emptyTitle="No users found"
        emptyDescription={searchQuery || statusFilter !== 'all' ? 'Try adjusting your filters' : 'No registered users yet'}
        getRowKey={(user) => user.id}
        showActions={false}
        selectable={true}
        selectedKeys={selectedUsers}
        onSelectionChange={setSelectedUsers}
      />

      {/* Mobile Card List */}
      <MobileCardList<RegisteredUser>
        title="Registered Users"
        data={paginatedUsers}
        totalItems={filteredUsers.length}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={setCurrentPage}
        emptyIcon={<UserCheck className="w-12 h-12" />}
        emptyTitle="No users found"
        emptyDescription={searchQuery || statusFilter !== 'all' ? 'Try adjusting your filters' : 'No registered users yet'}
        getRowKey={(user) => user.id}
        renderCard={(user) => (
          <Card className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                {/* Selection checkbox */}
                <input
                  type="checkbox"
                  checked={selectedUsers.has(user.id)}
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
                    onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                    disabled={updateRole.isPending}
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
                      onClick={() => handleApproval(user.id, 'approved')}
                      disabled={updateApproval.isPending}
                      className="p-2 text-green-400 hover:bg-green-400/20 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleApproval(user.id, 'rejected')}
                      disabled={updateApproval.isPending}
                      className="p-2 text-red-400 hover:bg-red-400/20 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </>
                )}
                {user.approval_status === 'approved' && (
                  <button
                    onClick={() => handleApproval(user.id, 'rejected')}
                    disabled={updateApproval.isPending}
                    className="p-2 text-red-400 hover:bg-red-400/20 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                )}
                {user.approval_status === 'rejected' && (
                  <button
                    onClick={() => handleApproval(user.id, 'approved')}
                    disabled={updateApproval.isPending}
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
    </DashboardLayout>
  )
}
