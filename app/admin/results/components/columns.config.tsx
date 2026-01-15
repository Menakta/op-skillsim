/**
 * Results Column Configurations
 *
 * Column definitions for DataTable and PDF export.
 */

import { Badge, type Column } from '../../components'
import type { QuizResult } from '../../types'
import { formatDate, getInitials, type ExportColumn } from '../../utils'

// =============================================================================
// PDF Export Columns
// =============================================================================

export const PDF_COLUMNS: ExportColumn<QuizResult>[] = [
  { key: 'studentName', header: 'Student Name' },
  { key: 'studentEmail', header: 'Email' },
  { key: 'courseName', header: 'Course' },
  { key: 'scorePercentage', header: 'Score (%)' },
  { key: 'correctCount', header: 'Correct' },
  { key: 'totalQuestions', header: 'Total' },
  { key: 'passed', header: 'Result', getValue: (r: QuizResult) => r.passed ? 'Passed' : 'Failed' },
  { key: 'answeredAt', header: 'Submitted', getValue: (r: QuizResult) => formatDate(r.answeredAt) },
]

// =============================================================================
// DataTable Columns
// =============================================================================

export const resultColumns: Column<QuizResult>[] = [
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
]
