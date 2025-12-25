/**
 * Quiz Response Types
 *
 * Types for quiz/questionnaire responses stored in Supabase.
 * Matches the quiz_responses table schema.
 */

// =============================================================================
// Answer Types
// =============================================================================

export type AnswerOption = 'A' | 'B' | 'C' | 'D'

// =============================================================================
// Quiz Response - Database Schema
// =============================================================================

export interface QuizResponse {
  id: string
  session_id: string
  question_id: string
  selected_answer: AnswerOption
  is_correct: boolean
  attempt_count: number
  time_to_answer: number | null
  answered_at: string
}

// =============================================================================
// Quiz Response - Insert Payload
// =============================================================================

export interface QuizResponseInsert {
  session_id: string
  question_id: string
  selected_answer: AnswerOption
  is_correct: boolean
  attempt_count: number
  time_to_answer?: number
}

// =============================================================================
// Quiz Response - API Request
// =============================================================================

export interface SubmitQuizAnswerRequest {
  questionId: string
  selectedAnswer: number // 0-3 index
  isCorrect: boolean
  attemptCount: number
  timeToAnswer?: number // milliseconds
}

// =============================================================================
// Quiz Response - API Response
// =============================================================================

export interface SubmitQuizAnswerResponse {
  success: boolean
  response?: QuizResponse
  error?: string
}

// =============================================================================
// Quiz Statistics
// =============================================================================

export interface QuizStatistics {
  totalQuestions: number
  correctAnswers: number
  incorrectAnswers: number
  averageAttempts: number
  averageTimeMs: number
  completionRate: number
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert 0-based index to letter answer
 */
export function indexToAnswer(index: number): AnswerOption {
  const mapping: Record<number, AnswerOption> = {
    0: 'A',
    1: 'B',
    2: 'C',
    3: 'D'
  }
  return mapping[index] || 'A'
}

/**
 * Convert letter answer to 0-based index
 */
export function answerToIndex(answer: AnswerOption): number {
  const mapping: Record<AnswerOption, number> = {
    'A': 0,
    'B': 1,
    'C': 2,
    'D': 3
  }
  return mapping[answer]
}
