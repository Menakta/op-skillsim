/**
 * Training Session Types
 *
 * Types for training sessions stored in Supabase.
 * Matches the training_sessions table schema.
 */

// =============================================================================
// Training Session Status
// =============================================================================

export type TrainingSessionStatus = 'active' | 'paused' | 'completed' | 'abandoned'

// =============================================================================
// Training Session - Database Schema
// =============================================================================

export interface TrainingSession {
  id: string
  session_id: string

  // Training context
  course_id: string | null
  course_name: string | null
  training_phase: string
  overall_progress: number

  // Training state
  start_time: string
  end_time: string | null
  total_time_spent: number

  // Performance data
  phases_completed: number
  total_score: number
  quiz_attempts: Record<string, number>

  // Completion status
  status: TrainingSessionStatus
  completion_percentage: number

  // Results data
  final_results: TrainingFinalResults | null

  created_at: string
  updated_at: string
}

// =============================================================================
// Training Final Results
// =============================================================================

export interface TrainingFinalResults {
  completedAt: string
  totalTimeMs: number
  phaseScores: PhaseScore[]
  quizPerformance: QuizPerformance
  overallGrade: string
}

export interface PhaseScore {
  phase: string
  score: number
  timeSpentMs: number
  tasksCompleted: number
  totalTasks: number
}

export interface QuizPerformance {
  totalQuestions: number
  correctFirstTry: number
  totalAttempts: number
  averageTimeMs: number
}

// =============================================================================
// Training Session - Insert Payload
// =============================================================================

export interface TrainingSessionInsert {
  session_id: string
  course_id?: string
  course_name?: string
  training_phase?: string
  overall_progress?: number
  status?: TrainingSessionStatus
}

// =============================================================================
// Training Session - Update Payload
// =============================================================================

export interface TrainingSessionUpdate {
  training_phase?: string
  overall_progress?: number
  end_time?: string
  total_time_spent?: number
  phases_completed?: number
  total_score?: number
  quiz_attempts?: Record<string, number>
  status?: TrainingSessionStatus
  completion_percentage?: number
  final_results?: TrainingFinalResults
}

// =============================================================================
// API Request Types
// =============================================================================

export interface StartTrainingRequest {
  courseId?: string
  courseName?: string
}

export interface UpdateProgressRequest {
  phase?: string
  progress?: number
  taskCompleted?: boolean
  timeSpentMs?: number
}

export interface CompletePhaseRequest {
  phase: string
  score: number
  timeSpentMs: number
  tasksCompleted: number
  totalTasks: number
}

export interface CompleteTrainingRequest {
  finalResults?: TrainingFinalResults
  totalTimeMs?: number
  phasesCompleted?: number
  quizData?: Record<string, { answer: string; attempts: number; time: number; correct: boolean }>
  totalQuestions?: number
}

// =============================================================================
// API Response Types
// =============================================================================

export interface TrainingSessionResponse {
  success: boolean
  session?: TrainingSession
  error?: string
}

export interface TrainingProgressResponse {
  success: boolean
  progress?: {
    phase: string
    overallProgress: number
    phasesCompleted: number
    status: TrainingSessionStatus
  }
  error?: string
}
