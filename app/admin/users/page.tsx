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
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { DataTable, MobileCardList } from '../components/ui/DataTable'
import { Badge } from '../components/ui/Badge'
import { SearchInput } from '../components/ui/SearchInput'
import { FilterButton } from '../components/ui/FilterButton'
import { StatCard } from '../components/ui/StatCard'
import { LoadingState } from '../components/ui/LoadingState'
import { useUsers, useUpdateUserApproval } from '../hooks/useAdminQueries'
import type { RegisteredUser, Column, ApprovalFilter, BadgeVariant, ApprovalStatus } from '../types'

// =============================================================================
// Constants
// =============================================================================

const ITEMS_PER_PAGE = 10

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

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-NZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
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

  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ApprovalFilter>('all')
  const [currentPage, setCurrentPage] = useState(1)

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
        <span className="theme-text-secondary capitalize">{user.role}</span>
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
  ], [updateApproval.isPending])

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
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by name, email, or institution..."
              className="w-full lg:w-1/2"
            />

            <div className="flex flex-wrap gap-2">
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
                <span className="text-xs theme-text-muted capitalize">{user.role}</span>
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
