'use client'

/**
 * Results Page
 *
 * Displays quiz results from quiz_responses table.
 * Primary data source is quiz_responses, with student info from training_sessions.
 */

import { useState, useEffect, useMemo, useRef } from 'react'
import { Award, CheckCircle, XCircle, TrendingUp, Download, ChevronDown } from 'lucide-react'
import { DashboardLayout } from '../components/layout'
import {
  Card,
  CardContent,
  StatCard,
  Badge,
  SearchInput,
  LoadingState,
  DataTable,
  MobileCardList,
  FilterButton,
  ResultDetailModal,
  type Column,
} from '../components'
import type { QuizResult, ResultFilter } from '../types'
import { formatDate, getInitials, exportToPDF, type ExportColumn } from '../utils'
import { useResults } from '../hooks'

// =============================================================================
// Constants
// =============================================================================

const ITEMS_PER_PAGE = 10

// =============================================================================
// Main Component
// =============================================================================

// PDF export column configuration
const PDF_COLUMNS: ExportColumn<QuizResult>[] = [
  { key: 'studentName', header: 'Student Name' },
  { key: 'studentEmail', header: 'Email' },
  { key: 'courseName', header: 'Course' },
  { key: 'scorePercentage', header: 'Score (%)' },
  { key: 'correctCount', header: 'Correct' },
  { key: 'totalQuestions', header: 'Total' },
  { key: 'passed', header: 'Result', getValue: (r: QuizResult) => r.passed ? 'Passed' : 'Failed' },
  { key: 'answeredAt', header: 'Submitted', getValue: (r: QuizResult) => formatDate(r.answeredAt) },
]

export default function ResultsPage() {
  const { data, isLoading, error } = useResults()

  const [searchQuery, setSearchQuery] = useState('')
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all')
  const [courseFilter, setCourseFilter] = useState<string>('all')
  const [selectedResult, setSelectedResult] = useState<QuizResult | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  // Selection state
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())

  // Export dropdown state
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  const results = data?.results || []
  const stats = data?.stats
  const courses = data?.courses || []

  // Close export menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  // Reset to page 1 and clear selection when filters change
  useEffect(() => {
    setCurrentPage(1)
    setSelectedKeys(new Set())
  }, [searchQuery, resultFilter, courseFilter])

  // Export handlers
  const handleExportAll = async () => {
    const timestamp = new Date().toISOString().split('T')[0]
    await exportToPDF(results, PDF_COLUMNS, `quiz-results-${timestamp}.pdf`, {
      title: 'Quiz Results',
    })
    setShowExportMenu(false)
  }

  const handleExportFiltered = async () => {
    const timestamp = new Date().toISOString().split('T')[0]
    await exportToPDF(filteredResults, PDF_COLUMNS, `quiz-results-${timestamp}.pdf`, {
      title: 'Quiz Results',
    })
    setShowExportMenu(false)
  }

  const handleExportSelected = async () => {
    const selectedResults = results.filter(r => selectedKeys.has(r.id))
    const timestamp = new Date().toISOString().split('T')[0]
    await exportToPDF(selectedResults, PDF_COLUMNS, `quiz-results-${timestamp}.pdf`, {
      title: 'Quiz Results',
    })
    setShowExportMenu(false)
  }

  // Paginated results
  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredResults.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredResults, currentPage])

  const totalPages = Math.ceil(filteredResults.length / ITEMS_PER_PAGE)

  // Table columns configuration
  const columns: Column<QuizResult>[] = useMemo(() => [
    {
      key: 'student',
      header: 'Student',
      render: (result) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-medium">
              {getInitials(result.studentName)}
            </span>
          </div>
          <div className="min-w-0">
            <p className="theme-text-primary font-medium truncate">{result.studentName}</p>
            <p className="theme-text-muted text-xs truncate">{result.studentEmail}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'course',
      header: 'Course',
      headerClassName: 'hidden lg:table-cell',
      className: 'hidden lg:table-cell',
      render: (result) => <p className="theme-text-primary">{result.courseName}</p>,
    },
    {
      key: 'score',
      header: 'Score',
      render: (result) => (
        <span className={`text-lg font-bold ${
          result.scorePercentage >= 75 ? 'text-green-400' :
          result.scorePercentage >= 50 ? 'text-yellow-400' : 'text-red-400'
        }`}>
          {result.scorePercentage}%
        </span>
      ),
    },
    {
      key: 'questions',
      header: 'Questions',
      render: (result) => (
        <>
          <span className="theme-text-primary">{result.correctCount}</span>
          <span className="theme-text-muted">/{result.totalQuestions}</span>
        </>
      ),
    },
    {
      key: 'result',
      header: 'Result',
      render: (result) => (
        <Badge variant={result.passed ? 'success' : 'danger'}>
          {result.passed ? 'Passed' : 'Failed'}
        </Badge>
      ),
    },
    {
      key: 'submitted',
      header: 'Submitted',
      headerClassName: 'hidden lg:table-cell',
      className: 'hidden lg:table-cell',
      render: (result) => <span className="theme-text-secondary">{formatDate(result.answeredAt)}</span>,
    },
  ], [])

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

  const avgScore = stats?.avgScore || 0

  return (
    <DashboardLayout title="Results" subtitle="View and analyze quiz results">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
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
      <Card className="mb-6">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="theme-text-muted text-sm">Average Quiz Score</p>
              <p className="text-4xl font-bold theme-text-primary mt-1">{avgScore}%</p>
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
                  strokeDasharray={`${avgScore * 2.51} 251`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold theme-text-primary">{avgScore}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="mb-6 w-full lg:w-[49%]">
        <CardContent className="py-4">
          <div className="flex flex-col gap-4 justify-between">
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
                  className="px-4 py-2 bg-[#181818] border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#39BEAE]"
                >
                  <option value="all">All Courses</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.title}>
                      {course.title}
                    </option>
                  ))}
                </select>
              )}

              {/* Export Dropdown */}
              <div className="relative" ref={exportMenuRef}>
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#39BEAE] hover:bg-[#2ea89a] text-white rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export
                  <ChevronDown className={`w-4 h-4 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
                </button>

                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                    <button
                      onClick={handleExportAll}
                      className="w-full px-4 py-3 text-left text-sm text-white hover:bg-[#39BEAE]/20 flex items-center justify-between"
                    >
                      <span>Export All</span>
                      <span className="text-gray-400 text-xs">{results.length} rows</span>
                    </button>
                    <button
                      onClick={handleExportFiltered}
                      disabled={filteredResults.length === 0}
                      className="w-full px-4 py-3 text-left text-sm text-white hover:bg-[#39BEAE]/20 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed border-t border-gray-700"
                    >
                      <span>Export Filtered</span>
                      <span className="text-gray-400 text-xs">{filteredResults.length} rows</span>
                    </button>
                    <button
                      onClick={handleExportSelected}
                      disabled={selectedKeys.size === 0}
                      className="w-full px-4 py-3 text-left text-sm text-white hover:bg-[#39BEAE]/20 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed border-t border-gray-700"
                    >
                      <span>Export Selected</span>
                      <span className="text-gray-400 text-xs">{selectedKeys.size} rows</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table - Desktop */}
      <DataTable<QuizResult>
        title="Quiz Results"
        data={paginatedResults}
        columns={columns}
        totalItems={filteredResults.length}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={setCurrentPage}
        onRowAction={setSelectedResult}
        emptyIcon={<Award className="w-8 h-8 text-gray-400" />}
        emptyTitle="No results found"
        emptyDescription={results.length === 0 ? "No quiz submissions yet" : "Try adjusting your search or filter criteria"}
        getRowKey={(result) => result.id}
        selectable={true}
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
      />

      {/* Results Cards - Mobile */}
      <MobileCardList<QuizResult>
        title="Quiz Results"
        data={paginatedResults}
        totalItems={filteredResults.length}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={setCurrentPage}
        onItemClick={setSelectedResult}
        emptyIcon={<Award className="w-8 h-8 text-gray-400" />}
        emptyTitle="No results found"
        emptyDescription={results.length === 0 ? "No quiz submissions yet" : "Try adjusting your search or filter criteria"}
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
    </DashboardLayout>
  )
}
