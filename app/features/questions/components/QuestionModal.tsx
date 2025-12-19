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
  const [wrongAnswer, setWrongAnswer] = useState<number | null>(null)
  const [answerFeedback, setAnswerFeedback] = useState<{ correct: boolean; message: string } | null>(null)

  // Reset state when question changes
  useEffect(() => {
    setSelectedAnswer(null)
    setWrongAnswer(null)
    setAnswerFeedback(null)
  }, [question?.id])

  // When user selects a new answer, clear the wrong state
  const handleSelectAnswer = useCallback((index: number) => {
    setSelectedAnswer(index)
    setWrongAnswer(null)
    setAnswerFeedback(null)
  }, [])

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
      setWrongAnswer(selectedAnswer)
      setAnswerFeedback({
        correct: false,
        message: result?.message || 'Incorrect. Try again!'
      })
    }
  }, [selectedAnswer, question, onSubmitAnswer])

  const handleClose = useCallback(() => {
    setSelectedAnswer(null)
    setWrongAnswer(null)
    setAnswerFeedback(null)
    onClose()
  }, [onClose])

  // Don't render if no question
  if (!question) return null

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div
        className="bg-[#000000]/40 backdrop-blur-md rounded-2xl max-w-[660px] w-full mx-4 shadow-2xl border border-gray-700/50"
        style={{
          animation: 'modalFadeIn 0.3s ease-out'
        }}
      >
        {/* Question Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-400 px-2 py-4">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-white font-small text-base">{question.name}</h3>
            </div>
          </div>
        </div>

        {/* Content Area - Image on left, Question/Answers on right */}
        <div className="flex gap-5 px-2.5 py-5">
          {/* Left Side - Image Placeholder */}
          <div
            className="flex-shrink-0 bg-white rounded-xl hidden md:flex items-center justify-center"
            style={{ width: '256px', height: '294px' }}
          >
            <span className="text-gray-400 text-sm">Image</span>
          </div>

          {/* Right Side - Question and Answers */}
          <div className="flex-1">
            {/* Question Text */}
            <p className="text-gray-300 text-sm text-base mb-5 leading-relaxed">{question.text}</p>

            {/* Answer Options */}
            <div className="space-y-2">
              {question.options.map((option, index) => {
                const isSelected = selectedAnswer === index
                const isCorrectAnswer = answerFeedback?.correct && isSelected
                const isWrongAnswer = wrongAnswer === index

                return (
                  <button
                    key={index}
                    onClick={() => handleSelectAnswer(index)}
                    disabled={answerFeedback?.correct}
                    className={`w-full p-3 text-left rounded-xl transition-all duration-200 flex items-center gap-3 ${
                      isCorrectAnswer
                        ? 'text-green-300'
                        : isWrongAnswer
                        ? 'bg-red-500/20 border border-red-500/50 text-red-300'
                        : isSelected
                        ? 'text-white'
                        : 'text-gray-200 hover:bg-[#000000]/30 hover:border-[#39BEAE]/50'
                    }`}
                  >
                    {/* Radio Button */}
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                        isCorrectAnswer
                          ? 'border-green-400'
                          : isWrongAnswer
                          ? 'border-red-400 bg-red-400'
                          : isSelected
                          ? 'border-gray-300'
                          : 'border-gray-500'
                      }`}
                    >
                      {(isSelected || isWrongAnswer) && (
                        <div className="w-2 h-2 rounded-full bg-white transition-all duration-200" />
                      )}
                    </div>
                    <span>{option}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Feedback Message - Full Width */}
        {answerFeedback && (
          <div className={`p-3 rounded-xl mb-4 mx-2.5 ${
            answerFeedback.correct
              ? 'bg-green-500/20 border border-green-500/40 text-green-300'
              : 'bg-red-500/20 border border-red-500/40 text-red-300'
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-sm">{answerFeedback.message}</span>
            </div>
          </div>
        )}

        {/* Q6 Special Notice - Full Width */}
        {question.id === 'Q6' && answerFeedback?.correct && (
          <div className="text-white p-3 rounded-xl mb-4 mx-2.5">
            <div className="text-xs opacity-80">Note: This is the last question.</div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3 px-5 pb-6 border-t border-gray-400 py-4">
          {!answerFeedback?.correct ? (
            <button
              onClick={handleAnswerSubmit}
              disabled={selectedAnswer === null}
              className={`py-2 px-4 rounded-full font-medium transition-all duration-200 ${
                selectedAnswer !== null
                  ? 'bg-[#44CF8A] text-white hover:bg-[#2ea89a] cursor-pointer shadow-lg shadow-[#39BEAE]/20'
                  : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
              }`}
            >
              Submit Answer
            </button>
          ) : (
            <button
              onClick={handleClose}
              className="py-2 px-4 rounded-full font-medium bg-[#39BEAE] text-white hover:bg-[#2ea89a] transition-all duration-200 shadow-lg shadow-[#39BEAE]/20"
            >
              Continue
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes modalFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  )
}

export default QuestionModal
