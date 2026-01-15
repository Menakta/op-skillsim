'use client'

/**
 * AdminsTab Component
 *
 * Displays admin sessions with DataTable for desktop and MobileCardList for mobile.
 */

import { Shield } from 'lucide-react'
import {
  Card,
  DataTable,
  MobileCardList,
  Badge,
  AdminDetailModal,
} from '../../components'
import type { SessionAdmin } from '../../types'
import { getInitials } from '../../utils'
import { adminColumns } from './columns.config'

// =============================================================================
// Types
// =============================================================================

interface AdminsTabProps {
  data: SessionAdmin[]
  totalItems: number
  currentPage: number
  totalPages: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  selectedAdmin: SessionAdmin | null
  setSelectedAdmin: (admin: SessionAdmin | null) => void
  selectedKeys: Set<string>
  onSelectionChange: (keys: Set<string>) => void
  hasData: boolean
}

// =============================================================================
// Component
// =============================================================================

export function AdminsTab({
  data,
  totalItems,
  currentPage,
  totalPages,
  itemsPerPage,
  onPageChange,
  selectedAdmin,
  setSelectedAdmin,
  selectedKeys,
  onSelectionChange,
  hasData,
}: AdminsTabProps) {
  return (
    <>
      <DataTable<SessionAdmin>
        title="Admin Sessions"
        data={data}
        columns={adminColumns}
        totalItems={totalItems}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        onPageChange={onPageChange}
        onRowAction={setSelectedAdmin}
        emptyIcon={<Shield className="w-8 h-8 text-gray-400" />}
        emptyTitle="No admins found"
        emptyDescription={!hasData ? "No admin sessions yet" : "Try adjusting your search or filter"}
        getRowKey={(admin) => admin.id}
        selectable={true}
        selectedKeys={selectedKeys}
        onSelectionChange={onSelectionChange}
      />
      <MobileCardList<SessionAdmin>
        title="Admin Sessions"
        data={data}
        totalItems={totalItems}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        onPageChange={onPageChange}
        onItemClick={setSelectedAdmin}
        emptyIcon={<Shield className="w-8 h-8 text-gray-400" />}
        emptyTitle="No admins found"
        emptyDescription={!hasData ? "No admin sessions yet" : "Try adjusting your search or filter"}
        getRowKey={(admin) => admin.id}
        renderCard={(admin) => (
          <Card className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-full bg-yellow-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-medium text-sm">
                    {getInitials(admin.name)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="theme-text-primary font-medium truncate">{admin.name}</p>
                  <p className="text-gray-500 text-xs truncate">{admin.email}</p>
                </div>
              </div>
              <Badge variant={admin.status === 'active' ? 'success' : 'warning'}>
                {admin.status}
              </Badge>
            </div>
          </Card>
        )}
      />

      {selectedAdmin && (
        <AdminDetailModal admin={selectedAdmin} onClose={() => setSelectedAdmin(null)} />
      )}
    </>
  )
}
