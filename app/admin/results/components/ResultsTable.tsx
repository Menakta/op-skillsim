'use client'

/**
 * ResultsTable Component
 *
 * Displays quiz results with DataTable for desktop and MobileCardList for mobile.
 */

import { Award } from 'lucide-react'
import {
  Card,
  DataTable,
  MobileCardList,
  Badge,
  ResultDetailModal,
} from '../../components'
import type { QuizResult } from '../../types'
import { formatDate, getInitials } from '../../utils'
import { resultColumns } from './columns.config'

// =============================================================================
// Types
// =============================================================================

interface ResultsTableProps {
  data: QuizResult[]
  totalItems: number
  currentPage: number
  totalPages: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  selectedResult: QuizResult | null
  setSelectedResult: (result: QuizResult | null) => void
  selectedKeys: Set<string>
  onSelectionChange: (keys: Set<string>) => void
  hasData: boolean
}

// =============================================================================
// Component
// =============================================================================

export function ResultsTable({
  data,
  totalItems,
  currentPage,
  totalPages,
  itemsPerPage,
  onPageChange,
  selectedResult,
  setSelectedResult,
  selectedKeys,
  onSelectionChange,
  hasData,
}: ResultsTableProps) {
  return (
    <>
      {/* Desktop Table */}
      <DataTable<QuizResult>
        title="Quiz Results"
        data={data}
        columns={resultColumns}
        totalItems={totalItems}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        onPageChange={onPageChange}
        onRowAction={setSelectedResult}
        emptyIcon={<Award className="w-8 h-8 text-gray-400" />}
        emptyTitle="No results found"
        emptyDescription={!hasData ? "No quiz submissions yet" : "Try adjusting your search or filter criteria"}
        getRowKey={(result) => result.id}
        selectable={true}
        selectedKeys={selectedKeys}
        onSelectionChange={onSelectionChange}
      />

      {/* Mobile Card List */}
      <MobileCardList<QuizResult>
        title="Quiz Results"
        data={data}
        totalItems={totalItems}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        onPageChange={onPageChange}
        onItemClick={setSelectedResult}
        emptyIcon={<Award className="w-8 h-8 text-gray-400" />}
        emptyTitle="No results found"
        emptyDescription={!hasData ? "No quiz submissions yet" : "Try adjusting your search or filter criteria"}
        getRowKey={(result) => result.id}
        renderCard={(result) => (
          <Card className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-medium text-sm">
                    {getInitials(result.studentName)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="theme-text-primary font-medium truncate">{result.studentName}</p>
                  <p className="theme-text-muted text-xs truncate">{result.courseName}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className={`text-xl font-bold ${
                  result.scorePercentage >= 75 ? 'text-green-400' :
                  result.scorePercentage >= 50 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {result.scorePercentage}%
                </span>
                <p className="text-xs theme-text-muted">
                  {result.correctCount}/{result.totalQuestions}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <Badge variant={result.passed ? 'success' : 'danger'}>
                {result.passed ? 'Passed' : 'Failed'}
              </Badge>
              <span className="text-xs theme-text-muted">{formatDate(result.answeredAt)}</span>
            </div>
          </Card>
        )}
      />

      {/* Result Detail Modal */}
      {selectedResult && (
        <ResultDetailModal
          result={selectedResult}
          onClose={() => setSelectedResult(null)}
        />
      )}
    </>
  )
}
