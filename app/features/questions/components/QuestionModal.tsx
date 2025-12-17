'use client'

import { useState, useCallback, useEffect } from 'react'
import type { QuestionData } from '@/app/lib/messageTypes'

// =============================================================================
// Props Interface
// =============================================================================

interface QuestionModalProps {
  question: QuestionData | null
  tryCount: number
  onSubmitAnswer: (selectedAnswer: number) => { correct: boolean; message: string } | undefined
  onClose: () => void
}

// =============================================================================
// Component
// =============================================================================

export function QuestionModal({
  question,
  tryCount,
  onSubmitAnswer,
  onClose
}: QuestionModalProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [answerFeedback, setAnswerFeedback] = useState<{ correct: boolean; message: string } | null>(null)

  // Reset state when question changes
  useEffect(() => {
    setSelectedAnswer(null)
    setAnswerFeedback(null)
  }, [question?.id])

  const handleAnswerSubmit = useCallback(() => {
    if (selectedAnswer === null || !question) return

    const result = onSubmitAnswer(selectedAnswer)

    if (result?.correct) {
      setAnswerFeedback({
        correct: true,
        message: 'Correct! ' + question.explanation
      })

      // For Q6, don't auto-close - user must click Close button
      if (question.id !== 'Q6') {
        setTimeout(() => {
          handleClose()
        }, 2500)
      }
    } else {
      setAnswerFeedback({
        correct: false,
        message: result?.message || 'Incorrect. Try again!'
      })
      setSelectedAnswer(null)
    }
  }, [selectedAnswer, question, onSubmitAnswer])

  const handleClose = useCallback(() => {
    setSelectedAnswer(null)
    setAnswerFeedback(null)
    onClose()
  }, [onClose])

  // Don't render if no question
  if (!question) return null

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#16213e] rounded-2xl p-6 max-w-lg w-full mx-4 border border-[#2c3e50] shadow-2xl">
        {/* Question Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <span className="text-blue-400 font-bold text-lg">{question.id}</span>
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg">Assessment Question</h3>
            <p className="text-gray-500 text-xs">
              Attempt {tryCount} - Select the correct answer
            </p>
          </div>
        </div>

        {/* Question Text */}
        <p className="text-white text-lg mb-6">{question.text}</p>

        {/* Answer Options */}
        <div className="space-y-2 mb-4">
          {question.options.map((option, index) => (
            <button
              key={index}
              onClick={() => setSelectedAnswer(index)}
              disabled={answerFeedback?.correct}
              className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                selectedAnswer === index
                  ? answerFeedback
                    ? answerFeedback.correct
                      ? 'bg-green-500/20 border-green-500 text-green-300'
                      : 'bg-red-500/20 border-red-500 text-red-300'
                    : 'bg-blue-500/20 border-blue-500 text-white'
                  : 'bg-[#1e2a4a] border-[#2c3e50] text-white hover:bg-[#2c3e50] hover:border-blue-500'
              }`}
            >
              <span className="text-blue-400 font-bold mr-3">{String.fromCharCode(65 + index)}.</span>
              {option}
            </button>
          ))}
        </div>

        {/* Feedback Message */}
        {answerFeedback && (
          <div className={`p-3 rounded-lg mb-4 ${
            answerFeedback.correct
              ? 'bg-green-500/20 border border-green-500/50 text-green-300'
              : 'bg-red-500/20 border border-red-500/50 text-red-300'
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{answerFeedback.correct ? '✓' : '✗'}</span>
              <span className="text-sm">{answerFeedback.message}</span>
            </div>
          </div>
        )}

        {/* Q6 Special Notice */}
        {question.id === 'Q6' && answerFeedback?.correct && (
          <div className="bg-yellow-500/20 border border-yellow-500/50 text-yellow-300 p-3 rounded-lg mb-4">
            <div className="text-sm font-bold">Warning: Click "Close" to start pressure testing!</div>
            <div className="text-xs opacity-80">The pressure test will begin when you close this question.</div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {!answerFeedback?.correct ? (
            <button
              onClick={handleAnswerSubmit}
              disabled={selectedAnswer === null}
              className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                selectedAnswer !== null
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 cursor-pointer'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              Submit Answer
            </button>
          ) : (
            <button
              onClick={handleClose}
              className="flex-1 py-3 rounded-lg font-bold bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 transition-all"
            >
              {question.id === 'Q6' ? '✓ Close & Start Pressure Test' : '✓ Continue'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default QuestionModal
