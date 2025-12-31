/**
 * QuestionCard Component
 *
 * Displays a question with view and edit modes for the questionnaires page.
 */

import { useState, useEffect } from 'react'
import { Edit, Save, X } from 'lucide-react'
import { Badge } from './Badge'

// =============================================================================
// Types
// =============================================================================

export interface QuestionFromDB {
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

interface QuestionCardProps {
  question: QuestionFromDB
  isEditing: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: (question: QuestionFromDB) => void
  saving: boolean
  canEdit: boolean
}

// =============================================================================
// Component
// =============================================================================

export function QuestionCard({
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
