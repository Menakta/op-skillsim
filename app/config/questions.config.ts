/**
 * Questions Configuration
 *
 * Centralized configuration for training questions (Q1-Q6).
 */

// =============================================================================
// Question Types
// =============================================================================

export interface QuestionData {
  id: string
  name: string
  text: string
  options: string[]
  correctAnswer: number
  explanation: string
  category: 'scanning' | 'excavation' | 'measurement' | 'connection' | 'testing'
}

// =============================================================================
// Question Database
// =============================================================================

export const QUESTION_DATABASE: Record<string, QuestionData> = {
  'Q1': {
    id: 'Q1',
    name: 'Scanning',
    text: "What should you do before excavating near existing utilities?",
    options: [
      "Start digging immediately",
      "Use XRay scanner to locate pipes",
      "Call for permits only",
      "Mark the area with spray paint"
    ],
    correctAnswer: 1,
    explanation: "XRay scanning must be performed first to safely locate existing pipes and utilities before any excavation work begins.",
    category: 'scanning'
  },
  'Q2': {
    id: 'Q2',
    name: 'Trench Depth',
    text: "What is the minimum excavation depth for toilet waste pipe connections?",
    options: ["200mm", "300mm", "450mm", "600mm"],
    correctAnswer: 2,
    explanation: "Toilet waste pipe connections typically require a minimum excavation depth of 450mm to ensure proper fall and connection to the main sewer line.",
    category: 'excavation'
  },
  'Q3': {
    id: 'Q3',
    name: 'Trench Width',
    text: "What is the standard trench width for 100mm pipes?",
    options: ["200mm", "300mm", "400mm", "500mm"],
    correctAnswer: 2,
    explanation: "Trenches should be 3-4 times the pipe diameter, so 400mm for 100mm pipes.",
    category: 'excavation'
  },
  'Q4': {
    id: 'Q4',
    name: 'Pipe Slope',
    text: "What is the correct slope for drainage pipes?",
    options: ["1:40", "1:60", "1:80", "1:100"],
    correctAnswer: 1,
    explanation: "A slope of 1:60 (1.67%) ensures proper drainage flow for most applications.",
    category: 'measurement'
  },
  'Q5': {
    id: 'Q5',
    name: 'Pressure',
    text: "Maximum pressure for residential water systems?",
    options: ["350 kPa", "500 kPa", "650 kPa", "800 kPa"],
    correctAnswer: 1,
    explanation: "Residential water systems typically operate at 500 kPa maximum pressure.",
    category: 'testing'
  },
  'Q6': {
    id: 'Q6',
    name: 'PSI Level',
    text: "What PSI level confirms a successful air pressure test according to NZS3500?",
    options: ["10 PSI", "15 PSI", "20 PSI", "25 PSI"],
    correctAnswer: 2,
    explanation: "According to NZS3500 standards, a successful air pressure test requires maintaining 20 PSI for the specified test duration without pressure loss.",
    category: 'testing'
  }
}

// =============================================================================
// Question IDs
// =============================================================================

export const QUESTION_IDS = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6'] as const
export type QuestionId = typeof QUESTION_IDS[number]

// =============================================================================
// Helper Functions
// =============================================================================

export function getQuestion(id: string): QuestionData | undefined {
  return QUESTION_DATABASE[id]
}

export function isCorrectAnswer(questionId: string, selectedAnswer: number): boolean {
  const question = QUESTION_DATABASE[questionId]
  return question ? question.correctAnswer === selectedAnswer : false
}

export function getQuestionsByCategory(category: QuestionData['category']): QuestionData[] {
  return Object.values(QUESTION_DATABASE).filter(q => q.category === category)
}

export function getTotalQuestions(): number {
  return Object.keys(QUESTION_DATABASE).length
}
