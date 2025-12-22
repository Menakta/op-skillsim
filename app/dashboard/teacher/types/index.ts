/**
 * Teacher Dashboard Types
 *
 * Centralized type definitions for the teacher dashboard module.
 */

// =============================================================================
// User Types
// =============================================================================

export interface TeacherUser {
  id: string
  email: string
  name: string
  role: 'teacher' | 'admin'
  avatar?: string
}

// =============================================================================
// Student Types
// =============================================================================

export interface Student {
  id: string
  name: string
  email: string
  enrolledDate: string
  lastActive: string
  progress: number
  status: 'active' | 'inactive' | 'completed'
  completedModules: number
  totalModules: number
  averageScore: number
}

// =============================================================================
// Question & Quiz Types
// =============================================================================

export type QuestionType = 'multiple-choice' | 'true-false' | 'short-answer'

export interface QuestionOption {
  id: string
  text: string
  isCorrect: boolean
}

export interface Question {
  id: string
  type: QuestionType
  text: string
  options?: QuestionOption[]
  correctAnswer?: string
  points: number
  category: string
  createdAt: string
  updatedAt: string
}

export interface Questionnaire {
  id: string
  title: string
  description: string
  questions: Question[]
  totalPoints: number
  passingScore: number
  timeLimit?: number // in minutes
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// =============================================================================
// Result Types
// =============================================================================

export interface QuestionResult {
  questionId: string
  answer: string
  isCorrect: boolean
  pointsEarned: number
}

export interface StudentResult {
  id: string
  studentId: string
  studentName: string
  studentEmail: string
  questionnaireId: string
  questionnaireTitle: string
  score: number
  totalPoints: number
  percentage: number
  passed: boolean
  completedAt: string
  timeSpent: number // in seconds
  answers: QuestionResult[]
}

// =============================================================================
// Dashboard Stats Types
// =============================================================================

export interface DashboardStats {
  totalStudents: number
  activeSessions: number
  completedTrainings: number
  averageCompletionRate: number
  averageScore: number
  recentActivity: ActivityItem[]
}

export interface ActivityItem {
  id: string
  studentName: string
  action: string
  timestamp: string
  details?: string
}

// =============================================================================
// Navigation Types
// =============================================================================

export interface NavItem {
  id: string
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}
