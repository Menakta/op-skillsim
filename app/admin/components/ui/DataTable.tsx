/**
 * DataTable Component
 *
 * Reusable table component with pagination, empty state, and action buttons.
 */

import { Eye } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from './Card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './Table'
import { EmptyState } from './EmptyState'
import { Pagination } from './Pagination'
import type { Column } from '../../types'

// =============================================================================
// Types
// =============================================================================

interface DataTableProps<T> {
  title: string
  data: T[]
  columns: Column<T>[]
  totalItems: number
  currentPage: number
  totalPages: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  onRowAction?: (item: T) => void
  emptyIcon: React.ReactNode
  emptyTitle: string
  emptyDescription: string
  getRowKey: (item: T) => string
  showActions?: boolean
}

// =============================================================================
// Component
// =============================================================================

export function DataTable<T>({
  title,
  data,
  columns,
  totalItems,
  currentPage,
  totalPages,
  itemsPerPage,
  onPageChange,
  onRowAction,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  getRowKey,
  showActions = true,
}: DataTableProps<T>) {
  return (
    <Card className="hidden md:block">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <span className="text-gray-400 text-sm">{totalItems} items</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {data.length === 0 ? (
          <EmptyState
            icon={emptyIcon}
            title={emptyTitle}
            description={emptyDescription}
            className="py-12"
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead key={column.key} className={column.headerClassName}>
                      {column.header}
                    </TableHead>
                  ))}
                  {showActions && onRowAction && (
                    <TableHead className="text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => (
                  <TableRow key={getRowKey(item)}>
                    {columns.map((column) => (
                      <TableCell key={column.key} className={column.className}>
                        {column.render(item)}
                      </TableCell>
                    ))}
                    {showActions && onRowAction && (
                      <TableCell className="text-right">
                        <button
                          onClick={() => onRowAction(item)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-[#39BEAE] rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t theme-border">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                  onPageChange={onPageChange}
                />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

// =============================================================================
// Mobile Card List Component
// =============================================================================

interface MobileCardListProps<T> {
  title: string
  data: T[]
  totalItems: number
  currentPage: number
  totalPages: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  onItemClick?: (item: T) => void
  emptyIcon: React.ReactNode
  emptyTitle: string
  emptyDescription: string
  getRowKey: (item: T) => string
  renderCard: (item: T) => React.ReactNode
}

export function MobileCardList<T>({
  title,
  data,
  totalItems,
  currentPage,
  totalPages,
  itemsPerPage,
  onPageChange,
  onItemClick,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  getRowKey,
  renderCard,
}: MobileCardListProps<T>) {
  return (
    <div className="md:hidden space-y-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-medium theme-text-primary">{title}</span>
        <span className="text-gray-400 text-sm">{totalItems} items</span>
      </div>
      {data.length === 0 ? (
        <Card>
          <EmptyState
            icon={emptyIcon}
            title={emptyTitle}
            description={emptyDescription}
            className="py-12"
          />
        </Card>
      ) : (
        <>
          {data.map((item) => (
            <div
              key={getRowKey(item)}
              onClick={() => onItemClick?.(item)}
              className={onItemClick ? 'cursor-pointer' : ''}
            >
              {renderCard(item)}
            </div>
          ))}
          {totalPages > 1 && (
            <div className="py-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={onPageChange}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
