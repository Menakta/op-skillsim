'use client'

/**
 * Fitting Options Page
 *
 * Teachers and admins can view fitting options from the Supabase database.
 * Shows which fittings are correct answers and which are distractors.
 * View-only - no editing capability.
 */

import { useState, useEffect } from 'react'
import {
  RefreshCw,
  AlertCircle,
  Wrench,
  Check,
  XCircle,
} from 'lucide-react'
import { DashboardLayout } from '../components/layout'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { SearchInput } from '../components/ui/SearchInput'
import { EmptyState } from '../components/ui/EmptyState'
import { LoadingState } from '../components/ui/LoadingState'
import type { FittingOption } from '@/app/types'

// =============================================================================
// Main Component
// =============================================================================

export default function FittingsPage() {
  const [fittings, setFittings] = useState<FittingOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'correct' | 'distractor'>('all')

  // Fetch fitting options
  useEffect(() => {
    loadFittings()
  }, [])

  async function loadFittings() {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/admin/fittings')

      if (!response.ok) {
        throw new Error('Failed to fetch fitting options')
      }

      const data = await response.json()
      setFittings(data.fittings || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fitting options')
    } finally {
      setLoading(false)
    }
  }

  // Filter fittings
  const filteredFittings = fittings.filter(fitting => {
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

  // Stats
  const correctCount = fittings.filter(f => f.is_correct).length
  const distractorCount = fittings.filter(f => !f.is_correct).length

  return (
    <DashboardLayout title="Fitting Options" subtitle="View pipe fitting options for training">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatMini
          label="Total Fittings"
          value={fittings.length}
          icon={<Wrench className="w-5 h-5" />}
        />
        <StatMini
          label="Correct Answers"
          value={correctCount}
          icon={<Check className="w-5 h-5" />}
          color="green"
        />
        <StatMini
          label="Distractors"
          value={distractorCount}
          icon={<XCircle className="w-5 h-5" />}
          color="red"
        />
      </div>

      {/* Header Actions */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search fittings..."
            className="w-full sm:w-80"
          />
          <button
            onClick={loadFittings}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors theme-btn-secondary"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          <FilterButton active={filterType === 'all'} onClick={() => setFilterType('all')}>
            All ({fittings.length})
          </FilterButton>
          <FilterButton active={filterType === 'correct'} onClick={() => setFilterType('correct')}>
            Correct ({correctCount})
          </FilterButton>
          <FilterButton active={filterType === 'distractor'} onClick={() => setFilterType('distractor')}>
            Distractors ({distractorCount})
          </FilterButton>
        </div>
      </div>

      {/* Info Notice */}
      <div className="mb-6 p-4 rounded-lg border theme-bg-info theme-border-info">
        <p className="text-sm theme-text-info">
          <strong>Note:</strong> Correct fittings are valid answers in the training simulation.
          Distractors are incorrect options shown to test student knowledge.
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent>
            <LoadingState message="Loading fitting options..." />
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && !loading && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center">
              <AlertCircle className="w-8 h-8 theme-text-error mb-4" />
              <p className="theme-text-error mb-4">{error}</p>
              <button onClick={loadFittings} className="px-4 py-2 rounded-lg theme-btn-primary">
                Try Again
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && !error && fittings.length === 0 && (
        <Card>
          <EmptyState
            icon={<Wrench className="w-8 h-8 theme-text-muted" />}
            title="No fitting options found"
            description="Fitting options will appear here once they are added to the database."
          />
        </Card>
      )}

      {/* Fittings Grid */}
      {!loading && !error && filteredFittings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFittings.map(fitting => (
            <FittingCard key={fitting.fitting_id} fitting={fitting} />
          ))}
        </div>
      )}

      {/* No Results */}
      {!loading && !error && fittings.length > 0 && filteredFittings.length === 0 && (
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

// =============================================================================
// Sub-components
// =============================================================================

interface StatMiniProps {
  label: string
  value: string | number
  icon: React.ReactNode
  color?: 'default' | 'green' | 'red'
}

function StatMini({ label, value, icon, color = 'default' }: StatMiniProps) {
  const bgColors = {
    default: 'bg-[#39BEAE]',
    green: 'bg-green-600',
    red: 'bg-red-600',
  }

  return (
    <div className={`${bgColors[color]} rounded-xl p-4 flex items-center gap-4`}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white bg-white/30">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-gray-100 text-sm">{label}</p>
      </div>
    </div>
  )
}

interface FilterButtonProps {
  children: React.ReactNode
  active: boolean
  onClick: () => void
}

function FilterButton({ children, active, onClick }: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer
        ${
          active
            ? 'bg-[#39BEAE] text-white'
            : 'theme-bg-tertiary theme-text-primary hover:theme-bg-hover'
        }
      `}
    >
      {children}
    </button>
  )
}

// =============================================================================
// Fitting Card Component (View Only)
// =============================================================================

interface FittingCardProps {
  fitting: FittingOption
}

function FittingCard({ fitting }: FittingCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant="info">{fitting.fitting_id}</Badge>
            <Badge variant={fitting.is_correct ? 'success' : 'warning'}>
              {fitting.is_correct ? 'Correct' : 'Distractor'}
            </Badge>
          </div>

          {/* Name */}
          <h3 className="font-medium theme-text-primary mb-1">{fitting.name}</h3>

          {/* Description */}
          {fitting.description && (
            <p className="text-sm theme-text-muted mb-2">{fitting.description}</p>
          )}

          {/* Reference */}
          {fitting.nzs3500_reference && (
            <p className="text-xs theme-text-tertiary">
              <span className="font-medium">Ref:</span> {fitting.nzs3500_reference}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
