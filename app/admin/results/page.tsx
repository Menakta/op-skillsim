'use client'

/**
 * Results Page
 *
 * Displays assessment results for all students with filtering and details.
 */

import { useState } from 'react'
import { Award, CheckCircle, XCircle, Clock, TrendingUp, Download } from 'lucide-react'
import { DashboardLayout } from '../components/layout'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table'
import { Badge } from '../components/ui/Badge'
import { SearchInput } from '../components/ui/SearchInput'
import { EmptyState } from '../components/ui/EmptyState'
import { mockResults, mockQuestionnaires } from '../data/mockData'
import type { StudentResult } from '../types'
import { StatCard } from '../components'

type ResultFilter = 'all' | 'passed' | 'failed'

export default function ResultsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all')
  const [quizFilter, setQuizFilter] = useState<string>('all')
  const [selectedResult, setSelectedResult] = useState<StudentResult | null>(null)

  // Filter results
  const filteredResults = mockResults.filter(result => {
    const matchesSearch =
      result.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.questionnaireTitle.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesResult =
      resultFilter === 'all' ||
      (resultFilter === 'passed' && result.passed) ||
      (resultFilter === 'failed' && !result.passed)

    const matchesQuiz = quizFilter === 'all' || result.questionnaireId === quizFilter

    return matchesSearch && matchesResult && matchesQuiz
  })

  // Calculate stats
  const totalResults = mockResults.length
  const passedCount = mockResults.filter(r => r.passed).length
  const failedCount = mockResults.filter(r => !r.passed).length
  const avgScore = Math.round(mockResults.reduce((acc, r) => acc + r.percentage, 0) / totalResults)
  const passRate = Math.round((passedCount / totalResults) * 100)

  return (
    <DashboardLayout title="Results" subtitle="View and analyze assessment results">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Submissions"
          value={totalResults}
          icon={<Award className="w-5 h-5 text-purple-400" />}
          color="purple"
        />
        <StatCard
          label="Passed"
          value={passedCount}
          icon={<CheckCircle className="w-5 h-5 text-green-400" />}
          color="green"
        />
        <StatCard
          label="Failed"
          value={failedCount}
          icon={<XCircle className="w-5 h-5 text-red-400" />}
          color="red"
        />
        <StatCard
          label="Pass Rate"
          value={`${passRate}%`}
          icon={<TrendingUp className="w-5 h-5 text-blue-400" />}
          color="blue"
        />
      </div>

      {/* Average Score Chart */}
      <Card className="mb-6">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="theme-text-muted text-sm">Average Score Across All Assessments</p>
              <p className="text-4xl font-bold theme-text-primary mt-1">{avgScore}%</p>
            </div>
            <div className="w-32 h-32 relative">
              <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#ffffffff"
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
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-col lg:flex-row gap-4 justify-between">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by student or quiz..."
              className="w-full lg:w-80"
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

              {/* Quiz Filter */}
              <select
                value={quizFilter}
                onChange={(e) => setQuizFilter(e.target.value)}
                className="px-4 py-2 bg-[#181818] border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">All Quizzes</option>
                {mockQuestionnaires.map((quiz) => (
                  <option key={quiz.id} value={quiz.id}>
                    {quiz.title}
                  </option>
                ))}
              </select>

              {/* Export Button */}
              <button className="flex items-center gap-2 px-4 py-2 bg-[#39BEAE] text-white rounded-lg transition-colors">
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
            <CardTitle>Assessment Results</CardTitle>
            <span className="text-gray-400 text-sm">{filteredResults.length} results</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredResults.length === 0 ? (
            <EmptyState
              icon={<Award className="w-8 h-8 text-gray-400" />}
              title="No results found"
              description="Try adjusting your search or filter criteria"
              className="py-12"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead className="hidden lg:table-cell">Assessment</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden xl:table-cell">Time Spent</TableHead>
                  <TableHead className="hidden lg:table-cell">Completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResults.map((result) => (
                  <TableRow
                    key={result.id}
                    onClick={() => setSelectedResult(result)}
                    className="cursor-pointer"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-medium">
                            {result.studentName.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="theme-text-primary font-medium truncate">{result.studentName}</p>
                          <p className="theme-text-muted text-xs truncate">{result.studentEmail}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <p className="theme-text-primary">{result.questionnaireTitle}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold ${
                          result.percentage >= 80 ? 'text-green-400' :
                          result.percentage >= 60 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {result.percentage}%
                        </span>
                        <span className="theme-text-muted text-sm hidden sm:inline">
                          ({result.score}/{result.totalPoints})
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={result.passed ? 'success' : 'danger'}>
                        {result.passed ? 'Passed' : 'Failed'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <div className="flex items-center gap-2 theme-text-secondary">
                        <Clock className="w-4 h-4" />
                        {formatTime(result.timeSpent)}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="theme-text-secondary">{formatDate(result.completedAt)}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Results Cards - Mobile */}
      <div className="md:hidden space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-sm font-medium theme-text-primary">Assessment Results</span>
          <span className="text-gray-400 text-sm">{filteredResults.length} results</span>
        </div>
        {filteredResults.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Award className="w-8 h-8 text-gray-400" />}
              title="No results found"
              description="Try adjusting your search or filter criteria"
              className="py-12"
            />
          </Card>
        ) : (
          filteredResults.map((result) => (
            <Card
              key={result.id}
              className="p-4 cursor-pointer"
              onClick={() => setSelectedResult(result)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-medium text-sm">
                      {result.studentName.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="theme-text-primary font-medium truncate">{result.studentName}</p>
                    <p className="theme-text-muted text-xs truncate">{result.questionnaireTitle}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`text-xl font-bold ${
                    result.percentage >= 80 ? 'text-green-400' :
                    result.percentage >= 60 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {result.percentage}%
                  </span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <Badge variant={result.passed ? 'success' : 'danger'}>
                  {result.passed ? 'Passed' : 'Failed'}
                </Badge>
                <div className="flex items-center gap-3 text-xs theme-text-muted">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(result.timeSpent)}
                  </span>
                  <span>{formatDate(result.completedAt)}</span>
                </div>
              </div>
            </Card>
          ))
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

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  color: 'purple' | 'green' | 'red' | 'blue'
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
        px-3 py-1.5 rounded-md text-sm font-medium transition-colors
        ${active ? 'bg-[#39BEAE] text-white' : 'theme-bg-tertiary theme-text-primary hover:theme-text-primary hover:theme-bg-hover'}
      `}
    >
      {children}
    </button>
  )
}

interface ResultDetailModalProps {
  result: StudentResult
  onClose: () => void
}

function ResultDetailModal({ result, onClose }: ResultDetailModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <div
        className="theme-bg-secondary rounded-t-xl sm:rounded-xl w-full sm:max-w-lg max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-700">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold theme-text-primary">Result Details</h2>
              <p className="theme-text-muted text-sm mt-1 truncate">{result.questionnaireTitle}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 theme-text-primary hover:text-white hover:theme-bg-hover cursor-pointer rounded-lg transition-colors text-2xl leading-none flex-shrink-0"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[60vh]">
          {/* Student Info */}
          <div className="flex items-center gap-3 sm:gap-4 mb-6 p-3 sm:p-4 theme-bg-tertiary rounded-lg">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#39BEAE] flex items-center justify-center flex-shrink-0">
              <span className="theme-text-primary font-bold text-sm sm:text-base">
                {result.studentName.split(' ').map(n => n[0]).join('')}
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
              {result.percentage}%
            </div>
            <p className="theme-text-secondary mt-2">
              {result.score} / {result.totalPoints} points
            </p>
            <Badge variant={result.passed ? 'success' : 'danger'} className="mt-3">
              {result.passed ? 'PASSED' : 'FAILED'}
            </Badge>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="p-3 sm:p-4 theme-bg-tertiary rounded-lg">
              <div className="flex items-center gap-2 theme-text-primary mb-1">
                <Clock className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm">Time Spent</span>
              </div>
              <p className="theme-text-primary font-medium text-sm sm:text-base">{formatTime(result.timeSpent)}</p>
            </div>
            <div className="p-3 sm:p-4 theme-bg-tertiary rounded-lg">
              <div className="flex items-center gap-2 theme-text-primary mb-1">
                <Award className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm">Completed</span>
              </div>
              <p className="theme-text-primary font-medium text-sm sm:text-base">{formatDate(result.completedAt)}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-[#39BEAE] cursor-pointer text-white rounded-lg transition-colors"
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
  const date = new Date(dateString)
  return date.toLocaleDateString('en-NZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${secs}s`
}
