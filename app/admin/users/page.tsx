'use client'

/**
 * User Management Page
 *
 * Displays all users from teacher_profiles.
 * - Admins can add, edit, and delete users
 * - Teachers can only view users
 */

import { useState, useEffect } from 'react'
import { DashboardLayout } from '../components/layout'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { SearchInput } from '../components/ui/SearchInput'
import { EmptyState } from '../components/ui/EmptyState'
import { LoadingState, Spinner } from '../components/ui/LoadingState'
import { DemoModeNotice } from '../context/AdminContext'
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  X,
  Shield,
  GraduationCap,
} from 'lucide-react'

// =============================================================================
// Types
// =============================================================================

interface UserPermissions {
  editQuestionnaires: boolean
  viewResults: boolean
  manageUsers?: boolean
  viewAnalytics?: boolean
}

interface User {
  id: string
  email: string
  full_name: string
  institution: string
  role: 'teacher' | 'admin'
  permissions: UserPermissions
  created_at: string
  last_login: string | null
}

// =============================================================================
// User Form Modal Component
// =============================================================================

interface UserFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: Partial<User>) => Promise<void>
  user?: User | null
  isLoading: boolean
}

function UserFormModal({ isOpen, onClose, onSubmit, user, isLoading }: UserFormModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    institution: '',
    role: 'teacher' as 'teacher' | 'admin',
  })

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        full_name: user.full_name,
        institution: user.institution || '',
        role: user.role,
      })
    } else {
      setFormData({
        email: '',
        full_name: '',
        institution: '',
        role: 'teacher',
      })
    }
  }, [user, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(user ? { id: user.id, ...formData } : formData)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 theme-bg-primary rounded-xl shadow-2xl border theme-border">
        <div className="flex items-center justify-between p-4 border-b theme-border">
          <h2 className="text-lg font-semibold theme-text-primary">
            {user ? 'Edit User' : 'Add New User'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg theme-btn-ghost"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium theme-text-secondary mb-1">
              Full Name *
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border theme-border theme-bg-secondary theme-text-primary focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Enter full name"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium theme-text-secondary mb-1">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border theme-border theme-bg-secondary theme-text-primary focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Enter email address"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium theme-text-secondary mb-1">
              Institution
            </label>
            <input
              type="text"
              value={formData.institution}
              onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border theme-border theme-bg-secondary theme-text-primary focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Enter institution name"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium theme-text-secondary mb-1">
              Role *
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as 'teacher' | 'admin' })}
              className="w-full px-3 py-2 rounded-lg border theme-border theme-bg-secondary theme-text-primary focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
              disabled={isLoading}
            >
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="p-3 rounded-lg theme-bg-tertiary">
            <p className="text-sm font-medium theme-text-secondary mb-2">Permissions:</p>
            {formData.role === 'admin' ? (
              <ul className="text-sm theme-text-muted space-y-1">
                <li>- Edit questionnaires</li>
                <li>- View results</li>
                <li>- Manage users</li>
                <li>- View analytics</li>
              </ul>
            ) : (
              <ul className="text-sm theme-text-muted space-y-1">
                <li>- Edit questionnaires</li>
                <li>- View results (read-only)</li>
              </ul>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border theme-border theme-text-secondary hover:theme-bg-secondary transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
              disabled={isLoading}
            >
              {isLoading && <Spinner className="w-4 h-4" />}
              {user ? 'Update User' : 'Add User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// =============================================================================
// Delete Confirmation Modal
// =============================================================================

interface DeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  userName: string
  isLoading: boolean
}

function DeleteConfirmModal({ isOpen, onClose, onConfirm, userName, isLoading }: DeleteModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm mx-4 theme-bg-primary rounded-xl shadow-2xl border theme-border p-6">
        <h2 className="text-lg font-semibold theme-text-primary mb-2">Delete User</h2>
        <p className="theme-text-secondary mb-6">
          Are you sure you want to delete <strong>{userName}</strong>? This action cannot be undone.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border theme-border theme-text-secondary hover:theme-bg-secondary transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
            disabled={isLoading}
          >
            {isLoading && <Spinner className="w-4 h-4" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Main Page Component
// =============================================================================

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [canEdit, setCanEdit] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  // Fetch users on mount
  useEffect(() => {
    fetchUsers()
  }, [])

  // Filter users when search query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredUsers(
        users.filter(
          (user) =>
            user.full_name.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query) ||
            user.institution?.toLowerCase().includes(query) ||
            user.role.toLowerCase().includes(query)
        )
      )
    }
  }, [searchQuery, users])

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/admin/users')
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch users')
      }

      setUsers(data.users)
      setCanEdit(data.canEdit)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddUser = () => {
    setSelectedUser(null)
    setIsFormModalOpen(true)
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setIsFormModalOpen(true)
  }

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user)
    setIsDeleteModalOpen(true)
  }

  const handleFormSubmit = async (data: Partial<User>) => {
    try {
      setIsSubmitting(true)
      setError(null)

      const isEdit = 'id' in data && data.id
      const method = isEdit ? 'PATCH' : 'POST'

      const response = await fetch('/api/admin/users', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to save user')
      }

      // Refresh users list
      await fetchUsers()
      setIsFormModalOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save user')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return

    try {
      setIsSubmitting(true)
      setError(null)

      const response = await fetch(`/api/admin/users?id=${selectedUser.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete user')
      }

      // Refresh users list
      await fetchUsers()
      setIsDeleteModalOpen(false)
      setSelectedUser(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <DashboardLayout
      title="User Management"
      subtitle={canEdit ? 'Manage teachers and administrators' : 'View teachers and administrators'}
    >
      {/* Demo Mode Notice */}
      <DemoModeNotice />

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
        </div>
      )}

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search users by name, email, institution..."
          />
        </div>
        {canEdit && (
          <button
            onClick={handleAddUser}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add User
          </button>
        )}
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Users ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingState message="Loading users..." />
          ) : filteredUsers.length === 0 ? (
            <EmptyState
              icon={<Users className="w-12 h-12" />}
              title="No users found"
              description={
                searchQuery
                  ? 'No users match your search criteria'
                  : 'No users have been added yet'
              }
            />
          ) : (
            <div className="divide-y theme-divide">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:theme-bg-hover transition-colors"
                >
                  {/* User Info */}
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center theme-bg-tertiary flex-shrink-0">
                      {user.role === 'admin' ? (
                        <Shield className="w-5 h-5 text-purple-400" />
                      ) : (
                        <GraduationCap className="w-5 h-5 text-teal-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium theme-text-primary truncate">
                        {user.full_name}
                      </p>
                      <p className="text-sm theme-text-muted truncate">{user.email}</p>
                    </div>
                  </div>

                  {/* Institution */}
                  <div className="hidden md:block w-40">
                    <p className="text-sm theme-text-secondary truncate">
                      {user.institution || '-'}
                    </p>
                  </div>

                  {/* Role Badge */}
                  <div className="flex items-center gap-2">
                    <Badge variant={user.role === 'admin' ? 'info' : 'success'}>
                      {user.role === 'admin' ? 'Admin' : 'Teacher'}
                    </Badge>
                  </div>

                  {/* Last Login */}
                  <div className="hidden lg:block w-44 text-right">
                    <p className="text-xs theme-text-muted">Last login</p>
                    <p className="text-sm theme-text-secondary">
                      {formatDate(user.last_login)}
                    </p>
                  </div>

                  {/* Actions */}
                  {canEdit && (
                    <div className="flex items-center gap-2 sm:ml-4">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="p-2 rounded-lg theme-btn-ghost hover:text-teal-400"
                        title="Edit user"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="p-2 rounded-lg theme-btn-ghost hover:text-red-400"
                        title="Delete user"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permission Info for Teachers */}
      {!canEdit && (
        <div className="mt-6 p-4 rounded-lg theme-bg-secondary border theme-border">
          <p className="text-sm theme-text-muted">
            <strong>Note:</strong> As a teacher, you can view user information but cannot add, edit, or delete users.
            Contact an administrator for user management requests.
          </p>
        </div>
      )}

      {/* Modals */}
      <UserFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        user={selectedUser}
        isLoading={isSubmitting}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        userName={selectedUser?.full_name || ''}
        isLoading={isSubmitting}
      />
    </DashboardLayout>
  )
}
