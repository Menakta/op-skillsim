/**
 * Result Detail Modal
 *
 * Displays detailed quiz results for a student.
 */

import { Award, CheckCircle, XCircle, Clock, Timer } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { BaseModal } from './BaseModal'
import type { QuizResult } from '../../types'
import { formatDate, formatTime, formatTimeMs, getInitials } from '../../utils'

interface ResultDetailModalProps {
  result: QuizResult
  onClose: () => void
}

export function ResultDetailModal({ result, onClose }: ResultDetailModalProps) {
  // Calculate total time from all questions
  const totalQuizTime = result.questions.reduce((acc, q) => acc + (q.time || 0), 0)

  return (
    <BaseModal onClose={onClose} title="Quiz Results" subtitle={result.courseName}>
      {/* Student Info */}
      <div className="flex items-center gap-3 sm:gap-4 mb-6 p-3 sm:p-4 theme-bg-tertiary rounded-lg">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#39BEAE] flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm sm:text-base">
            {getInitials(result.studentName)}
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
    </BaseModal>
  )
}
