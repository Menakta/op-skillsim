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
}

export interface SessionTeacher {
  id: string
  sessionId: string
  name: string
  email: string
  institution: string
  createdAt: string
  status: string
  ipAddress: string | null
  userAgent: string | null
  loginCount: number
  lastLoginAt: string | null
}

export interface SessionAdmin {
  id: string
  sessionId: string
  name: string
  email: string
  institution: string
  createdAt: string
  status: string
  ipAddress: string | null
  userAgent: string | null
  loginCount: number
  lastLoginAt: string | null
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

export type StatusFilter = 'all' | 'active' | 'paused' | 'completed' | 'terminated'
export type ResultFilter = 'all' | 'passed' | 'failed'
export type SessionTabType = 'students' | 'teachers' | 'admins'

// =============================================================================
// Questionnaire Database Types
// =============================================================================

export interface QuestionFromDB {
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
  updated_at?: string
}

// =============================================================================
// UI Component Props Types
// =============================================================================

export interface Column<T> {
  key: string
  header: string
  className?: string
  headerClassName?: string
  render: (item: T) => React.ReactNode
}

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'

// =============================================================================
// Fittings Types
// =============================================================================

export interface Fitting {
  id: string
  name: string
  description: string | null
  category: string
  icon_url: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface FittingsStats {
  total: number
  active: number
  inactive: number
  categories: number
}

// =============================================================================
// Registered User Types (for Users page)
// =============================================================================

export type RegistrationType = 'lti' | 'outsider' | 'demo'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface RegisteredUser {
  id: string
  email: string
  full_name: string | null
  registration_type: RegistrationType
  approval_status: ApprovalStatus
  role: 'student' | 'teacher' | 'admin'
  institution: string | null
  is_confirmed: boolean
  created_at: string
  updated_at: string
}

export interface UsersStats {
  total: number
  pending: number
  approved: number
  rejected: number
  outsiders: number
}

export type ApprovalFilter = 'all' | 'pending' | 'approved' | 'rejected'

// =============================================================================
// Admin Notification Types
// =============================================================================

export * from './notifications'
