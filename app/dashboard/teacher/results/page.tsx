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
              <p className="text-gray-400 text-sm">Average Score Across All Assessments</p>
              <p className="text-4xl font-bold text-white mt-1">{avgScore}%</p>
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
                <span className="text-2xl font-bold text-white">{avgScore}%</span>
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
              <div className="flex gap-1 bg-gray-700 rounded-lg p-1">
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
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Quizzes</option>
                {mockQuestionnaires.map((quiz) => (
                  <option key={quiz.id} value={quiz.id}>
                    {quiz.title}
                  </option>
                ))}
              </select>

              {/* Export Button */}
              <button className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
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
                  <TableHead>Assessment</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time Spent</TableHead>
                  <TableHead>Completed</TableHead>
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
                        <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                          <span className="text-white text-xs font-medium">
                            {result.studentName.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-medium">{result.studentName}</p>
                          <p className="text-gray-500 text-xs">{result.studentEmail}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-white">{result.questionnaireTitle}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold ${
                          result.percentage >= 80 ? 'text-green-400' :
                          result.percentage >= 60 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {result.percentage}%
                        </span>
                        <span className="text-gray-500 text-sm">
                          ({result.score}/{result.totalPoints})
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={result.passed ? 'success' : 'danger'}>
                        {result.passed ? 'Passed' : 'Failed'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Clock className="w-4 h-4" />
                        {formatTime(result.timeSpent)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-gray-400">{formatDate(result.completedAt)}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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

function StatCard({ label, value, icon, color }: StatCardProps) {
  const bgColors = {
    purple: 'bg-purple-600/20',
    green: 'bg-green-600/20',
    red: 'bg-red-600/20',
    blue: 'bg-blue-600/20',
  }

  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-gray-400 text-sm">{label}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bgColors[color]}`}>
          {icon}
        </div>
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
        px-3 py-1.5 rounded-md text-sm font-medium transition-colors
        ${active ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Result Details</h2>
              <p className="text-gray-400 text-sm mt-1">{result.questionnaireTitle}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Student Info */}
          <div className="flex items-center gap-4 mb-6 p-4 bg-gray-900/50 rounded-lg">
            <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center">
              <span className="text-white font-bold">
                {result.studentName.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div>
              <p className="text-white font-medium">{result.studentName}</p>
              <p className="text-gray-400 text-sm">{result.studentEmail}</p>
            </div>
          </div>

          {/* Score Display */}
          <div className="text-center mb-6">
            <div className={`text-6xl font-bold ${result.passed ? 'text-green-400' : 'text-red-400'}`}>
              {result.percentage}%
            </div>
            <p className="text-gray-400 mt-2">
              {result.score} / {result.totalPoints} points
            </p>
            <Badge variant={result.passed ? 'success' : 'danger'} className="mt-3">
              {result.passed ? 'PASSED' : 'FAILED'}
            </Badge>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-900/50 rounded-lg">
              <div className="flex items-center gap-2 text-gray-400 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Time Spent</span>
              </div>
              <p className="text-white font-medium">{formatTime(result.timeSpent)}</p>
            </div>
            <div className="p-4 bg-gray-900/50 rounded-lg">
              <div className="flex items-center gap-2 text-gray-400 mb-1">
                <Award className="w-4 h-4" />
                <span className="text-sm">Completed</span>
              </div>
              <p className="text-white font-medium">{formatDate(result.completedAt)}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Close
          </button>
          <button className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
            View Details
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
