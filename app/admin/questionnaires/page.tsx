'use client'

/**
 * Questionnaires Management Page
 *
 * Teachers and admins can view and edit questions from the Supabase database.
 * Note: Adding or deleting questions is not allowed - only updates.
 * Uses global theme classes - no isDark checks needed.
 */

import { useState, useEffect } from 'react'
import { Edit, Save, X, RefreshCw, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react'
import { DashboardLayout } from '../components/layout'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { SearchInput } from '../components/ui/SearchInput'
import { EmptyState } from '../components/ui/EmptyState'
import { LoadingState } from '../components/ui/LoadingState'
import { useAdmin, DemoModeNotice } from '../context/AdminContext'

// =============================================================================
// Types
// =============================================================================

interface QuestionFromDB {
  id: number
  question_id: string
  phase: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: 'A' | 'B' | 'C' | 'D'
  nzs3500_reference: string | null
  updated_at?: string
}

// =============================================================================
// Main Component
// =============================================================================

export default function QuestionnairesPage() {
  const { isLti } = useAdmin()
  const [questions, setQuestions] = useState<QuestionFromDB[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Fetch raw questions from admin endpoint
  useEffect(() => {
    async function loadQuestions() {
      try {
        setLoading(true)
        const response = await fetch('/api/admin/questions')

        if (!response.ok) {
          throw new Error('Failed to fetch questions')
        }

        const data = await response.json()
        setQuestions(data.questions || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load questions')
      } finally {
        setLoading(false)
      }
    }

    loadQuestions()
  }, [])

  // Filter questions by search
  const filteredQuestions = questions.filter(q =>
    q.question_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.question_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.phase.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Group questions by phase
  const groupedQuestions = filteredQuestions.reduce((acc, q) => {
    if (!acc[q.phase]) {
      acc[q.phase] = []
    }
    acc[q.phase].push(q)
    return acc
  }, {} as Record<string, QuestionFromDB[]>)

  // Handle save
  const handleSave = async (question: QuestionFromDB) => {
    try {
      setSaving(true)
      setSaveMessage(null)

      const response = await fetch('/api/questions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: question.question_id,
          question_text: question.question_text,
          option_a: question.option_a,
          option_b: question.option_b,
          option_c: question.option_c,
          option_d: question.option_d,
          correct_answer: question.correct_answer,
          nzs3500_reference: question.nzs3500_reference
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update question')
      }

      // Update local state
      setQuestions(prev => prev.map(q =>
        q.question_id === question.question_id ? { ...q, ...question } : q
      ))

      setSaveMessage({ type: 'success', text: 'Question updated successfully!' })
      setEditingId(null)

      // Clear message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (err) {
      setSaveMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save'
      })
    } finally {
      setSaving(false)
    }
  }

  // Refresh questions
  const handleRefresh = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/questions')

      if (!response.ok) {
        throw new Error('Failed to fetch questions')
      }

      const data = await response.json()
      setQuestions(data.questions || [])
      setSaveMessage({ type: 'success', text: 'Questions refreshed!' })
      setTimeout(() => setSaveMessage(null), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout title="Questionnaires" subtitle="View and edit training questions">
      {/* Header Actions */}
      <Card className="mb-6 lg:w-[49%] w-full">
        <CardHeader className='p-4'>
             <div className="flex flex-col sm:flex-row gap-2 justify-between">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search questions..."
          className="w-full lg:w-1/2"
        />
        {/* <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors theme-btn-secondary disabled:theme-btn-disabled disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button> */}
      </div>
        </CardHeader>
      </Card>
   

      {/* Save Message */}
      {saveMessage && (
        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 border ${
          saveMessage.type === 'success'
            ? 'theme-bg-success theme-text-success theme-border-success'
            : 'theme-bg-error theme-text-error theme-border-error'
        }`}>
          {saveMessage.type === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {saveMessage.text}
        </div>
      )}

      {/* Demo Mode Notice */}
      <DemoModeNotice />

      {/* Info Notice */}
      <div className="mb-6 p-4 rounded-lg border theme-bg-info theme-border-info">
        <p className="text-sm theme-text-info">
          <strong>Note:</strong> {isLti
            ? 'You can edit existing questions but cannot add new ones or delete existing ones. Changes will be reflected immediately in the training simulation.'
            : 'You are viewing questions in read-only mode.'}
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent>
            <LoadingState message="Loading questions..." />
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
              <button
                onClick={handleRefresh}
                className="px-4 py-2 rounded-lg theme-btn-primary"
              >
                Try Again
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && !error && questions.length === 0 && (
        <Card>
          <EmptyState
            icon={<HelpCircle className="w-8 h-8 theme-text-muted" />}
            title="No questions found"
            description="Questions will appear here once they are added to the database."
          />
        </Card>
      )}

      {/* Questions by Phase */}
      {!loading && !error && Object.keys(groupedQuestions).length > 0 && (
        <div className="space-y-6">
          {Object.entries(groupedQuestions).map(([phase, phaseQuestions]) => (
            <Card key={phase}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3">
                    <span>{formatPhase(phase)}</span>
                    <Badge variant="info">{phaseQuestions.length} questions</Badge>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {phaseQuestions.map((question) => (
                  <QuestionCard
                    key={question.question_id}
                    question={question}
                    isEditing={editingId === question.question_id}
                    onEdit={() => setEditingId(question.question_id)}
                    onCancel={() => setEditingId(null)}
                    onSave={handleSave}
                    saving={saving}
                    canEdit={isLti}
                  />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}

// =============================================================================
// Question Card Component
// =============================================================================

interface QuestionCardProps {
  question: QuestionFromDB
  isEditing: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: (question: QuestionFromDB) => void
  saving: boolean
  canEdit: boolean
}

function QuestionCard({
  question,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  saving,
  canEdit
}: QuestionCardProps) {
  const [editData, setEditData] = useState<QuestionFromDB>(question)

  // Reset edit data when question changes or editing starts
  useEffect(() => {
    setEditData(question)
  }, [question, isEditing])

  const handleChange = (field: keyof QuestionFromDB, value: string) => {
    setEditData(prev => ({ ...prev, [field]: value }))
  }

  if (isEditing) {
    return (
      <div className="p-4 rounded-lg border-2 border-green-600 theme-bg-secondary">
        {/* Question ID & Phase (read-only) */}
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="purple">{editData.question_id}</Badge>
          <Badge variant="default">{editData.phase}</Badge>
        </div>

        {/* Question Text */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1 theme-text-secondary">
            Question Text
          </label>
          <textarea
            value={editData.question_text}
            onChange={(e) => handleChange('question_text', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-lg theme-input"
          />
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {(['A', 'B', 'C', 'D'] as const).map((letter) => {
            const field = `option_${letter.toLowerCase()}` as keyof QuestionFromDB
            const isCorrect = editData.correct_answer === letter

            return (
              <div key={letter}>
                <label className="flex items-center gap-2 text-sm font-medium mb-1 theme-text-secondary">
                  <span>Option {letter}</span>
                  {isCorrect && (
                    <Badge variant="success" className="text-xs">Correct</Badge>
                  )}
                </label>
                <input
                  type="text"
                  value={editData[field] as string}
                  onChange={(e) => handleChange(field, e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg theme-input ${
                    isCorrect ? 'border-green-500 ring-1 ring-green-500' : ''
                  }`}
                />
              </div>
            )
          })}
        </div>

        {/* Correct Answer Selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1 theme-text-secondary">
            Correct Answer
          </label>
          <div className="flex flex-wrap gap-2">
            {(['A', 'B', 'C', 'D'] as const).map((letter) => (
              <button
                key={letter}
                type="button"
                onClick={() => handleChange('correct_answer', letter)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  editData.correct_answer === letter
                    ? 'bg-green-600 text-white'
                    : 'theme-btn-secondary'
                }`}
              >
                {letter}
              </button>
            ))}
          </div>
        </div>

        {/* Reference */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1 theme-text-secondary">
            NZS3500 Reference (optional)
          </label>
          <input
            type="text"
            value={editData.nzs3500_reference || ''}
            onChange={(e) => handleChange('nzs3500_reference', e.target.value)}
            placeholder="e.g., NZS3500.2:2021 Section 4.3.1"
            className="w-full px-3 py-2 rounded-lg theme-input"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors theme-btn-secondary"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(editData)}
            disabled={saving}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors theme-btn-primary disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    )
  }

  // View mode
  return (
    <div className="p-4 rounded-lg border transition-colors theme-bg-secondary theme-border hover:opacity-90">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="purple">{question.question_id}</Badge>
          </div>

          {/* Question Text */}
          <p className="font-medium mb-3 theme-text-primary">
            {question.question_text}
          </p>

          {/* Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(['A', 'B', 'C', 'D'] as const).map((letter) => {
              const field = `option_${letter.toLowerCase()}` as keyof QuestionFromDB
              const isCorrect = question.correct_answer === letter

              return (
                <div
                  key={letter}
                  className={`text-sm px-3 py-2 rounded ${
                    isCorrect
                      ? 'theme-bg-success theme-text-success border theme-border-success'
                      : 'theme-bg-tertiary theme-text-muted'
                  }`}
                >
                  <span className="font-medium">{letter}.</span> {question[field] as string}
                </div>
              )
            })}
          </div>

          {/* Reference */}
          {question.nzs3500_reference && (
            <p className="mt-2 text-xs theme-text-muted">
              Ref: {question.nzs3500_reference}
            </p>
          )}
        </div>

        {/* Edit Button - Only shown for LTI users */}
        {canEdit && (
          <button
            onClick={onEdit}
            className="ml-4 p-2 rounded-lg transition-colors theme-btn-ghost"
          >
            <Edit className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// Helpers
// =============================================================================

function formatPhase(phase: string): string {
  return phase
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
}
