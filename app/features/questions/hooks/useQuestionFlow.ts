'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import type { ParsedMessage, QuestionData } from '@/app/lib/messageTypes'
import { WEB_TO_UE_MESSAGES } from '@/app/lib/messageTypes'
import type { UseMessageBusReturn } from '@/app/features/messaging/hooks/useMessageBus'
import { eventBus } from '@/app/lib/events'
import { useQuestions } from '../context/QuestionsContext'

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
  submitQuestionAnswer: (selectedAnswer: number) => { correct: boolean; message: string } | undefined
  closeQuestion: () => void
  resetQuestionState: () => void
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useQuestionFlow(
  messageBus: UseMessageBusReturn,
  callbacks: QuestionFlowCallbacks = {}
): UseQuestionFlowReturn {
  const [state, setState] = useState<QuestionStateData>(initialState)
  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks

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
  // Submit Answer
  // ==========================================================================

  const submitQuestionAnswer = useCallback((selectedAnswer: number) => {
    const question = state.currentQuestion
    if (!question || selectedAnswer === null) return

    const isCorrect = selectedAnswer === question.correctAnswer

    if (isCorrect) {
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
    submitQuestionAnswer,
    closeQuestion,
    resetQuestionState
  }
}

export default useQuestionFlow
