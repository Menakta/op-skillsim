'use client'

/**
 * Results Page
 *
 * Displays quiz results from quiz_responses table.
 * Primary data source is quiz_responses, with student info from training_sessions.
 */

import { useState, useEffect, useMemo } from 'react'
import { Award, CheckCircle, XCircle, Clock, TrendingUp, Download, Timer } from 'lucide-react'
import { DashboardLayout } from '../components/layout'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table'
import { Badge } from '../components/ui/Badge'
import { SearchInput } from '../components/ui/SearchInput'
import { EmptyState } from '../components/ui/EmptyState'
import { LoadingState } from '../components/ui/LoadingState'
import { Pagination } from '../components/ui/Pagination'
import { StatCard } from '../components'

// =============================================================================
// Constants
// =============================================================================

const ITEMS_PER_PAGE = 10

// =============================================================================
// Types
// =============================================================================

interface QuestionDetail {
  questionId: string
  answer: string
  correct: boolean
  attempts: number
  time: number
}

interface QuizResult {
  id: string
  sessionId: string
  studentName: string
  studentEmail: string
  courseName: string
  courseId: string
  totalQuestions: number
  correctCount: number
  scorePercentage: number
  passed: boolean
  status: string
  currentPhase: string
  timeSpent: number
  answeredAt: string
  startedAt: string
  questions: QuestionDetail[]
}

interface Stats {
  totalResults: number
  passedCount: number
  failedCount: number
  avgScore: number
  passRate: number
}

interface Course {
  id: string
  title: string
}

type ResultFilter = 'all' | 'passed' | 'failed'

// =============================================================================
// Main Component
// =============================================================================

export default function ResultsPage() {
  const [results, setResults] = useState<QuizResult[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all')
  const [courseFilter, setCourseFilter] = useState<string>('all')
  const [selectedResult, setSelectedResult] = useState<QuizResult | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    fetchResults()
  }, [])

  const fetchResults = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/admin/results')
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch results')
      }

      setResults(data.results || [])
      setStats(data.stats)
      setCourses(data.courses || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load results')
    } finally {
      setIsLoading(false)
    }
  }

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

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, resultFilter, courseFilter])

  // Paginated results
  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredResults.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredResults, currentPage])

  const totalPages = Math.ceil(filteredResults.length / ITEMS_PER_PAGE)

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
          {error}
        </div>
      </DashboardLayout>
    )
  }

  const avgScore = stats?.avgScore || 0

  return (
    <DashboardLayout title="Results" subtitle="View and analyze quiz results">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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

              {/* Export Button */}
              <button className="flex items-center gap-2 px-4 py-2 bg-[#39BEAE] hover:bg-[#2ea89a] text-white rounded-lg transition-colors">
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table - Desktop */}
      <Card className="hidden md:block">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Quiz Results</CardTitle>
            <span className="text-gray-400 text-sm">{filteredResults.length} results</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredResults.length === 0 ? (
            <EmptyState
              icon={<Award className="w-8 h-8 text-gray-400" />}
              title="No results found"
              description={results.length === 0 ? "No quiz submissions yet" : "Try adjusting your search or filter criteria"}
              className="py-12"
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead className="hidden lg:table-cell">Course</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Questions</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead className="hidden lg:table-cell">Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedResults.map((result) => (
                    <TableRow
                      key={result.id}
                      onClick={() => setSelectedResult(result)}
                      className="cursor-pointer"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-medium">
                              {result.studentName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="theme-text-primary font-medium truncate">{result.studentName}</p>
                            <p className="theme-text-muted text-xs truncate">{result.studentEmail}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <p className="theme-text-primary">{result.courseName}</p>
                      </TableCell>
                      <TableCell>
                        <span className={`text-lg font-bold ${
                          result.scorePercentage >= 75 ? 'text-green-400' :
                          result.scorePercentage >= 50 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {result.scorePercentage}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="theme-text-primary">{result.correctCount}</span>
                        <span className="theme-text-muted">/{result.totalQuestions}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={result.passed ? 'success' : 'danger'}>
                          {result.passed ? 'Passed' : 'Failed'}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="theme-text-secondary">{formatDate(result.answeredAt)}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t theme-border">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filteredResults.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Results Cards - Mobile */}
      <div className="md:hidden space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-sm font-medium theme-text-primary">Quiz Results</span>
          <span className="text-gray-400 text-sm">{filteredResults.length} results</span>
        </div>
        {filteredResults.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Award className="w-8 h-8 text-gray-400" />}
              title="No results found"
              description={results.length === 0 ? "No quiz submissions yet" : "Try adjusting your search or filter criteria"}
              className="py-12"
            />
          </Card>
        ) : (
          <>
            {paginatedResults.map((result) => (
              <Card
                key={result.id}
                className="p-4 cursor-pointer"
                onClick={() => setSelectedResult(result)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-medium text-sm">
                        {result.studentName.split(' ').map(n => n[0]).join('').substring(0, 2)}
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
            ))}
            {totalPages > 1 && (
              <div className="py-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredResults.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </>
        )}
      </div>

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

// =============================================================================
// Sub-components
// =============================================================================

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
        px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer
        ${active ? 'bg-[#39BEAE] text-white' : 'theme-bg-tertiary theme-text-primary hover:theme-bg-hover'}
      `}
    >
      {children}
    </button>
  )
}

interface ResultDetailModalProps {
  result: QuizResult
  onClose: () => void
}

function ResultDetailModal({ result, onClose }: ResultDetailModalProps) {
  // Calculate total time from all questions
  const totalQuizTime = result.questions.reduce((acc, q) => acc + (q.time || 0), 0)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <div
        className="theme-bg-secondary rounded-t-xl sm:rounded-xl w-full sm:max-w-2xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-700">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold theme-text-primary">Quiz Results</h2>
              <p className="theme-text-muted text-sm mt-1 truncate">{result.courseName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 theme-text-muted hover:theme-text-primary hover:theme-bg-hover cursor-pointer rounded-lg transition-colors text-2xl leading-none flex-shrink-0"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[65vh]">
          {/* Student Info */}
          <div className="flex items-center gap-3 sm:gap-4 mb-6 p-3 sm:p-4 theme-bg-tertiary rounded-lg">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#39BEAE] flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm sm:text-base">
                {result.studentName.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </span>
            </div>
            <div className="min-w-0">
              <p className="theme-text-primary font-medium truncate">{result.studentName}</p>
              <p className="theme-text-muted text-sm truncate">{result.studentEmail}</p>
            </div>
          </div>

          {/* Score Display */}
          <div className="text-center mb-6">
            <div className={`text-5xl sm:text-6xl font-bold ${result.passed ? 'text-green-400' : 'text-red-400'}`}>
              {result.scorePercentage}%
            </div>
            <p className="theme-text-secondary mt-2">
              {result.correctCount} of {result.totalQuestions} questions correct
            </p>
            <div className="flex justify-center gap-2 mt-3">
              <Badge variant={result.passed ? 'success' : 'danger'} className="text-sm px-3 py-1">
                {result.passed ? 'PASSED' : 'FAILED'}
              </Badge>
            </div>
          </div>

          {/* Quiz Stats Summary */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
            <div className="p-3 sm:p-4 theme-bg-tertiary rounded-lg text-center">
              <p className="text-2xl font-bold theme-text-primary">{result.totalQuestions}</p>
              <p className="text-xs theme-text-muted">Questions</p>
            </div>
            <div className="p-3 sm:p-4 theme-bg-tertiary rounded-lg text-center">
              <p className="text-2xl font-bold text-green-400">{result.correctCount}</p>
              <p className="text-xs theme-text-muted">Correct</p>
            </div>
            <div className="p-3 sm:p-4 theme-bg-tertiary rounded-lg text-center">
              <p className="text-2xl font-bold text-red-400">{result.totalQuestions - result.correctCount}</p>
              <p className="text-xs theme-text-muted">Incorrect</p>
            </div>
          </div>

          {/* Individual Question Results */}
          {result.questions.length > 0 && (
            <div className="mb-6">
              <h3 className="theme-text-primary font-medium mb-3 flex items-center gap-2">
                <Award className="w-4 h-4" />
                Question Details
              </h3>
              <div className="space-y-2">
                {result.questions
                  .sort((a, b) => a.questionId.localeCompare(b.questionId))
                  .map((question) => (
                  <div
                    key={question.questionId}
                    className={`p-3 rounded-lg border ${
                      question.correct
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          question.correct ? 'bg-green-500' : 'bg-red-500'
                        }`}>
                          {question.correct ? (
                            <CheckCircle className="w-4 h-4 text-white" />
                          ) : (
                            <XCircle className="w-4 h-4 text-white" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium theme-text-primary">
                            {question.questionId.toUpperCase().replace('_', ' ')}
                          </p>
                          <p className="text-xs theme-text-muted">
                            Answer: {question.answer} • Attempts: {question.attempts}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs theme-text-muted">
                        <Timer className="w-3 h-3" />
                        {formatTimeMs(question.time)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Time Info */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
            <div className="p-3 sm:p-4 theme-bg-tertiary rounded-lg">
              <div className="flex items-center gap-2 theme-text-muted mb-1">
                <Timer className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm">Total Quiz Time</span>
              </div>
              <p className="theme-text-primary font-medium text-sm sm:text-base">{formatTimeMs(totalQuizTime)}</p>
            </div>
            <div className="p-3 sm:p-4 theme-bg-tertiary rounded-lg">
              <div className="flex items-center gap-2 theme-text-muted mb-1">
                <Clock className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm">Session Time</span>
              </div>
              <p className="theme-text-primary font-medium text-sm sm:text-base">{formatTime(result.timeSpent)}</p>
            </div>
          </div>

          {/* Timeline */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="p-3 sm:p-4 theme-bg-tertiary rounded-lg">
              <p className="text-xs theme-text-muted mb-1">Started</p>
              <p className="theme-text-primary font-medium text-sm">{formatDate(result.startedAt)}</p>
            </div>
            <div className="p-3 sm:p-4 theme-bg-tertiary rounded-lg">
              <p className="text-xs theme-text-muted mb-1">Submitted</p>
              <p className="theme-text-primary font-medium text-sm">{formatDate(result.answeredAt)}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-[#39BEAE] hover:bg-[#2ea89a] cursor-pointer text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// Helper functions
function formatDate(dateString: string): string {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-NZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatTime(seconds: number): string {
  if (!seconds || seconds === 0) return '0s'
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins < 60) return `${mins}m ${secs}s`
  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  return `${hours}h ${remainingMins}m`
}

function formatTimeMs(ms: number): string {
  if (!ms || ms === 0) return '0s'
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${secs}s`
}
