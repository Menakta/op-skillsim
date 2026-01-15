'use client'

/**
 * Questionnaires Management Page
 *
 * Teachers and admins can view and edit questions from the Supabase database.
 * Note: Adding or deleting questions is not allowed - only updates.
 * Uses global theme classes - no isDark checks needed.
 */

import { useState, useEffect, useMemo } from 'react'
import { AlertCircle, CheckCircle, HelpCircle } from 'lucide-react'
import { DashboardLayout } from '../components/layout'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  SearchInput,
  EmptyState,
  LoadingState,
  Pagination,
  QuestionCard,
  type QuestionFromDB,
} from '../components'
import { useAdmin, DemoModeNotice } from '../context/AdminContext'
import { formatPhase } from '../utils'
import { useQuestions, useUpdateQuestion } from '../hooks'

// =============================================================================
// Constants
// =============================================================================

const ITEMS_PER_PAGE = 10

// =============================================================================
// Main Component
// =============================================================================

export default function QuestionnairesPage() {
  const { isLti } = useAdmin()
  const { data: questions = [], isLoading, error, refetch } = useQuestions()
  const updateQuestion = useUpdateQuestion()

  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [phasePagination, setPhasePagination] = useState<Record<string, number>>({})

  // Filter questions by search
  const filteredQuestions = useMemo(() => {
    return questions.filter(q =>
      q.question_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.question_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.phase.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [questions, searchQuery])

  // Reset pagination when search changes
  useEffect(() => {
    setPhasePagination({})
  }, [searchQuery])

  // Group questions by phase
  const groupedQuestions = useMemo(() => {
    return filteredQuestions.reduce((acc, q) => {
      if (!acc[q.phase]) {
        acc[q.phase] = []
      }
      acc[q.phase].push(q)
      return acc
    }, {} as Record<string, QuestionFromDB[]>)
  }, [filteredQuestions])

  // Get page for a phase
  const getPhaseCurrentPage = (phase: string) => phasePagination[phase] || 1

  // Set page for a phase
  const setPhaseCurrentPage = (phase: string, page: number) => {
    setPhasePagination(prev => ({ ...prev, [phase]: page }))
  }

  // Get paginated questions for a phase
  const getPaginatedQuestions = (phase: string, phaseQuestions: QuestionFromDB[]) => {
    const currentPage = getPhaseCurrentPage(phase)
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return phaseQuestions.slice(start, start + ITEMS_PER_PAGE)
  }

  // Handle save
  const handleSave = async (question: QuestionFromDB) => {
    try {
      setSaveMessage(null)
      await updateQuestion.mutateAsync(question)
      setSaveMessage({ type: 'success', text: 'Question updated successfully!' })
      setEditingId(null)
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (err) {
      setSaveMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save'
      })
    }
  }

  return (
    <DashboardLayout title="Questionnaires" subtitle="View and edit training questions">
      {/* Header Actions */}
      <Card className="mb-3 lg:w-[49%] w-full">
        <CardHeader className='p-4'>
          <div className="flex flex-col sm:flex-row gap-2 justify-between">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search questions..."
              className="w-full lg:w-1/2"
            />
          </div>
        </CardHeader>
      </Card>

      {/* Save Message */}
      {saveMessage && (
        <div className={`mb-2 p-2 rounded-lg flex items-center gap-2 border ${
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
      <div className="mb-3 p-3 rounded-lg border theme-bg-info theme-border-info">
        <p className="text-sm theme-text-info">
          <strong>Note:</strong> {isLti
            ? 'You can edit existing questions but cannot add new ones or delete existing ones. Changes will be reflected immediately in the training simulation.'
            : 'You are viewing questions in read-only mode.'}
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent>
            <LoadingState message="Loading questions..." />
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center">
              <AlertCircle className="w-8 h-8 theme-text-error mb-4" />
              <p className="theme-text-error mb-4">
                {error instanceof Error ? error.message : 'Failed to load questions'}
              </p>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 rounded-lg theme-btn-primary"
              >
                Try Again
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && questions.length === 0 && (
        <Card>
          <EmptyState
            icon={<HelpCircle className="w-8 h-8 theme-text-muted" />}
            title="No questions found"
            description="Questions will appear here once they are added to the database."
          />
        </Card>
      )}

      {/* Questions by Phase */}
      {!isLoading && !error && Object.keys(groupedQuestions).length > 0 && (
        <div className="space-y-3">
          {Object.entries(groupedQuestions).map(([phase, phaseQuestions]) => {
            const paginatedQuestions = getPaginatedQuestions(phase, phaseQuestions)
            const totalPages = Math.ceil(phaseQuestions.length / ITEMS_PER_PAGE)
            const currentPage = getPhaseCurrentPage(phase)

            return (
              <Card key={phase}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3">
                      <span>{formatPhase(phase)}</span>
                      <Badge variant="info">{phaseQuestions.length} questions</Badge>
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {paginatedQuestions.map((question) => (
                    <QuestionCard
                      key={question.question_id}
                      question={question}
                      isEditing={editingId === question.question_id}
                      onEdit={() => setEditingId(question.question_id)}
                      onCancel={() => setEditingId(null)}
                      onSave={handleSave}
                      saving={updateQuestion.isPending}
                      canEdit={isLti}
                    />
                  ))}
                  {totalPages > 1 && (
                    <div className="pt-2 border-t theme-border">
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={phaseQuestions.length}
                        itemsPerPage={ITEMS_PER_PAGE}
                        onPageChange={(page) => setPhaseCurrentPage(phase, page)}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </DashboardLayout>
  )
}
