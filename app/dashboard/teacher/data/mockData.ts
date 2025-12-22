/**
 * Mock Data for Teacher Dashboard
 *
 * Temporary hardcoded data for development and testing.
 * Will be replaced with Supabase queries in the future.
 */

import type {
  Student,
  Question,
  Questionnaire,
  StudentResult,
  DashboardStats,
  TeacherUser,
} from '../types'

// =============================================================================
// Mock Teacher User
// =============================================================================

export const mockTeacher: TeacherUser = {
  id: 'teacher-001',
  email: 'teacher@opskillsim.nz',
  name: 'John Smith',
  role: 'teacher',
  avatar: undefined,
}

// =============================================================================
// Mock Students
// =============================================================================

export const mockStudents: Student[] = [
  {
    id: 'student-001',
    name: 'Emma Wilson',
    email: 'emma.wilson@student.op.ac.nz',
    enrolledDate: '2024-09-15',
    lastActive: '2024-12-20',
    progress: 85,
    status: 'active',
    completedModules: 6,
    totalModules: 8,
    averageScore: 92,
  },
  {
    id: 'student-002',
    name: 'James Chen',
    email: 'james.chen@student.op.ac.nz',
    enrolledDate: '2024-09-15',
    lastActive: '2024-12-19',
    progress: 100,
    status: 'completed',
    completedModules: 8,
    totalModules: 8,
    averageScore: 88,
  },
  {
    id: 'student-003',
    name: 'Sarah Thompson',
    email: 'sarah.thompson@student.op.ac.nz',
    enrolledDate: '2024-10-01',
    lastActive: '2024-12-18',
    progress: 62,
    status: 'active',
    completedModules: 5,
    totalModules: 8,
    averageScore: 76,
  },
  {
    id: 'student-004',
    name: 'Michael Brown',
    email: 'michael.brown@student.op.ac.nz',
    enrolledDate: '2024-10-15',
    lastActive: '2024-12-10',
    progress: 25,
    status: 'inactive',
    completedModules: 2,
    totalModules: 8,
    averageScore: 65,
  },
  {
    id: 'student-005',
    name: 'Olivia Martinez',
    email: 'olivia.martinez@student.op.ac.nz',
    enrolledDate: '2024-11-01',
    lastActive: '2024-12-21',
    progress: 50,
    status: 'active',
    completedModules: 4,
    totalModules: 8,
    averageScore: 84,
  },
  {
    id: 'student-006',
    name: 'David Lee',
    email: 'david.lee@student.op.ac.nz',
    enrolledDate: '2024-11-10',
    lastActive: '2024-12-20',
    progress: 37,
    status: 'active',
    completedModules: 3,
    totalModules: 8,
    averageScore: 79,
  },
]

// =============================================================================
// Mock Questions
// =============================================================================

export const mockQuestions: Question[] = [
  {
    id: 'q-001',
    type: 'multiple-choice',
    text: 'What is the correct order for soldering a copper pipe joint?',
    options: [
      { id: 'a', text: 'Heat, flux, solder, clean', isCorrect: false },
      { id: 'b', text: 'Clean, flux, heat, solder', isCorrect: true },
      { id: 'c', text: 'Flux, clean, solder, heat', isCorrect: false },
      { id: 'd', text: 'Solder, heat, clean, flux', isCorrect: false },
    ],
    points: 10,
    category: 'Soldering',
    createdAt: '2024-09-01',
    updatedAt: '2024-09-01',
  },
  {
    id: 'q-002',
    type: 'true-false',
    text: 'PVC cement should be applied to both the pipe and fitting before joining.',
    correctAnswer: 'true',
    points: 5,
    category: 'PVC Installation',
    createdAt: '2024-09-02',
    updatedAt: '2024-09-02',
  },
  {
    id: 'q-003',
    type: 'multiple-choice',
    text: 'What is the minimum fall required for a 100mm drain pipe?',
    options: [
      { id: 'a', text: '1:40', isCorrect: false },
      { id: 'b', text: '1:60', isCorrect: true },
      { id: 'c', text: '1:80', isCorrect: false },
      { id: 'd', text: '1:100', isCorrect: false },
    ],
    points: 10,
    category: 'Drainage',
    createdAt: '2024-09-03',
    updatedAt: '2024-09-03',
  },
  {
    id: 'q-004',
    type: 'short-answer',
    text: 'Name two safety precautions when working with a blowtorch.',
    correctAnswer: 'fire extinguisher, protective gloves, clear work area, proper ventilation',
    points: 15,
    category: 'Safety',
    createdAt: '2024-09-04',
    updatedAt: '2024-09-04',
  },
  {
    id: 'q-005',
    type: 'multiple-choice',
    text: 'Which tool is used to measure pipe diameter?',
    options: [
      { id: 'a', text: 'Tape measure', isCorrect: false },
      { id: 'b', text: 'Caliper', isCorrect: true },
      { id: 'c', text: 'Spirit level', isCorrect: false },
      { id: 'd', text: 'Plumb bob', isCorrect: false },
    ],
    points: 5,
    category: 'Tools',
    createdAt: '2024-09-05',
    updatedAt: '2024-09-05',
  },
]

// =============================================================================
// Mock Questionnaires
// =============================================================================

export const mockQuestionnaires: Questionnaire[] = [
  {
    id: 'quiz-001',
    title: 'Copper Pipe Soldering Basics',
    description: 'Test your knowledge of copper pipe soldering techniques and safety procedures.',
    questions: mockQuestions.filter(q => q.category === 'Soldering' || q.category === 'Safety'),
    totalPoints: 25,
    passingScore: 18,
    timeLimit: 15,
    isActive: true,
    createdAt: '2024-09-10',
    updatedAt: '2024-11-15',
  },
  {
    id: 'quiz-002',
    title: 'Drainage Systems Assessment',
    description: 'Comprehensive assessment covering drainage installation and regulations.',
    questions: mockQuestions.filter(q => q.category === 'Drainage'),
    totalPoints: 10,
    passingScore: 7,
    timeLimit: 10,
    isActive: true,
    createdAt: '2024-09-15',
    updatedAt: '2024-10-20',
  },
  {
    id: 'quiz-003',
    title: 'PVC Installation Module',
    description: 'Quiz covering PVC pipe installation methods and best practices.',
    questions: mockQuestions.filter(q => q.category === 'PVC Installation'),
    totalPoints: 5,
    passingScore: 4,
    timeLimit: 5,
    isActive: false,
    createdAt: '2024-10-01',
    updatedAt: '2024-10-01',
  },
  {
    id: 'quiz-004',
    title: 'Plumbing Tools & Equipment',
    description: 'Identify and understand the proper use of plumbing tools.',
    questions: mockQuestions.filter(q => q.category === 'Tools'),
    totalPoints: 5,
    passingScore: 4,
    timeLimit: 8,
    isActive: true,
    createdAt: '2024-10-15',
    updatedAt: '2024-12-01',
  },
]

// =============================================================================
// Mock Results
// =============================================================================

export const mockResults: StudentResult[] = [
  {
    id: 'result-001',
    studentId: 'student-001',
    studentName: 'Emma Wilson',
    studentEmail: 'emma.wilson@student.op.ac.nz',
    questionnaireId: 'quiz-001',
    questionnaireTitle: 'Copper Pipe Soldering Basics',
    score: 23,
    totalPoints: 25,
    percentage: 92,
    passed: true,
    completedAt: '2024-12-15T14:30:00Z',
    timeSpent: 720,
    answers: [],
  },
  {
    id: 'result-002',
    studentId: 'student-002',
    studentName: 'James Chen',
    studentEmail: 'james.chen@student.op.ac.nz',
    questionnaireId: 'quiz-001',
    questionnaireTitle: 'Copper Pipe Soldering Basics',
    score: 22,
    totalPoints: 25,
    percentage: 88,
    passed: true,
    completedAt: '2024-12-14T10:15:00Z',
    timeSpent: 680,
    answers: [],
  },
  {
    id: 'result-003',
    studentId: 'student-003',
    studentName: 'Sarah Thompson',
    studentEmail: 'sarah.thompson@student.op.ac.nz',
    questionnaireId: 'quiz-002',
    questionnaireTitle: 'Drainage Systems Assessment',
    score: 8,
    totalPoints: 10,
    percentage: 80,
    passed: true,
    completedAt: '2024-12-16T09:45:00Z',
    timeSpent: 420,
    answers: [],
  },
  {
    id: 'result-004',
    studentId: 'student-004',
    studentName: 'Michael Brown',
    studentEmail: 'michael.brown@student.op.ac.nz',
    questionnaireId: 'quiz-001',
    questionnaireTitle: 'Copper Pipe Soldering Basics',
    score: 15,
    totalPoints: 25,
    percentage: 60,
    passed: false,
    completedAt: '2024-12-10T11:20:00Z',
    timeSpent: 900,
    answers: [],
  },
  {
    id: 'result-005',
    studentId: 'student-005',
    studentName: 'Olivia Martinez',
    studentEmail: 'olivia.martinez@student.op.ac.nz',
    questionnaireId: 'quiz-004',
    questionnaireTitle: 'Plumbing Tools & Equipment',
    score: 5,
    totalPoints: 5,
    percentage: 100,
    passed: true,
    completedAt: '2024-12-20T15:00:00Z',
    timeSpent: 300,
    answers: [],
  },
  {
    id: 'result-006',
    studentId: 'student-001',
    studentName: 'Emma Wilson',
    studentEmail: 'emma.wilson@student.op.ac.nz',
    questionnaireId: 'quiz-002',
    questionnaireTitle: 'Drainage Systems Assessment',
    score: 9,
    totalPoints: 10,
    percentage: 90,
    passed: true,
    completedAt: '2024-12-18T13:30:00Z',
    timeSpent: 380,
    answers: [],
  },
]

// =============================================================================
// Mock Dashboard Stats
// =============================================================================

export const mockDashboardStats: DashboardStats = {
  totalStudents: mockStudents.length,
  activeSessions: 3,
  completedTrainings: mockResults.filter(r => r.passed).length,
  averageCompletionRate: Math.round(
    mockStudents.reduce((acc, s) => acc + s.progress, 0) / mockStudents.length
  ),
  averageScore: Math.round(
    mockResults.reduce((acc, r) => acc + r.percentage, 0) / mockResults.length
  ),
  recentActivity: [
    {
      id: 'act-001',
      studentName: 'Emma Wilson',
      action: 'Completed quiz',
      timestamp: '2024-12-20T15:30:00Z',
      details: 'Drainage Systems Assessment - 90%',
    },
    {
      id: 'act-002',
      studentName: 'Olivia Martinez',
      action: 'Started training',
      timestamp: '2024-12-20T14:45:00Z',
      details: 'Module 5: Advanced Pipe Fitting',
    },
    {
      id: 'act-003',
      studentName: 'David Lee',
      action: 'Completed module',
      timestamp: '2024-12-20T11:20:00Z',
      details: 'Module 3: Safety Procedures',
    },
    {
      id: 'act-004',
      studentName: 'James Chen',
      action: 'Achieved certification',
      timestamp: '2024-12-19T16:00:00Z',
      details: 'Plumbing Fundamentals Certificate',
    },
  ],
}
