'use client'

/**
 * Fitting Options Page
 *
 * Teachers and admins can view fitting options from the Supabase database.
 * Shows which fittings are correct answers and which are distractors.
 * View-only - no editing capability.
 */

import { useState, useMemo } from 'react'
import { AlertCircle, Wrench, Check, XCircle } from 'lucide-react'
import { DashboardLayout } from '../components/layout'
import {
  Card,
  CardContent,
  StatCard,
  SearchInput,
  FilterButton,
  EmptyState,
  LoadingState,
  Pagination,
} from '../components'
import { useFittings } from '../hooks'
import { FittingCard } from './components'

// =============================================================================
// Constants
// =============================================================================

const ITEMS_PER_PAGE = 10

// =============================================================================
// Types
// =============================================================================

type FilterType = 'all' | 'correct' | 'distractor'

// =============================================================================
// Main Component
// =============================================================================

export default function FittingsPage() {
  const { data: fittings = [], isLoading, error, refetch } = useFittings()

  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [currentPage, setCurrentPage] = useState(1)

  // Stats
  const correctCount = useMemo(() => fittings.filter(f => f.is_correct).length, [fittings])
  const distractorCount = useMemo(() => fittings.filter(f => !f.is_correct).length, [fittings])

  // Filter fittings
  const filteredFittings = useMemo(() => {
    return fittings.filter(fitting => {
      const matchesSearch =
        fitting.fitting_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fitting.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (fitting.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)

      const matchesFilter =
        filterType === 'all' ||
        (filterType === 'correct' && fitting.is_correct) ||
        (filterType === 'distractor' && !fitting.is_correct)

      return matchesSearch && matchesFilter
    })
  }, [fittings, searchQuery, filterType])

  // Reset page when filters change
  useMemo(() => {
    setCurrentPage(1)
  }, [searchQuery, filterType])

  // Pagination
  const paginatedFittings = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredFittings.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredFittings, currentPage])

  const totalPages = Math.ceil(filteredFittings.length / ITEMS_PER_PAGE)

  return (
    <DashboardLayout
      title="Fitting Options"
      subtitle="View pipe fitting options for training"
    >
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
        <StatCard
          label="Total Fittings"
          value={fittings.length}
          icon={<Wrench className="w-5 h-5" />}
        />
        <StatCard
          label="Correct Answers"
          value={correctCount}
          icon={<Check className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          label="Distractors"
          value={distractorCount}
          icon={<XCircle className="w-5 h-5" />}
          color="red"
        />
      </div>

      {/* Filters */}
      <Card className="mb-3 w-full lg:w-[49%]">
        <CardContent className="py-4">
          <div className="flex flex-col gap-2">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search fittings..."
              className="w-full lg:w-1/2"
            />
            <div className="flex flex-wrap gap-2">
              <FilterButton
                active={filterType === 'all'}
                onClick={() => setFilterType('all')}
              >
                All ({fittings.length})
              </FilterButton>
              <FilterButton
                active={filterType === 'correct'}
                onClick={() => setFilterType('correct')}
              >
                Correct ({correctCount})
              </FilterButton>
              <FilterButton
                active={filterType === 'distractor'}
                onClick={() => setFilterType('distractor')}
              >
                Distractors ({distractorCount})
              </FilterButton>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Notice */}
      <div className="mb-3 p-4 rounded-lg border theme-bg-info theme-border-info">
        <p className="text-sm theme-text-info">
          <strong>Note:</strong> Correct fittings are valid answers in the
          training simulation. Distractors are incorrect options shown to test
          student knowledge.
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent>
            <LoadingState message="Loading fitting options..." />
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center">
              <AlertCircle className="w-8 h-8 theme-text-error mb-4" />
              <p className="theme-text-error mb-4">
                {error instanceof Error ? error.message : 'Failed to load fitting options'}
              </p>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 rounded-lg theme-btn-primary"
              >
                Try Again
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && fittings.length === 0 && (
        <Card>
          <EmptyState
            icon={<Wrench className="w-8 h-8 theme-text-muted" />}
            title="No fitting options found"
            description="Fitting options will appear here once they are added to the database."
          />
        </Card>
      )}

      {/* Fittings Grid */}
      {!isLoading && !error && filteredFittings.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paginatedFittings.map(fitting => (
              <FittingCard key={fitting.fitting_id} fitting={fitting} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-6">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredFittings.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      )}

      {/* No Results */}
      {!isLoading && !error && fittings.length > 0 && filteredFittings.length === 0 && (
        <Card>
          <EmptyState
            icon={<Wrench className="w-8 h-8 theme-text-muted" />}
            title="No matching fittings"
            description="Try adjusting your search or filter criteria"
          />
        </Card>
      )}
    </DashboardLayout>
  )
}
