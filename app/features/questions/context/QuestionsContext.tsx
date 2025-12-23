'use client'

/**
 * Questions Context
 *
 * Provides dynamic question data from Supabase to the application.
 * Questions are loaded once on mount and cached for the session.
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import type { QuestionData } from '@/app/lib/messageTypes'

// =============================================================================
// Types
// =============================================================================

interface QuestionsContextValue {
  questions: Record<string, QuestionData>
  isLoading: boolean
  error: string | null
  getQuestion: (id: string) => QuestionData | undefined
  refreshQuestions: () => Promise<void>
}

// =============================================================================
// Context
// =============================================================================

const QuestionsContext = createContext<QuestionsContextValue | null>(null)

// =============================================================================
// Provider
// =============================================================================

interface QuestionsProviderProps {
  children: ReactNode
}

export function QuestionsProvider({ children }: QuestionsProviderProps) {
  const [questions, setQuestions] = useState<Record<string, QuestionData>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchQuestions = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/questions')

      if (!response.ok) {
        throw new Error(`Failed to fetch questions: ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Unknown error')
      }

      setQuestions(data.questions)
      console.log(`Loaded ${data.count} questions from database`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load questions'
      console.error('Error loading questions:', message)
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchQuestions()
  }, [fetchQuestions])

  const getQuestion = useCallback((id: string): QuestionData | undefined => {
    return questions[id]
  }, [questions])

  const refreshQuestions = useCallback(async () => {
    await fetchQuestions()
  }, [fetchQuestions])

  return (
    <QuestionsContext.Provider
      value={{
        questions,
        isLoading,
        error,
        getQuestion,
        refreshQuestions
      }}
    >
      {children}
    </QuestionsContext.Provider>
  )
}

// =============================================================================
// Hook
// =============================================================================

export function useQuestions(): QuestionsContextValue {
  const context = useContext(QuestionsContext)

  if (!context) {
    throw new Error('useQuestions must be used within a QuestionsProvider')
  }

  return context
}
