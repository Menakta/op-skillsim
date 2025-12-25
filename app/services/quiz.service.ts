/**
 * Quiz Service
 *
 * Handles quiz response submission and retrieval.
 * Abstracts API calls for quiz-related operations.
 */

import type {
  SubmitQuizAnswerRequest,
  SubmitQuizAnswerResponse,
  QuizResponse,
  QuizStatistics,
} from '@/app/types'

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
   * Submit a quiz answer
   */
  async submitAnswer(
    request: SubmitQuizAnswerRequest
  ): Promise<ServiceResult<QuizResponse>> {
    try {
      const response = await fetch('/api/quiz/response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(request),
      })

      const data: SubmitQuizAnswerResponse = await response.json()

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Failed to submit answer',
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
        error: 'Network error: Failed to submit answer',
      }
    }
  },

  /**
   * Get all quiz responses for current session
   */
  async getSessionResponses(): Promise<ServiceResult<QuizResponse[]>> {
    try {
      const response = await fetch('/api/quiz/response', {
        method: 'GET',
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Failed to fetch responses',
        }
      }

      return {
        success: true,
        data: data.responses || [],
      }
    } catch (error) {
      console.error('Quiz service error:', error)
      return {
        success: false,
        error: 'Network error: Failed to fetch responses',
      }
    }
  },

  /**
   * Get quiz statistics for current session
   */
  async getSessionStatistics(): Promise<ServiceResult<QuizStatistics>> {
    try {
      const response = await fetch('/api/quiz/statistics', {
        method: 'GET',
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Failed to fetch statistics',
        }
      }

      return {
        success: true,
        data: data.statistics,
      }
    } catch (error) {
      console.error('Quiz service error:', error)
      return {
        success: false,
        error: 'Network error: Failed to fetch statistics',
      }
    }
  },
}

export default quizService
