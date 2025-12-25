'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import type { ParsedMessage, QuestionData } from '@/app/lib/messageTypes'
import { WEB_TO_UE_MESSAGES } from '@/app/lib/messageTypes'
import type { UseMessageBusReturn } from '@/app/features/messaging/hooks/useMessageBus'
import { eventBus } from '@/app/lib/events'
import { useQuestions } from '../context/QuestionsContext'
import { quizService } from '@/app/services'
import type { QuizAnswerState } from '@/app/types'

// =============================================================================
// Question State Type
// =============================================================================

export interface QuestionStateData {
  currentQuestion: QuestionData | null
  questionTryCount: number
  questionAnsweredCorrectly: boolean
}

// =============================================================================
// Callbacks
// =============================================================================

export interface QuestionFlowCallbacks {
  onQuestionRequest?: (questionId: string, question: QuestionData) => void
  onQuizComplete?: (answers: QuizAnswerState[], totalQuestions: number) => void
}

// =============================================================================
// Initial State
// =============================================================================

const initialState: QuestionStateData = {
  currentQuestion: null,
  questionTryCount: 1,
  questionAnsweredCorrectly: false
}

// =============================================================================
// Hook Return Type
// =============================================================================

export interface UseQuestionFlowReturn {
  state: QuestionStateData
  answers: QuizAnswerState[]
  submitQuestionAnswer: (selectedAnswer: number) => { correct: boolean; message: string } | undefined
  closeQuestion: () => void
  resetQuestionState: () => void
  submitQuizResults: (totalQuestions: number) => Promise<boolean>
  clearAnswers: () => void
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useQuestionFlow(
  messageBus: UseMessageBusReturn,
  callbacks: QuestionFlowCallbacks = {}
): UseQuestionFlowReturn {
  const [state, setState] = useState<QuestionStateData>(initialState)
  const [answers, setAnswers] = useState<QuizAnswerState[]>([])
  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks

  // Debug: Log when answers change
  useEffect(() => {
    console.log('📝 [useQuestionFlow] answers state changed:', answers)
  }, [answers])

  // Track when question was displayed for time_to_answer
  const questionStartTimeRef = useRef<number | null>(null)

  // Get questions from context (loaded from Supabase)
  const { isLoading: questionsLoading, getQuestion } = useQuestions()

  // ==========================================================================
  // Message Handler
  // ==========================================================================

  useEffect(() => {
    const unsubscribe = messageBus.onMessage((message: ParsedMessage) => {
      const { type, dataString } = message
      const parts = dataString.split(':')

      if (type === 'question_request') {
        const questionId = parts[0] || 'Q1'

        // Don't process if questions haven't loaded yet
        if (questionsLoading) {
          console.warn('Questions still loading, request queued:', questionId)
          return
        }

        const question = getQuestion(questionId)

        if (question) {
          console.log('Question requested:', questionId, '(from Supabase)')
          // Start timer for time_to_answer tracking
          questionStartTimeRef.current = Date.now()
          setState({
            currentQuestion: question,
            questionTryCount: 1,
            questionAnsweredCorrectly: false
          })
          eventBus.emit('question:asked', { questionId })
          callbacksRef.current.onQuestionRequest?.(questionId, question)
        } else {
          console.error('Question not found in database:', questionId)
        }
      }
    })

    return unsubscribe
  }, [messageBus, questionsLoading, getQuestion])

  // ==========================================================================
  // Submit Answer (accumulates in memory, does NOT save to DB)
  // ==========================================================================

  const submitQuestionAnswer = useCallback((selectedAnswer: number) => {
    const question = state.currentQuestion
    if (!question || selectedAnswer === null) return

    const isCorrect = selectedAnswer === question.correctAnswer

    // Calculate time to answer
    const timeToAnswer = questionStartTimeRef.current
      ? Date.now() - questionStartTimeRef.current
      : 0

    // Store answer in memory (store on every attempt, update when correct)
    const answerState: QuizAnswerState = {
      questionId: question.id,
      selectedAnswer,
      isCorrect,
      attemptCount: state.questionTryCount,
      timeToAnswer,
    }

    console.log('📝 [useQuestionFlow] Storing answer:', answerState)

    setAnswers(prev => {
      // Replace if already answered this question, otherwise add
      const existing = prev.findIndex(a => a.questionId === question.id)
      if (existing >= 0) {
        // Only update if this is correct OR if the existing one was also incorrect
        // This ensures we keep the final correct answer if achieved
        if (isCorrect || !prev[existing].isCorrect) {
          const updated = [...prev]
          updated[existing] = answerState
          console.log('📝 [useQuestionFlow] Updated answers array:', updated)
          return updated
        }
        return prev
      }
      const newAnswers = [...prev, answerState]
      console.log('📝 [useQuestionFlow] New answers array:', newAnswers)
      return newAnswers
    })

    if (isCorrect) {
      // Reset timer on correct answer
      questionStartTimeRef.current = null

      setState(prev => ({ ...prev, questionAnsweredCorrectly: true }))
      eventBus.emit('question:answered', { questionId: question.id, correct: true, attempts: state.questionTryCount })

      const answerMessage = `${question.id}:${state.questionTryCount}:true`
      messageBus.sendMessage(WEB_TO_UE_MESSAGES.QUESTION_ANSWER, answerMessage)

      // Special handling for Q6 pressure testing
      if (question.id === 'Q6') {
        console.log('🔧 Q6 ANSWERED CORRECTLY! NEW FLOW:')
        console.log('  → Q6 answer sent to UE5:', answerMessage)
        console.log('  → UE5 will wait for player to close question')
        console.log('  → When player clicks Close, pressure testing will begin')
      }

      return { correct: true, message: question.explanation }
    } else {
      setState(prev => ({ ...prev, questionTryCount: prev.questionTryCount + 1 }))
      return { correct: false, message: 'Incorrect. Try again!' }
    }
  }, [state.currentQuestion, state.questionTryCount, messageBus])

  // ==========================================================================
  // Submit All Quiz Results to Supabase
  // ==========================================================================

  const submitQuizResults = useCallback(async (totalQuestions: number): Promise<boolean> => {
    console.log('📝 [useQuestionFlow] submitQuizResults called with:', {
      answersLength: answers.length,
      answers,
      totalQuestions
    })

    if (answers.length === 0) {
      console.warn('📝 [useQuestionFlow] No answers to submit - answers array is empty!')
      return false
    }

    console.log('📝 [useQuestionFlow] Calling quizService.submitResults...')
    const result = await quizService.submitResults(answers, totalQuestions)

    if (result.success) {
      console.log('📝 [useQuestionFlow] Quiz results saved to Supabase:', result.data)
      callbacksRef.current.onQuizComplete?.(answers, totalQuestions)
      return true
    } else {
      console.error('📝 [useQuestionFlow] Failed to save quiz results:', result.error)
      return false
    }
  }, [answers])

  // ==========================================================================
  // Clear Answers
  // ==========================================================================

  const clearAnswers = useCallback(() => {
    setAnswers([])
  }, [])

  // ==========================================================================
  // Close Question
  // ==========================================================================

  const closeQuestion = useCallback(() => {
    const question = state.currentQuestion

    // Check if this is Q6 being closed and if it was answered correctly
    if (question && question.id === 'Q6' && state.questionAnsweredCorrectly) {
      console.log('🔧 Q6 CLOSE DETECTED! Triggering pressure testing sequence...')
      console.log('  → Sending OnPlayerClosedQ6Question message to UE5')
      messageBus.sendMessage(WEB_TO_UE_MESSAGES.PRESSURE_TEST_START, 'player_closed_q6')
    }

    // Reset timer
    questionStartTimeRef.current = null
    setState(initialState)
  }, [state.currentQuestion, state.questionAnsweredCorrectly, messageBus])

  // ==========================================================================
  // Reset
  // ==========================================================================

  const resetQuestionState = useCallback(() => {
    setState(initialState)
  }, [])

  return {
    state,
    answers,
    submitQuestionAnswer,
    closeQuestion,
    resetQuestionState,
    submitQuizResults,
    clearAnswers
  }
}

export default useQuestionFlow
