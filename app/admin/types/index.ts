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

// =============================================================================
// Quiz Result Types (for Results page)
// =============================================================================

export interface QuestionDetail {
  questionId: string
  answer: string
  correct: boolean
  attempts: number
  time: number
}

export interface QuizResult {
  id: string
  sessionId: string
  studentName: string
  studentEmail: string
  courseName: string
  courseId: string
  totalQuestions: number
  correctCount: number
  scorePercentage: number
  passed: boolean
  status: string
  currentPhase: string
  timeSpent: number
  answeredAt: string
  startedAt: string
  questions: QuestionDetail[]
}

export interface ResultsStats {
  totalResults: number
  passedCount: number
  failedCount: number
  avgScore: number
  passRate: number
}

// =============================================================================
// Session Types (for Sessions page)
// =============================================================================

export interface SessionStudent {
  id: string
  sessionId: string
  name: string
  email: string
  institution: string
  courseName: string
  courseId: string
  enrolledDate: string
  lastActive: string
  progress: number
  status: string
  totalScore: number
  phasesCompleted: number
  timeSpent: number
  ipAddress: string | null
  userAgent: string | null
  loginCount: number
}

export interface SessionTeacher {
  id: string
  sessionId: string
  email: string
  createdAt: string
  lastActivity: string
  status: string
  ipAddress: string | null
  userAgent: string | null
  loginCount: number
}

export interface SessionAdmin {
  id: string
  sessionId: string
  email: string
  createdAt: string
  lastActivity: string
  status: string
  ipAddress: string | null
  userAgent: string | null
  loginCount: number
}

export interface SessionsStats {
  students: {
    total: number
    active: number
    completed: number
    avgProgress: number
  }
  teachers: {
    total: number
    active: number
  }
  admins: {
    total: number
    active: number
  }
}

// =============================================================================
// Common Filter Types
// =============================================================================

export interface Course {
  id: string
  title: string
}

export type StatusFilter = 'all' | 'active' | 'paused' | 'completed'
export type ResultFilter = 'all' | 'passed' | 'failed'
export type SessionTabType = 'students' | 'teachers' | 'admins'
