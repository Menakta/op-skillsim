/**
 * Quiz Service
 *
 * Handles quiz response submission and retrieval.
 * Saves incrementally after each question is answered.
 */

import type {
  SubmitQuizResultsRequest,
  SubmitQuizResultsResponse,
  QuizResponse,
  QuizStatistics,
  QuizAnswerState,
  QuestionDataMap,
  QuestionDataEntry,
} from '@/app/types'
import { buildQuestionDataMap, calculateScorePercentage, questionDataMapToAnswers } from '@/app/types'

// =============================================================================
// Types
// =============================================================================

export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

// =============================================================================
// Quiz Service
// =============================================================================

export const quizService = {
  /**
   * Save a single answer immediately after it's submitted
   * This is called after each question is answered correctly
   */
  async saveAnswer(
    answer: QuizAnswerState,
    totalQuestions: number
  ): Promise<ServiceResult<QuizResponse>> {
    try {
      console.log('📝 [quizService] saveAnswer called:', { answer, totalQuestions })

      // Convert single answer to question data format
      const answerLetters = ['A', 'B', 'C', 'D'] as const
      const answerLetter = answerLetters[answer.selectedAnswer] || 'A'
      const questionData: QuestionDataMap = {
        [answer.questionId]: {
          answer: answerLetter,
          correct: answer.isCorrect,
          attempts: answer.attemptCount,
          time: answer.timeToAnswer,
        }
      }

      const request = {
        questionData,
        totalQuestions,
        // finalScorePercentage will be calculated on server
      }

      console.log('📝 [quizService] Saving answer to /api/quiz/response:', request)

      const response = await fetch('/api/quiz/response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(request),
      })

      const data: SubmitQuizResultsResponse = await response.json()
      console.log('📝 [quizService] Response:', { status: response.status, data })

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Failed to save answer',
        }
      }

      return {
        success: true,
        data: data.response!,
      }
    } catch (error) {
      console.error('📝 [quizService] Error saving answer:', error)
      return {
        success: false,
        error: 'Network error: Failed to save answer',
      }
    }
  },

  /**
   * Submit all quiz results at once
   * Call this when the quiz is complete (optional - for final submission)
   */
  async submitResults(
    answers: QuizAnswerState[],
    totalQuestions: number
  ): Promise<ServiceResult<QuizResponse>> {
    try {
      console.log('📝 [quizService] submitResults called with:', { answers, totalQuestions })

      const questionData = buildQuestionDataMap(answers)
      const finalScorePercentage = calculateScorePercentage(questionData)

      console.log('📝 [quizService] Built questionData:', questionData)
      console.log('📝 [quizService] Calculated score:', finalScorePercentage)

      const request: SubmitQuizResultsRequest = {
        questionData,
        totalQuestions,
        finalScorePercentage,
      }

      console.log('📝 [quizService] Sending request to /api/quiz/response:', request)

      const response = await fetch('/api/quiz/response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(request),
      })

      const data: SubmitQuizResultsResponse = await response.json()
      console.log('📝 [quizService] Response:', { status: response.status, data })

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Failed to submit quiz results',
        }
      }

      return {
        success: true,
        data: data.response!,
      }
    } catch (error) {
      console.error('📝 [quizService] Error:', error)
      return {
        success: false,
        error: 'Network error: Failed to submit quiz results',
      }
    }
  },

  /**
   * Submit quiz results with pre-built question data map
   */
  async submitQuestionData(
    questionData: QuestionDataMap,
    totalQuestions: number
  ): Promise<ServiceResult<QuizResponse>> {
    try {
      const finalScorePercentage = calculateScorePercentage(questionData)

      const request: SubmitQuizResultsRequest = {
        questionData,
        totalQuestions,
        finalScorePercentage,
      }

      const response = await fetch('/api/quiz/response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(request),
      })

      const data: SubmitQuizResultsResponse = await response.json()

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Failed to submit quiz results',
        }
      }

      return {
        success: true,
        data: data.response!,
      }
    } catch (error) {
      console.error('Quiz service error:', error)
      return {
        success: false,
        error: 'Network error: Failed to submit quiz results',
      }
    }
  },

  /**
   * Get quiz results for current session
   */
  async getSessionResults(): Promise<ServiceResult<QuizResponse | null>> {
    try {
      const response = await fetch('/api/quiz/response', {
        method: 'GET',
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Failed to fetch quiz results',
        }
      }

      return {
        success: true,
        data: data.response || null,
      }
    } catch (error) {
      console.error('Quiz service error:', error)
      return {
        success: false,
        error: 'Network error: Failed to fetch quiz results',
      }
    }
  },

  /**
   * Get saved quiz answers as QuizAnswerState array
   * Used to restore in-memory state when resuming a session
   */
  async getSavedAnswers(): Promise<ServiceResult<QuizAnswerState[]>> {
    try {
      console.log('📝 [quizService] Fetching saved answers...')
      const result = await this.getSessionResults()

      if (!result.success) {
        return { success: false, error: result.error }
      }

      if (!result.data || !result.data.question_data) {
        console.log('📝 [quizService] No saved answers found')
        return { success: true, data: [] }
      }

      const answers = questionDataMapToAnswers(result.data.question_data)
      console.log('📝 [quizService] Restored answers:', answers)

      return { success: true, data: answers }
    } catch (error) {
      console.error('📝 [quizService] Error fetching saved answers:', error)
      return { success: false, error: 'Failed to fetch saved answers' }
    }
  },

  /**
   * Calculate statistics from question data
   */
  calculateStatistics(questionData: QuestionDataMap): QuizStatistics {
    const entries = Object.values(questionData)
    const totalQuestions = entries.length

    if (totalQuestions === 0) {
      return {
        totalQuestions: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        averageAttempts: 0,
        averageTimeMs: 0,
        completionRate: 0,
      }
    }

    const correctAnswers = entries.filter(e => e.correct).length
    const incorrectAnswers = totalQuestions - correctAnswers
    const totalAttempts = entries.reduce((sum, e) => sum + e.attempts, 0)
    const totalTime = entries.reduce((sum, e) => sum + e.time, 0)

    return {
      totalQuestions,
      correctAnswers,
      incorrectAnswers,
      averageAttempts: totalAttempts / totalQuestions,
      averageTimeMs: totalTime / totalQuestions,
      completionRate: (correctAnswers / totalQuestions) * 100,
    }
  },
}

export default quizService
