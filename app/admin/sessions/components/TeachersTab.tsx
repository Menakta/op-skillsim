'use client'

/**
 * TeachersTab Component
 *
 * Displays teacher sessions with DataTable for desktop and MobileCardList for mobile.
 */

import { Users } from 'lucide-react'
import {
  Card,
  DataTable,
  MobileCardList,
  Badge,
  TeacherDetailModal,
} from '../../components'
import type { SessionTeacher } from '../../types'
import { getInitials } from '../../utils'
import { teacherColumns } from './columns.config'

// =============================================================================
// Types
// =============================================================================

interface TeachersTabProps {
  data: SessionTeacher[]
  totalItems: number
  currentPage: number
  totalPages: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  selectedTeacher: SessionTeacher | null
  setSelectedTeacher: (teacher: SessionTeacher | null) => void
  selectedKeys: Set<string>
  onSelectionChange: (keys: Set<string>) => void
  hasData: boolean
}

// =============================================================================
// Component
// =============================================================================

export function TeachersTab({
  data,
  totalItems,
  currentPage,
  totalPages,
  itemsPerPage,
  onPageChange,
  selectedTeacher,
  setSelectedTeacher,
  selectedKeys,
  onSelectionChange,
  hasData,
}: TeachersTabProps) {
  return (
    <>
      <DataTable<SessionTeacher>
        title="Teacher Sessions"
        data={data}
        columns={teacherColumns}
        totalItems={totalItems}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        onPageChange={onPageChange}
        onRowAction={setSelectedTeacher}
        emptyIcon={<Users className="w-8 h-8 text-gray-400" />}
        emptyTitle="No teachers found"
        emptyDescription={!hasData ? "No teacher sessions yet" : "Try adjusting your search or filter"}
        getRowKey={(teacher) => teacher.id}
        selectable={true}
        selectedKeys={selectedKeys}
        onSelectionChange={onSelectionChange}
      />
      <MobileCardList<SessionTeacher>
        title="Teacher Sessions"
        data={data}
        totalItems={totalItems}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        onPageChange={onPageChange}
        onItemClick={setSelectedTeacher}
        emptyIcon={<Users className="w-8 h-8 text-gray-400" />}
        emptyTitle="No teachers found"
        emptyDescription={!hasData ? "No teacher sessions yet" : "Try adjusting your search or filter"}
        getRowKey={(teacher) => teacher.id}
        renderCard={(teacher) => (
          <Card className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-medium text-sm">
                    {getInitials(teacher.name)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="theme-text-primary font-medium truncate">{teacher.name}</p>
                  <p className="text-gray-500 text-xs truncate">{teacher.email}</p>
                </div>
              </div>
              <Badge variant={teacher.status === 'active' ? 'success' : 'warning'}>
                {teacher.status}
              </Badge>
            </div>
          </Card>
        )}
      />

      {selectedTeacher && (
        <TeacherDetailModal teacher={selectedTeacher} onClose={() => setSelectedTeacher(null)} />
      )}
    </>
  )
}
