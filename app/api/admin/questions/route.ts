/**
 * Admin Questions API Route
 *
 * Returns raw questions data for admin/teacher management.
 * GET /api/admin/questions - Get all questions in raw DB format
 */

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/app/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('questionnaires')
      .select('*')
      .order('phase')
      .order('question_id')

    if (error) throw error

    return NextResponse.json({
      success: true,
      questions: data || [],
      count: data?.length || 0
    })

  } catch (error) {
    console.error('Error fetching questions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    )
  }
}
