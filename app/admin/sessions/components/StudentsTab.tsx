'use client'

/**
 * StudentsTab Component
 *
 * Displays student sessions with DataTable for desktop and MobileCardList for mobile.
 */

import { GraduationCap } from 'lucide-react'
import {
  Card,
  DataTable,
  MobileCardList,
  Badge,
  ProgressBar,
  StudentDetailModal,
} from '../../components'
import type { SessionStudent } from '../../types'
import { getInitials } from '../../utils'
import { studentColumns } from './columns.config'

// =============================================================================
// Types
// =============================================================================

interface StudentsTabProps {
  data: SessionStudent[]
  totalItems: number
  currentPage: number
  totalPages: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  selectedStudent: SessionStudent | null
  setSelectedStudent: (student: SessionStudent | null) => void
  selectedKeys: Set<string>
  onSelectionChange: (keys: Set<string>) => void
  hasData: boolean
}

// =============================================================================
// Component
// =============================================================================

export function StudentsTab({
  data,
  totalItems,
  currentPage,
  totalPages,
  itemsPerPage,
  onPageChange,
  selectedStudent,
  setSelectedStudent,
  selectedKeys,
  onSelectionChange,
  hasData,
}: StudentsTabProps) {
  return (
    <>
      <DataTable<SessionStudent>
        title="Student Sessions"
        data={data}
        columns={studentColumns}
        totalItems={totalItems}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        onPageChange={onPageChange}
        onRowAction={setSelectedStudent}
        emptyIcon={<GraduationCap className="w-8 h-8 text-gray-400" />}
        emptyTitle="No students found"
        emptyDescription={!hasData ? "No student sessions yet" : "Try adjusting your search or filter"}
        getRowKey={(student) => student.id}
        selectable={true}
        selectedKeys={selectedKeys}
        onSelectionChange={onSelectionChange}
      />
      <MobileCardList<SessionStudent>
        title="Student Sessions"
        data={data}
        totalItems={totalItems}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        onPageChange={onPageChange}
        onItemClick={setSelectedStudent}
        emptyIcon={<GraduationCap className="w-8 h-8 text-gray-400" />}
        emptyTitle="No students found"
        emptyDescription={!hasData ? "No student sessions yet" : "Try adjusting your search or filter"}
        getRowKey={(student) => student.id}
        renderCard={(student) => (
          <Card className="p-1">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-medium text-sm">
                    {getInitials(student.name)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="theme-text-primary font-medium truncate">{student.name}</p>
                  <p className="text-gray-500 text-xs truncate">{student.email}</p>
                </div>
              </div>
              <Badge
                variant={
                  student.status === 'completed' ? 'success' :
                  student.status === 'active' ? 'info' : 'warning'
                }
              >
                {student.status}
              </Badge>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">Progress</span>
                <span className="text-white">{student.progress}%</span>
              </div>
              <ProgressBar value={student.progress} size="sm" color="teal" />
            </div>
          </Card>
        )}
      />

      {selectedStudent && (
        <StudentDetailModal student={selectedStudent} onClose={() => setSelectedStudent(null)} />
      )}
    </>
  )
}
