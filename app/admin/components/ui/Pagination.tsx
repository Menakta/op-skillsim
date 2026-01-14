'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

// =============================================================================
// Props Interface
// =============================================================================

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  totalItems?: number
  itemsPerPage?: number
  showItemCount?: boolean
  className?: string
}

// =============================================================================
// Component
// =============================================================================

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage = 10,
  showItemCount = true,
  className = ''
}: PaginationProps) {
  // Don't render if only one page
  if (totalPages <= 1) return null

  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems || 0)

  // Generate page numbers to show
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (currentPage > 3) {
        pages.push('ellipsis')
      }

      // Show pages around current
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (currentPage < totalPages - 2) {
        pages.push('ellipsis')
      }

      // Always show last page
      pages.push(totalPages)
    }

    return pages
  }

  return (
    <div className={`flex items-center justify-between gap-2 ${className}`}>
      {/* Item count */}
      {showItemCount && totalItems !== undefined && (
        <p className="text-xs theme-text-muted">
          {startItem}-{endItem} of {totalItems}
        </p>
      )}

      {/* Pagination controls */}
      <div className="flex items-center gap-1">
        {/* Previous button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1 rounded-lg transition-colors theme-bg-secondary theme-border border disabled:opacity-50 disabled:cursor-not-allowed hover:theme-bg-tertiary"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-3 h-3 md:w-4 md:h-4 theme-text-muted" />
        </button>

        {/* Page numbers */}
        {getPageNumbers().map((page, index) => (
          page === 'ellipsis' ? (
            <span key={`ellipsis-${index}`} className="px-1 theme-text-muted">
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`min-w-[30px] h-6 md:h-8 md:min-w-[36px] px-2 rounded-lg text-sm font-medium transition-colors ${
                currentPage === page
                  ? 'bg-[#39BEAE] text-white'
                  : 'theme-bg-secondary theme-border border hover:theme-bg-tertiary theme-text-primary'
              }`}
            >
              {page}
            </button>
          )
        ))}

        {/* Next button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1 rounded-lg transition-colors theme-bg-secondary theme-border border disabled:opacity-50 disabled:cursor-not-allowed hover:theme-bg-tertiary"
          aria-label="Next page"
        >
          <ChevronRight className=" w-3 h-3 md:w-4 md:h-4 theme-text-muted" />
        </button>
      </div>
    </div>
  )
}

export default Pagination
