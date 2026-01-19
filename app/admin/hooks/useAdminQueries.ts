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

// =============================================================================
// Constants
// =============================================================================

const TEN_MINUTES = 10 * 60 * 1000

export const adminQueryKeys = {
  results: ['admin', 'results'] as const,
  sessions: ['admin', 'sessions'] as const,
  questions: ['admin', 'questions'] as const,
  users: ['admin', 'users'] as const,
  fittings: ['admin', 'fittings'] as const,
  trainingAnalytics: ['admin', 'training-analytics'] as const,
  sessionsChart: (range: string) => ['admin', 'sessions-chart', range] as const,
  userSessions: (email: string) => ['admin', 'user-sessions', email] as const,
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

interface FittingOption {
  id: number
  fitting_id: string
  name: string
  description: string | null
  is_correct: boolean
  created_at: string
}

async function fetchFittings(): Promise<FittingOption[]> {
  const response = await fetch('/api/admin/fittings')

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const data = await response.json()

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch fittings')
  }

  return data.fittings || []
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

async function updateUserRole(params: { userId: string; role: 'student' | 'teacher' | 'admin' }): Promise<RegisteredUser> {
  const response = await fetch('/api/admin/users', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to update user role')
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
 * Hook to fetch fittings
 */
export function useFittings() {
  return useQuery({
    queryKey: adminQueryKeys.fittings,
    queryFn: fetchFittings,
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

/**
 * Hook to update user role (admin only)
 */
export function useUpdateUserRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateUserRole,
    onSuccess: (updatedUser) => {
      // Update the users cache
      queryClient.setQueryData<{ users: RegisteredUser[]; stats: UsersStats }>(
        adminQueryKeys.users,
        (old) => {
          if (!old) return old
          const newUsers = old.users.map(u =>
            u.id === updatedUser.id ? updatedUser : u
          )
          // Stats don't change with role updates, but recalculate anyway
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

// =============================================================================
// Delete API Fetchers
// =============================================================================

interface DeleteResponse {
  success: boolean
  deletedCount: number
  deletedIds: string[]
  errors?: string[]
}

async function deleteSessions(params: { ids: string[]; type: 'student' | 'teacher' | 'admin' }): Promise<DeleteResponse> {
  const response = await fetch('/api/admin/sessions', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to delete sessions')
  }

  return data
}

async function deleteResults(params: { ids: string[] }): Promise<DeleteResponse> {
  const response = await fetch('/api/admin/results', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to delete results')
  }

  return data
}

async function deleteUsers(params: { ids: string[] }): Promise<DeleteResponse> {
  const response = await fetch('/api/admin/users', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to delete users')
  }

  return data
}

// =============================================================================
// Delete Mutation Hooks
// =============================================================================

/**
 * Hook to delete sessions (LTI Admin only)
 */
export function useDeleteSessions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteSessions,
    onSuccess: (data, variables) => {
      // Update the sessions cache by removing deleted items
      queryClient.setQueryData<{
        students: SessionStudent[]
        teachers: SessionTeacher[]
        admins: SessionAdmin[]
        stats: SessionsStats
      }>(
        adminQueryKeys.sessions,
        (old) => {
          if (!old) return old

          const deletedSet = new Set(data.deletedIds)

          if (variables.type === 'student') {
            const newStudents = old.students.filter(s => !deletedSet.has(s.id))
            return {
              ...old,
              students: newStudents,
              stats: {
                ...old.stats,
                students: {
                  ...old.stats.students,
                  total: newStudents.length,
                  active: newStudents.filter(s => s.status === 'active').length,
                  completed: newStudents.filter(s => s.status === 'completed').length,
                },
              },
            }
          } else if (variables.type === 'teacher') {
            const newTeachers = old.teachers.filter(t => !deletedSet.has(t.id))
            return {
              ...old,
              teachers: newTeachers,
              stats: {
                ...old.stats,
                teachers: {
                  total: newTeachers.length,
                  active: newTeachers.filter(t => t.status === 'active').length,
                },
              },
            }
          } else if (variables.type === 'admin') {
            const newAdmins = old.admins.filter(a => !deletedSet.has(a.id))
            return {
              ...old,
              admins: newAdmins,
              stats: {
                ...old.stats,
                admins: {
                  total: newAdmins.length,
                  active: newAdmins.filter(a => a.status === 'active').length,
                },
              },
            }
          }

          return old
        }
      )
    },
  })
}

/**
 * Hook to delete results (LTI Admin only)
 */
export function useDeleteResults() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteResults,
    onSuccess: (data) => {
      // Update the results cache by removing deleted items
      queryClient.setQueryData<{
        results: QuizResult[]
        stats: ResultsStats
        courses: Course[]
      }>(
        adminQueryKeys.results,
        (old) => {
          if (!old) return old

          const deletedSet = new Set(data.deletedIds)
          const newResults = old.results.filter(r => !deletedSet.has(r.id))

          // Recalculate stats
          const passedCount = newResults.filter(r => r.passed).length
          const failedCount = newResults.filter(r => !r.passed).length

          return {
            ...old,
            results: newResults,
            stats: {
              totalResults: newResults.length,
              passedCount,
              failedCount,
              avgScore: newResults.length > 0
                ? Math.round(newResults.reduce((acc, r) => acc + r.scorePercentage, 0) / newResults.length)
                : 0,
              passRate: newResults.length > 0
                ? Math.round((passedCount / newResults.length) * 100)
                : 0,
            },
          }
        }
      )
    },
  })
}

/**
 * Hook to delete users (LTI Admin only)
 */
export function useDeleteUsers() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteUsers,
    onSuccess: (data) => {
      // Update the users cache by removing deleted items
      queryClient.setQueryData<{ users: RegisteredUser[]; stats: UsersStats }>(
        adminQueryKeys.users,
        (old) => {
          if (!old) return old

          const deletedSet = new Set(data.deletedIds)
          const newUsers = old.users.filter(u => !deletedSet.has(u.id))

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

// =============================================================================
// Chart Types
// =============================================================================

interface StatusCount {
  status: string
  count: number
}

interface PhaseCount {
  phaseKey: string
  phaseName: string
  phaseOrder: number
  count: number
}

export interface TrainingAnalyticsData {
  statusCounts: StatusCount[]
  phaseCounts: PhaseCount[]
  totals: {
    completed: number
    active: number
    total: number
  }
}

export interface SessionsChartDataPoint {
  label: string
  students: number
  teachers: number
  admins: number
}

// =============================================================================
// Chart API Fetchers
// =============================================================================

async function fetchTrainingAnalytics(): Promise<TrainingAnalyticsData> {
  const response = await fetch('/api/admin/training-analytics')

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const data = await response.json()

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch training analytics')
  }

  return data.data
}

async function fetchSessionsChart(range: string): Promise<SessionsChartDataPoint[]> {
  const response = await fetch(`/api/admin/sessions-chart?range=${range}`)

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const data = await response.json()

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch sessions chart data')
  }

  return data.data
}

// =============================================================================
// Chart Query Hooks
// =============================================================================

/**
 * Hook to fetch training analytics data (for SessionStatusChart and PhaseDistributionChart)
 * Cached for 10 minutes, refetches after 10 minutes
 */
export function useTrainingAnalytics() {
  return useQuery({
    queryKey: adminQueryKeys.trainingAnalytics,
    queryFn: fetchTrainingAnalytics,
    staleTime: TEN_MINUTES,
    refetchInterval: TEN_MINUTES,
    retry: 1,
  })
}

/**
 * Hook to fetch sessions chart data
 * Cached for 10 minutes, refetches after 10 minutes
 */
export function useSessionsChart(range: 'weekly' | 'monthly' | 'yearly') {
  return useQuery({
    queryKey: adminQueryKeys.sessionsChart(range),
    queryFn: () => fetchSessionsChart(range),
    staleTime: TEN_MINUTES,
    refetchInterval: TEN_MINUTES,
    retry: 1,
  })
}

// =============================================================================
// User Sessions Types and Fetcher
// =============================================================================

export interface UserLoginSession {
  id: string
  sessionId: string
  sessionType: 'lti' | 'teacher'
  role: string
  status: string
  createdAt: string
  lastActivity: string
  expiresAt: string
  ipAddress: string | null
  userAgent: string | null
  loginCount: number
}

async function fetchUserSessions(email: string): Promise<UserLoginSession[]> {
  const response = await fetch(`/api/admin/user-sessions?email=${encodeURIComponent(email)}`)

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const data = await response.json()

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch user sessions')
  }

  return data.sessions || []
}

/**
 * Hook to fetch user's login sessions by email
 * Only fetches if email is provided
 */
export function useUserSessions(email: string | undefined) {
  return useQuery({
    queryKey: adminQueryKeys.userSessions(email || ''),
    queryFn: () => fetchUserSessions(email!),
    enabled: !!email,
    retry: 1,
  })
}
