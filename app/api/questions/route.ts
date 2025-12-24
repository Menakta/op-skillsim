/**
 * Questions API Route
 *
 * GET /api/questions - Get all questions
 * GET /api/questions?id=Q1 - Get a specific question
 * GET /api/questions?phase=XRAY_ASSESSMENT - Get questions by phase
 * PUT /api/questions - Update a question (admin/teacher only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/app/lib/supabase/server'

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
  created_at?: string
  updated_at?: string
}

interface QuestionData {
  id: string
  name: string
  text: string
  options: string[]
  correctAnswer: number
  explanation: string
}

const ANSWER_TO_INDEX: Record<string, number> = {
  'A': 0,
  'B': 1,
  'C': 2,
  'D': 3
}

const INDEX_TO_ANSWER: Record<number, 'A' | 'B' | 'C' | 'D'> = {
  0: 'A',
  1: 'B',
  2: 'C',
  3: 'D'
}

function transformQuestion(sq: SupabaseQuestion): QuestionData {
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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)

    const questionId = searchParams.get('id')
    const phase = searchParams.get('phase')

    // Get specific question by ID
    if (questionId) {
      const { data, error } = await supabase
        .from('questionnaires')
        .select('*')
        .eq('question_id', questionId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json(
            { error: 'Question not found' },
            { status: 404 }
          )
        }
        throw error
      }

      return NextResponse.json({
        success: true,
        question: transformQuestion(data as SupabaseQuestion)
      })
    }

    // Get questions by phase
    if (phase) {
      const { data, error } = await supabase
        .from('questionnaires')
        .select('*')
        .eq('phase', phase)
        .order('question_id')

      if (error) throw error

      const questions = (data as SupabaseQuestion[]).map(transformQuestion)

      return NextResponse.json({
        success: true,
        questions,
        count: questions.length
      })
    }

    // Get all questions
    const { data, error } = await supabase
      .from('questionnaires')
      .select('*')
      .order('question_id')

    if (error) throw error

    const questions: Record<string, QuestionData> = {}
    for (const sq of data as SupabaseQuestion[]) {
      questions[sq.question_id] = transformQuestion(sq)
    }

    return NextResponse.json({
      success: true,
      questions,
      count: Object.keys(questions).length
    })

  } catch (error) {
    console.error('Error fetching questions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    )
  }
}

/**
 * PUT - Update an existing question
 * Only updates allowed, no create or delete
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const body = await request.json()

    const {
      question_id,
      question_text,
      option_a,
      option_b,
      option_c,
      option_d,
      correct_answer,
      nzs3500_reference
    } = body

    // Validate required fields
    if (!question_id) {
      return NextResponse.json(
        { error: 'question_id is required' },
        { status: 400 }
      )
    }

    // Check if question exists
    const { data: existing, error: checkError } = await supabase
      .from('questionnaires')
      .select('id')
      .eq('question_id', question_id)
      .single()

    if (checkError || !existing) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      )
    }

    // Build update object with only provided fields
    const updateData: Partial<SupabaseQuestion> & { updated_at: string } = {
      updated_at: new Date().toISOString()
    }

    if (question_text !== undefined) updateData.question_text = question_text
    if (option_a !== undefined) updateData.option_a = option_a
    if (option_b !== undefined) updateData.option_b = option_b
    if (option_c !== undefined) updateData.option_c = option_c
    if (option_d !== undefined) updateData.option_d = option_d
    if (correct_answer !== undefined) {
      // Accept both letter (A/B/C/D) and index (0/1/2/3)
      if (typeof correct_answer === 'number') {
        updateData.correct_answer = INDEX_TO_ANSWER[correct_answer]
      } else {
        updateData.correct_answer = correct_answer.toUpperCase() as 'A' | 'B' | 'C' | 'D'
      }
    }
    if (nzs3500_reference !== undefined) updateData.nzs3500_reference = nzs3500_reference

    // Update the question
    const { data, error } = await supabase
      .from('questionnaires')
      .update(updateData)
      .eq('question_id', question_id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Question updated successfully',
      question: transformQuestion(data as SupabaseQuestion)
    })

  } catch (error) {
    console.error('Error updating question:', error)
    return NextResponse.json(
      { error: 'Failed to update question' },
      { status: 500 }
    )
  }
}

