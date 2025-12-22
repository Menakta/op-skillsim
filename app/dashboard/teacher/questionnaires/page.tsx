'use client'

/**
 * Questionnaires Management Page
 *
 * Allows teachers to view, create, edit, and manage quiz questionnaires.
 */

import { useState } from 'react'
import { Plus, Edit, Trash2, Eye, ToggleLeft, ToggleRight, Clock, HelpCircle } from 'lucide-react'
import { DashboardLayout } from '../components/layout'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { SearchInput } from '../components/ui/SearchInput'
import { EmptyState } from '../components/ui/EmptyState'
import { mockQuestionnaires, mockQuestions } from '../data/mockData'
import type { Questionnaire, Question } from '../types'

export default function QuestionnairesPage() {
  const [questionnaires, setQuestionnaires] = useState(mockQuestionnaires)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedQuiz, setSelectedQuiz] = useState<Questionnaire | null>(null)
  const [showQuestionModal, setShowQuestionModal] = useState(false)

  // Filter questionnaires by search
  const filteredQuestionnaires = questionnaires.filter(q =>
    q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Toggle questionnaire active status
  function toggleActive(id: string) {
    setQuestionnaires(prev =>
      prev.map(q => q.id === id ? { ...q, isActive: !q.isActive } : q)
    )
  }

  return (
    <DashboardLayout title="Questionnaires" subtitle="Manage quiz questions and assessments">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search questionnaires..."
          className="w-full sm:w-80"
        />
        <button
          onClick={() => setShowQuestionModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create New Quiz
        </button>
      </div>

      {/* Questionnaires Grid */}
      {filteredQuestionnaires.length === 0 ? (
        <Card>
          <EmptyState
            icon={<HelpCircle className="w-8 h-8 text-gray-400" />}
            title="No questionnaires found"
            description={searchQuery ? "Try adjusting your search terms" : "Create your first quiz to get started"}
            action={
              <button
                onClick={() => setShowQuestionModal(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Create Quiz
              </button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuestionnaires.map((quiz) => (
            <QuizCard
              key={quiz.id}
              quiz={quiz}
              onToggle={() => toggleActive(quiz.id)}
              onView={() => setSelectedQuiz(quiz)}
            />
          ))}
        </div>
      )}

      {/* Questions Bank Section */}
      <Card className="mt-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Question Bank</CardTitle>
            <Badge variant="info">{mockQuestions.length} questions</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockQuestions.map((question) => (
              <QuestionRow key={question.id} question={question} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quiz Detail Modal */}
      {selectedQuiz && (
        <QuizDetailModal
          quiz={selectedQuiz}
          onClose={() => setSelectedQuiz(null)}
        />
      )}
    </DashboardLayout>
  )
}

// =============================================================================
// Sub-components
// =============================================================================

interface QuizCardProps {
  quiz: Questionnaire
  onToggle: () => void
  onView: () => void
}

function QuizCard({ quiz, onToggle, onView }: QuizCardProps) {
  return (
    <Card hover className="flex flex-col">
      <CardContent className="flex-1">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-white font-semibold mb-1">{quiz.title}</h3>
            <p className="text-gray-400 text-sm line-clamp-2">{quiz.description}</p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggle()
            }}
            className="ml-2"
          >
            {quiz.isActive ? (
              <ToggleRight className="w-8 h-8 text-green-400" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-gray-500" />
            )}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant={quiz.isActive ? 'success' : 'default'}>
            {quiz.isActive ? 'Active' : 'Inactive'}
          </Badge>
          <Badge variant="info">
            {quiz.questions.length} questions
          </Badge>
          {quiz.timeLimit && (
            <Badge variant="purple">
              <Clock className="w-3 h-3 mr-1" />
              {quiz.timeLimit} min
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Total Points</span>
            <p className="text-white font-medium">{quiz.totalPoints}</p>
          </div>
          <div>
            <span className="text-gray-400">Passing Score</span>
            <p className="text-white font-medium">{quiz.passingScore} ({Math.round(quiz.passingScore / quiz.totalPoints * 100)}%)</p>
          </div>
        </div>
      </CardContent>

      <div className="px-6 py-3 border-t border-gray-700 flex gap-2">
        <button
          onClick={onView}
          className="flex-1 flex items-center justify-center gap-2 py-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Eye className="w-4 h-4" />
          View
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 py-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
          <Edit className="w-4 h-4" />
          Edit
        </button>
        <button className="flex items-center justify-center gap-2 py-2 px-3 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </Card>
  )
}

interface QuestionRowProps {
  question: Question
}

function QuestionRow({ question }: QuestionRowProps) {
  const typeColors = {
    'multiple-choice': 'info',
    'true-false': 'success',
    'short-answer': 'purple',
  } as const

  return (
    <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700/50 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={typeColors[question.type]}>
              {question.type.replace('-', ' ')}
            </Badge>
            <Badge variant="default">{question.category}</Badge>
            <span className="text-gray-500 text-xs">{question.points} pts</span>
          </div>
          <p className="text-white text-sm">{question.text}</p>
          {question.options && (
            <div className="mt-2 flex flex-wrap gap-2">
              {question.options.map((opt) => (
                <span
                  key={opt.id}
                  className={`text-xs px-2 py-1 rounded ${
                    opt.isCorrect
                      ? 'bg-green-600/20 text-green-400'
                      : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {opt.text}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2 ml-4">
          <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
            <Edit className="w-4 h-4" />
          </button>
          <button className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

interface QuizDetailModalProps {
  quiz: Questionnaire
  onClose: () => void
}

function QuizDetailModal({ quiz, onClose }: QuizDetailModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">{quiz.title}</h2>
              <p className="text-gray-400 text-sm mt-1">{quiz.description}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-gray-900/50 rounded-lg">
              <p className="text-gray-400 text-sm">Questions</p>
              <p className="text-2xl font-bold text-white">{quiz.questions.length}</p>
            </div>
            <div className="p-4 bg-gray-900/50 rounded-lg">
              <p className="text-gray-400 text-sm">Total Points</p>
              <p className="text-2xl font-bold text-white">{quiz.totalPoints}</p>
            </div>
            <div className="p-4 bg-gray-900/50 rounded-lg">
              <p className="text-gray-400 text-sm">Time Limit</p>
              <p className="text-2xl font-bold text-white">{quiz.timeLimit || '∞'} min</p>
            </div>
          </div>

          <h3 className="text-white font-medium mb-4">Questions</h3>
          <div className="space-y-3">
            {quiz.questions.map((question, index) => (
              <div key={question.id} className="p-4 bg-gray-900/50 rounded-lg">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-purple-600/20 text-purple-400 flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-white text-sm">{question.text}</p>
                    <p className="text-gray-500 text-xs mt-1">{question.points} points • {question.type}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Close
          </button>
          <button className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
            Edit Quiz
          </button>
        </div>
      </div>
    </div>
  )
}
