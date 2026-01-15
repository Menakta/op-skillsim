'use client'

/**
 * Results Page
 *
 * Displays quiz results from quiz_responses table.
 * Primary data source is quiz_responses, with student info from training_sessions.
 */

import { useState, useMemo, useCallback } from 'react'
import { Award, CheckCircle, XCircle, TrendingUp, Trash2 } from 'lucide-react'
import { DashboardLayout } from '../components/layout'
import {
  Card,
  CardContent,
  StatCard,
  SearchInput,
  LoadingState,
  FilterButton,
  ExportDropdown,
  ConfirmDialog,
} from '../components'
import type { QuizResult, ResultFilter } from '../types'
import { useResults, useExport, useDeleteResults, useIsLtiAdmin } from '../hooks'
import { ResultsTable, PDF_COLUMNS } from './components'

// =============================================================================
// Constants
// =============================================================================

const ITEMS_PER_PAGE = 10

// =============================================================================
// Main Component
// =============================================================================

export default function ResultsPage() {
  const { data, isLoading, error, refetch } = useResults()
  const { isLtiAdmin } = useIsLtiAdmin()
  const deleteResults = useDeleteResults()

  const [searchQuery, setSearchQuery] = useState('')
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all')
  const [courseFilter, setCourseFilter] = useState<string>('all')
  const [selectedResult, setSelectedResult] = useState<QuizResult | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const results = data?.results || []
  const stats = data?.stats
  const courses = data?.courses || []

  // Filter results
  const filteredResults = useMemo(() => {
    return results.filter(result => {
      const matchesSearch =
        result.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        result.studentEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        result.courseName.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesResult =
        resultFilter === 'all' ||
        (resultFilter === 'passed' && result.passed) ||
        (resultFilter === 'failed' && !result.passed)

      const matchesCourse = courseFilter === 'all' || result.courseName === courseFilter

      return matchesSearch && matchesResult && matchesCourse
    })
  }, [results, searchQuery, resultFilter, courseFilter])

  // Reset page and selection when filters change
  useMemo(() => {
    setCurrentPage(1)
    setSelectedKeys(new Set())
  }, [searchQuery, resultFilter, courseFilter])

  // Pagination
  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredResults.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredResults, currentPage])

  const totalPages = Math.ceil(filteredResults.length / ITEMS_PER_PAGE)

  // Export hook
  const {
    showExportMenu,
    setShowExportMenu,
    exportMenuRef,
    handleExportAll,
    handleExportFiltered,
    handleExportSelected,
  } = useExport({
    data: results,
    filteredData: filteredResults,
    selectedKeys,
    getItemKey: (result) => result.id,
    columns: PDF_COLUMNS,
    filenamePrefix: 'quiz-results',
    title: 'Quiz Results',
  })

  // Delete handlers
  const handleDeleteClick = useCallback(() => {
    setShowDeleteConfirm(true)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    const ids = Array.from(selectedKeys)
    if (ids.length === 0) return

    try {
      await deleteResults.mutateAsync({ ids })
      setSelectedKeys(new Set())
      setShowDeleteConfirm(false)
      refetch()
    } catch (error) {
      console.error('Delete failed:', error)
    }
  }, [selectedKeys, deleteResults, refetch])

  if (isLoading) {
    return (
      <DashboardLayout title="Results" subtitle="View and analyze quiz results">
        <LoadingState message="Loading results..." />
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout title="Results" subtitle="Error loading data">
        <div className="p-6 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
          {error instanceof Error ? error.message : 'Failed to load results'}
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Results" subtitle="View and analyze quiz results">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-3">
        <StatCard
          label="Total Submissions"
          value={stats?.totalResults || 0}
          icon={<Award className="w-5 h-5" />}
          color="purple"
        />
        <StatCard
          label="Passed"
          value={stats?.passedCount || 0}
          icon={<CheckCircle className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          label="Below Target"
          value={stats?.failedCount || 0}
          icon={<XCircle className="w-5 h-5" />}
          color="red"
        />
        <StatCard
          label="Pass Rate"
          value={`${stats?.passRate || 0}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="yellow"
        />
      </div>

      {/* Average Score Chart */}
      <Card className="mb-3">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="theme-text-muted text-sm">Average Quiz Score</p>
              <p className="text-4xl font-bold theme-text-primary mt-1">{stats?.passRate || 0}%</p>
            </div>
            <div className="w-32 h-32 relative">
              <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#374151"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#39BEAE"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${(stats?.passRate || 0) * 2.51} 251`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold theme-text-primary">{stats?.passRate || 0}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="mb-3 w-full lg:w-[49%]">
        <CardContent className="py-2">
          <div className="flex flex-col gap-2 justify-between">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by student or course..."
              className="w-full lg:w-1/2"
            />
            <div className="flex flex-wrap gap-2">
              {/* Result Filter */}
              <div className="flex gap-1 theme-bg-secondary rounded-lg p-1">
                <FilterButton active={resultFilter === 'all'} onClick={() => setResultFilter('all')}>
                  All
                </FilterButton>
                <FilterButton active={resultFilter === 'passed'} onClick={() => setResultFilter('passed')}>
                  Passed
                </FilterButton>
                <FilterButton active={resultFilter === 'failed'} onClick={() => setResultFilter('failed')}>
                  Failed
                </FilterButton>
              </div>

              {/* Course Filter */}
              {courses.length > 1 && (
                <select
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
                  className="px-4 bg-[#181818] border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#39BEAE]"
                >
                  <option value="all">All Courses</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.title} className='theme-bg-secondary'>
                      {course.title}
                    </option>
                  ))}
                </select>
              )}

              {/* Export Dropdown */}
              <ExportDropdown
                isOpen={showExportMenu}
                onToggle={() => setShowExportMenu(!showExportMenu)}
                menuRef={exportMenuRef}
                onExportAll={handleExportAll}
                onExportFiltered={handleExportFiltered}
                onExportSelected={handleExportSelected}
                allCount={results.length}
                filteredCount={filteredResults.length}
                selectedCount={selectedKeys.size}
              />

              {/* Delete Button */}
              {isLtiAdmin && selectedKeys.size > 0 && (
                <button
                  onClick={handleDeleteClick}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete ({selectedKeys.size})
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <ResultsTable
        data={paginatedResults}
        totalItems={filteredResults.length}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={setCurrentPage}
        selectedResult={selectedResult}
        setSelectedResult={setSelectedResult}
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
        hasData={results.length > 0}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Quiz Results"
        message={`Are you sure you want to delete ${selectedKeys.size} selected quiz result${selectedKeys.size > 1 ? 's' : ''}? This action cannot be undone.`}
        confirmText="Delete"
        isLoading={deleteResults.isPending}
        variant="danger"
      />
    </DashboardLayout>
  )
}
