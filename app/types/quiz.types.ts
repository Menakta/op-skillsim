/**
 * Quiz Response Types
 *
 * Types for quiz/questionnaire responses stored in Supabase.
 * Matches the quiz_responses table schema with JSONB question_data.
 */

// =============================================================================
// Answer Types
// =============================================================================

export type AnswerOption = 'A' | 'B' | 'C' | 'D'

// =============================================================================
// Question Data Entry (stored in JSONB)
// =============================================================================

/**
 * Individual question response stored in question_data JSONB
 * Key format: "q_001", "q_002", etc.
 */
export interface QuestionDataEntry {
  answer: AnswerOption
  attempts: number
  time: number // milliseconds
  correct: boolean
}

/**
 * JSONB object storing all question responses
 * Example: { "q_001": { answer: "A", attempts: 3, time: 15000, correct: true } }
 */
export type QuestionDataMap = Record<string, QuestionDataEntry>

// =============================================================================
// Quiz Response - Database Schema
// =============================================================================

export interface QuizResponse {
  id: string
  session_id: string
  question_data: QuestionDataMap
  total_questions: number
  correct_count: number
  score_percentage: number | null
  answered_at: string
}

// =============================================================================
// Quiz Response - Insert Payload
// =============================================================================

export interface QuizResponseInsert {
  session_id: string
  question_data: QuestionDataMap
  total_questions: number
  correct_count: number
  score_percentage: number
}

// =============================================================================
// Quiz Response - API Request (submit all at once)
// =============================================================================

export interface SubmitQuizResultsRequest {
  questionData: QuestionDataMap
  totalQuestions: number
  finalScorePercentage: number
}

// =============================================================================
// Quiz Response - API Response
// =============================================================================

export interface SubmitQuizResultsResponse {
  success: boolean
  response?: QuizResponse
  error?: string
}

// =============================================================================
// In-Memory Quiz State (for accumulating answers during session)
// =============================================================================

export interface QuizAnswerState {
  questionId: string
  selectedAnswer: number // 0-3 index
  isCorrect: boolean
  attemptCount: number
  timeToAnswer: number // milliseconds
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

/**
 * Convert question ID to JSONB key format (e.g., "Q1" -> "q_001")
 */
export function questionIdToKey(questionId: string): string {
  // Extract number from question ID (e.g., "Q1" -> 1, "Q10" -> 10)
  const match = questionId.match(/\d+/)
  if (!match) return `q_${questionId.toLowerCase()}`
  const num = parseInt(match[0], 10)
  return `q_${num.toString().padStart(3, '0')}`
}

/**
 * Convert JSONB key to question ID format (e.g., "q_001" -> "Q1")
 */
export function keyToQuestionId(key: string): string {
  const match = key.match(/q_(\d+)/)
  if (!match) return key.toUpperCase()
  const num = parseInt(match[1], 10)
  return `Q${num}`
}

/**
 * Build QuestionDataMap from array of quiz answers
 */
export function buildQuestionDataMap(answers: QuizAnswerState[]): QuestionDataMap {
  const map: QuestionDataMap = {}
  for (const answer of answers) {
    // Use questionId directly (e.g., "Q1") to match the key format
    // used by quizService.saveAnswer() and the questionnaires table
    map[answer.questionId] = {
      answer: indexToAnswer(answer.selectedAnswer),
      attempts: answer.attemptCount,
      time: answer.timeToAnswer,
      correct: answer.isCorrect
    }
  }
  return map
}

/**
 * Calculate final score percentage from question data
 */
export function calculateScorePercentage(questionData: QuestionDataMap): number {
  const entries = Object.values(questionData)
  if (entries.length === 0) return 0
  const correctCount = entries.filter(e => e.correct).length
  return Math.round((correctCount / entries.length) * 100 * 100) / 100 // 2 decimal places
}
