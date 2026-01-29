'use client'

/**
 * Training Results Page (Public)
 *
 * Dedicated results page for LTI students who complete training.
 * This page is PUBLIC - no authentication required.
 * Data is passed via URL parameters from TrainingCompleteModal.
 * Session is already cleared before arriving here.
 *
 * URL Parameters:
 * - data: base64 encoded JSON with student, session, and quiz data
 * - returnUrl: string - LTI return URL (encoded)
 * - isLti: 'true' | 'false'
 */

import { useEffect, useState, Suspense, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import {
  CheckCircle,
  Download,
  ExternalLink,
  Clock,
  Award,
  Target,
  User,
  Mail,
  Building,
  BookOpen,
  Trophy,
  AlertCircle,
} from 'lucide-react'
import { useTheme } from '@/app/context/ThemeContext'
import { generateResultPDF } from '@/app/components/ResultExportPDF'
import type { ResultPDFData } from '@/app/components/ResultExportPDF'
import type { QuestionDataMap } from '@/app/types/quiz.types'

// =============================================================================
// Types
// =============================================================================

interface StudentInfo {
  full_name: string
  email: string
  course_name: string
  institution: string
}

interface SessionInfo {
  phases_completed: number
  total_time_spent: number
  overall_progress: number
}

interface TrainingResultsData {
  student: StudentInfo
  session: SessionInfo
  questionData: QuestionDataMap
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatTime(seconds: number): string {
  if (!seconds || seconds === 0) return '0s'
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`
}

function formatMs(ms: number): string {
  if (!ms || ms === 0) return '0s'
  const totalSeconds = Math.round(ms / 1000)
  return formatTime(totalSeconds)
}

function calculateGrade(percentage: number): { grade: string; color: string } {
  if (percentage >= 90) return { grade: 'A', color: 'text-green-500' }
  if (percentage >= 80) return { grade: 'B', color: 'text-blue-500' }
  if (percentage >= 70) return { grade: 'C', color: 'text-yellow-500' }
  if (percentage >= 60) return { grade: 'D', color: 'text-orange-500' }
  return { grade: 'F', color: 'text-red-500' }
}

// =============================================================================
// Training Results Content Component
// =============================================================================

function TrainingResultsContent() {
  const searchParams = useSearchParams()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<TrainingResultsData | null>(null)
  const [returnUrl, setReturnUrl] = useState<string | null>(null)
  const [isLti, setIsLti] = useState(false)

  // Parse URL parameters and decode data
  useEffect(() => {
    const urlReturnUrl = searchParams.get('returnUrl')
    const urlIsLti = searchParams.get('isLti') === 'true'
    const encodedData = searchParams.get('data')

    setReturnUrl(urlReturnUrl ? decodeURIComponent(urlReturnUrl) : null)
    setIsLti(urlIsLti)

    if (encodedData) {
      try {
        // Decode base64 and parse JSON
        const decodedJson = decodeURIComponent(atob(encodedData))
        const parsedData = JSON.parse(decodedJson)

        setData({
          student: {
            full_name: parsedData.student?.full_name || 'N/A',
            email: parsedData.student?.email || 'N/A',
            course_name: parsedData.student?.course_name || 'OP-Skillsim Plumbing Training',
            institution: parsedData.student?.institution || 'Open Polytechnic Kuratini Tuwhera',
          },
          session: {
            phases_completed: parsedData.session?.phases_completed || 0,
            total_time_spent: parsedData.session?.total_time_spent || 0,
            overall_progress: parsedData.session?.overall_progress || 0,
          },
          questionData: parsedData.questionData || {},
        })
      } catch (err) {
        console.error('Failed to parse training data:', err)
        setError('Failed to load training results. The data may be corrupted.')
      }
    } else {
      setError('No training data provided. Please complete training first.')
    }
  }, [searchParams])

  // Prevent going back to the stream
  useEffect(() => {
    // Replace current history state to prevent back navigation
    window.history.replaceState(null, '', window.location.href)

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault()
      // Push state again to prevent leaving
      window.history.pushState(null, '', window.location.href)
    }

    // Push initial state
    window.history.pushState(null, '', window.location.href)
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  // Handle PDF export
  const handleExportPDF = useCallback(async () => {
    if (!data) return

    setIsExporting(true)
    try {
      const pdfData: ResultPDFData = {
        student: data.student,
        session: data.session,
        questionData: data.questionData,
      }
      await generateResultPDF(pdfData)
    } catch (err) {
      console.error('Failed to export PDF:', err)
    } finally {
      setIsExporting(false)
    }
  }, [data])

  // Handle return to course
  const handleReturnToCourse = useCallback(() => {
    if (returnUrl) {
      window.location.href = returnUrl
    } else if (isLti) {
      // Try to close window for LTI without return URL
      window.close()
      alert('Please close this browser tab to return to your course.')
    } else {
      window.location.href = '/login'
    }
  }, [returnUrl, isLti])

  // Calculate quiz stats
  const quizStats = data ? (() => {
    const entries = Object.entries(data.questionData)
    const totalQuestions = entries.length
    const correctAnswers = entries.filter(([, q]) => q.correct).length
    const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0
    const totalAttempts = entries.reduce((sum, [, q]) => sum + q.attempts, 0)
    const avgTime = entries.length > 0
      ? Math.round(entries.reduce((sum, [, q]) => sum + q.time, 0) / entries.length)
      : 0

    return { totalQuestions, correctAnswers, percentage, totalAttempts, avgTime }
  })() : null

  const gradeInfo = quizStats ? calculateGrade(quizStats.percentage) : null

  // Error state
  if (error || !data) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${isDark ? 'bg-[#000000]/80' : 'bg-[#dee5e6]'}`}>
        <div className={`max-w-md w-full p-6 rounded-2xl ${isDark ? 'bg-[#0A0A0A] border-gray-800' : 'bg-white border-gray-200'} border`}>
          <div className="flex justify-center mb-4">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
          <h1 className={`text-xl font-bold text-center mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Error Loading Results
          </h1>
          <p className={`text-center mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {error || 'Unable to load your training results.'}
          </p>
          <button
            onClick={() => window.location.href = '/login'}
            className="w-full py-3 px-4 bg-[#39BEAE] hover:bg-[#2da89a] text-white font-medium rounded-xl transition-colors"
          >
            Return to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#000000]/80' : 'bg-[#dee5e6]'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-10 border-b ${isDark ? 'bg-[#0A0A0A] border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src={isDark ? '/logos/Dark_logo.png' : '/logos/Light_Logo.png'}
              alt="OP SkillSim"
              width={100}
              height={32}
              style={{ width: 'auto', height: 'auto' }}
              priority
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                isDark
                  ? 'bg-gray-800 hover:bg-gray-700 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
              } ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'Exporting...' : 'Export PDF'}
            </button>
            <button
              onClick={handleReturnToCourse}
              className="flex items-center gap-2 px-4 py-2 bg-[#39BEAE] hover:bg-[#2da89a] text-white rounded-lg font-medium transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Return to Course
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Success Banner */}
        <div className={`mb-6 p-6 rounded-2xl border ${
          isDark ? 'bg-[#0A0A0A] border-gray-800' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <div>
              <h1 className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Congratulations, {data.student.full_name}!
              </h1>
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                You have successfully completed your plumbing training session.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#39BEAE] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-6 h-6 text-white/70" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">{data.session.overall_progress}%</div>
            <div className="text-sm text-white/70">Progress</div>
          </div>

          <div className="bg-[#39BEAE] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <Award className="w-6 h-6 text-white/70" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">{data.session.phases_completed}/6</div>
            <div className="text-sm text-white/70">Phases</div>
          </div>

          <div className="bg-[#39BEAE] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-6 h-6 text-white/70" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">{formatTime(data.session.total_time_spent)}</div>
            <div className="text-sm text-white/70">Time Spent</div>
          </div>

          <div className="bg-[#39BEAE] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <Trophy className="w-6 h-6 text-white/70" />
            </div>
            <div className={`text-3xl font-bold text-white mb-1`}>
              {quizStats?.correctAnswers}/{quizStats?.totalQuestions}
            </div>
            <div className="text-sm text-white/70">Quiz Score</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Student Information */}
          <div className={`rounded-2xl border ${isDark ? 'bg-[#0A0A0A] border-gray-800' : 'bg-white border-gray-200'}`}>
            <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
              <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Student Information
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <User className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                </div>
                <div>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Full Name</p>
                  <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{data.student.full_name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <Mail className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                </div>
                <div>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Email</p>
                  <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{data.student.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <BookOpen className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                </div>
                <div>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Course</p>
                  <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{data.student.course_name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <Building className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                </div>
                <div>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Institution</p>
                  <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{data.student.institution}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quiz Results Table */}
          <div className={`lg:col-span-2 rounded-2xl border ${isDark ? 'bg-[#0A0A0A] border-gray-800' : 'bg-white border-gray-200'}`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
              <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Quiz Results
              </h2>
              {gradeInfo && (
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Grade:</span>
                  <span className={`text-lg font-bold ${gradeInfo.color}`}>{gradeInfo.grade}</span>
                  <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>({quizStats?.percentage}%)</span>
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={isDark ? 'bg-gray-900' : 'bg-gray-50'}>
                    <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      #
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Answer
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Result
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Time
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Attempts
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-gray-800' : 'divide-gray-200'}`}>
                  {Object.entries(data.questionData)
                    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
                    .map(([key, question], index) => (
                      <tr key={key} className={isDark ? 'hover:bg-gray-900/50' : 'hover:bg-gray-50'}>
                        <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          {index + 1}
                        </td>
                        <td className={`px-4 py-3 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {question.answer}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            question.correct
                              ? 'bg-green-500/20 text-green-500'
                              : 'bg-red-500/20 text-red-500'
                          }`}>
                            {question.correct ? 'Correct' : 'Incorrect'}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {formatMs(question.time)}
                        </td>
                        <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {question.attempts}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Quiz Summary */}
            <div className={`px-6 py-4 border-t ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex flex-wrap gap-6 justify-between">
                <div>
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total Score: </span>
                  <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {quizStats?.correctAnswers} / {quizStats?.totalQuestions}
                  </span>
                </div>
                <div>
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total Attempts: </span>
                  <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {quizStats?.totalAttempts}
                  </span>
                </div>
                <div>
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Avg. Time: </span>
                  <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {formatMs(quizStats?.avgTime || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className={`mt-8 p-6 rounded-2xl border ${isDark ? 'bg-[#0A0A0A] border-gray-800' : 'bg-white border-gray-200'}`}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Your training has been completed and recorded. You can export your results as a PDF for your records.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={`py-6 text-center border-t ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
        <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Open Polytechnic New Zealand Te Pukenga
        </p>
      </footer>
    </div>
  )
}

// =============================================================================
// Main Page Component with Suspense
// =============================================================================

export default function TrainingResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#1a2525] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#39BEAE] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading your results...</p>
        </div>
      </div>
    }>
      <TrainingResultsContent />
    </Suspense>
  )
}
