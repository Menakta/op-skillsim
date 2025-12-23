/**
 * Questions Service
 *
 * Service for fetching questions from Supabase questionnaires table.
 */

import { createClient } from '@/app/lib/supabase/client'
import type { QuestionData } from '@/app/lib/messageTypes'

// =============================================================================
// Types
// =============================================================================

export interface SupabaseQuestion {
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
  created_at: string
  updated_at: string
}

// Map phase names to categories
const PHASE_TO_CATEGORY: Record<string, string> = {
  'XRAY_ASSESSMENT': 'scanning',
  'EXCAVATION': 'excavation',
  'MEASUREMENT': 'measurement',
  'GLUE_APPLICATION': 'connection',
  'PRESSURE_TESTING': 'testing'
}

// Map correct answer letter to index (0-based)
const ANSWER_TO_INDEX: Record<string, number> = {
  'A': 0,
  'B': 1,
  'C': 2,
  'D': 3
}

// =============================================================================
// Transform Function
// =============================================================================

/**
 * Transform Supabase question to QuestionData format
 */
export function transformQuestion(sq: SupabaseQuestion): QuestionData {
  return {
    id: sq.question_id,
    name: sq.phase.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
    text: sq.question_text,
    options: [sq.option_a, sq.option_b, sq.option_c, sq.option_d],
    correctAnswer: ANSWER_TO_INDEX[sq.correct_answer],
    explanation: sq.nzs3500_reference
      ? `Reference: ${sq.nzs3500_reference}`
      : 'Correct answer based on NZS3500 standards.'
  }
}

// =============================================================================
// Service Functions
// =============================================================================

/**
 * Fetch all questions from Supabase
 */
export async function fetchAllQuestions(): Promise<Record<string, QuestionData>> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('questionnaires')
    .select('*')
    .order('question_id')

  if (error) {
    console.error('Error fetching questions:', error)
    throw new Error(`Failed to fetch questions: ${error.message}`)
  }

  const questions: Record<string, QuestionData> = {}

  for (const sq of data as SupabaseQuestion[]) {
    questions[sq.question_id] = transformQuestion(sq)
  }

  return questions
}

/**
 * Fetch a single question by ID
 */
export async function fetchQuestionById(questionId: string): Promise<QuestionData | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('questionnaires')
    .select('*')
    .eq('question_id', questionId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null
    }
    console.error('Error fetching question:', error)
    throw new Error(`Failed to fetch question: ${error.message}`)
  }

  return transformQuestion(data as SupabaseQuestion)
}

/**
 * Fetch questions by phase
 */
export async function fetchQuestionsByPhase(phase: string): Promise<QuestionData[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('questionnaires')
    .select('*')
    .eq('phase', phase)
    .order('question_id')

  if (error) {
    console.error('Error fetching questions by phase:', error)
    throw new Error(`Failed to fetch questions: ${error.message}`)
  }

  return (data as SupabaseQuestion[]).map(transformQuestion)
}

// =============================================================================
// Cache Management
// =============================================================================

let cachedQuestions: Record<string, QuestionData> | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Get questions with caching
 */
export async function getQuestions(): Promise<Record<string, QuestionData>> {
  const now = Date.now()

  if (cachedQuestions && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedQuestions
  }

  cachedQuestions = await fetchAllQuestions()
  cacheTimestamp = now

  return cachedQuestions
}

/**
 * Get a single question (uses cache)
 */
export async function getQuestion(questionId: string): Promise<QuestionData | null> {
  const questions = await getQuestions()
  return questions[questionId] || null
}

/**
 * Clear the questions cache
 */
export function clearQuestionsCache(): void {
  cachedQuestions = null
  cacheTimestamp = 0
}
