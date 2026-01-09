/**
 * Admin Query Hooks
 *
 * TanStack Query hooks for admin data fetching.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  QuizResult,
  ResultsStats,
  SessionStudent,
  SessionTeacher,
  SessionAdmin,
  SessionsStats,
  Course,
  QuestionFromDB,
  RegisteredUser,
  UsersStats,
  ApprovalStatus,
} from '../types'

// =============================================================================
// Query Keys
// =============================================================================

export const adminQueryKeys = {
  results: ['admin', 'results'] as const,
  sessions: ['admin', 'sessions'] as const,
  questions: ['admin', 'questions'] as const,
  users: ['admin', 'users'] as const,
}

// =============================================================================
// API Fetchers
// =============================================================================

async function fetchResults(): Promise<{
  results: QuizResult[]
  stats: ResultsStats
  courses: Course[]
}> {
  const response = await fetch('/api/admin/results')

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const data = await response.json()

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch results')
  }

  return {
    results: data.results || [],
    stats: data.stats || { totalResults: 0, passedCount: 0, failedCount: 0, avgScore: 0, passRate: 0 },
    courses: data.courses || [],
  }
}

async function fetchSessions(): Promise<{
  students: SessionStudent[]
  teachers: SessionTeacher[]
  admins: SessionAdmin[]
  stats: SessionsStats
}> {
  const response = await fetch('/api/admin/sessions')

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const data = await response.json()

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch sessions')
  }

  return {
    students: data.students || [],
    teachers: data.teachers || [],
    admins: data.admins || [],
    stats: data.stats || {
      students: { total: 0, active: 0, completed: 0, avgProgress: 0 },
      teachers: { total: 0, active: 0 },
      admins: { total: 0, active: 0 },
    },
  }
}

async function fetchQuestions(): Promise<QuestionFromDB[]> {
  const response = await fetch('/api/admin/questions')
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch questions')
  }

  return data.questions || []
}

async function fetchUsers(): Promise<{
  users: RegisteredUser[]
  stats: UsersStats
}> {
  const response = await fetch('/api/admin/users')

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const data = await response.json()

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch users')
  }

  return {
    users: data.users || [],
    stats: data.stats || { total: 0, pending: 0, approved: 0, rejected: 0, outsiders: 0 },
  }
}

async function updateUserApproval(params: { userId: string; approval_status: ApprovalStatus }): Promise<RegisteredUser> {
  const response = await fetch('/api/admin/users', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to update user')
  }

  return data.user
}

async function updateQuestion(question: QuestionFromDB): Promise<QuestionFromDB> {
  const response = await fetch('/api/questions', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question_id: question.question_id,
      question_text: question.question_text,
      option_a: question.option_a,
      option_b: question.option_b,
      option_c: question.option_c,
      option_d: question.option_d,
      correct_answer: question.correct_answer,
      nzs3500_reference: question.nzs3500_reference,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to update question')
  }

  return question
}

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Hook to fetch quiz results
 */
export function useResults() {
  return useQuery({
    queryKey: adminQueryKeys.results,
    queryFn: fetchResults,
    retry: 1,
  })
}

/**
 * Hook to fetch all sessions (students, teachers, admins)
 */
export function useSessions() {
  return useQuery({
    queryKey: adminQueryKeys.sessions,
    queryFn: fetchSessions,
    retry: 1,
  })
}

/**
 * Hook to fetch questionnaires
 */
export function useQuestions() {
  return useQuery({
    queryKey: adminQueryKeys.questions,
    queryFn: fetchQuestions,
    retry: 1,
  })
}

/**
 * Hook to update a question
 */
export function useUpdateQuestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateQuestion,
    onSuccess: (updatedQuestion) => {
      // Update the questions cache
      queryClient.setQueryData<QuestionFromDB[]>(
        adminQueryKeys.questions,
        (old) => old?.map(q =>
          q.question_id === updatedQuestion.question_id ? updatedQuestion : q
        )
      )
    },
  })
}

/**
 * Hook to fetch registered users
 */
export function useUsers() {
  return useQuery({
    queryKey: adminQueryKeys.users,
    queryFn: fetchUsers,
    retry: 1,
  })
}

/**
 * Hook to update user approval status
 */
export function useUpdateUserApproval() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateUserApproval,
    onSuccess: (updatedUser) => {
      // Update the users cache
      queryClient.setQueryData<{ users: RegisteredUser[]; stats: UsersStats }>(
        adminQueryKeys.users,
        (old) => {
          if (!old) return old
          const newUsers = old.users.map(u =>
            u.id === updatedUser.id ? updatedUser : u
          )
          // Recalculate stats
          const stats: UsersStats = {
            total: newUsers.length,
            pending: newUsers.filter(u => u.approval_status === 'pending').length,
            approved: newUsers.filter(u => u.approval_status === 'approved').length,
            rejected: newUsers.filter(u => u.approval_status === 'rejected').length,
            outsiders: newUsers.filter(u => u.registration_type === 'outsider').length,
          }
          return { users: newUsers, stats }
        }
      )
    },
  })
}
