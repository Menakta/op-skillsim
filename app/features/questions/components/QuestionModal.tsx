'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTheme } from '@/app/context/ThemeContext'
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

  // Ref to track auto-close timeout so we can cancel it
  const autoCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const { theme } = useTheme()
  const isDark = theme === 'dark'

  // Reset state when question changes and cancel any pending auto-close
  useEffect(() => {
    // Cancel pending auto-close from previous question
    if (autoCloseTimeoutRef.current) {
      console.log('🔒 [QuestionModal] Cancelling auto-close timeout for previous question')
      clearTimeout(autoCloseTimeoutRef.current)
      autoCloseTimeoutRef.current = null
    }

    setSelectedAnswer(null)
    setWrongAnswer(null)
    setAnswerFeedback(null)
  }, [question?.id])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoCloseTimeoutRef.current) {
        clearTimeout(autoCloseTimeoutRef.current)
      }
    }
  }, [])

  // When user selects a new answer, clear the wrong state
  const handleSelectAnswer = useCallback((index: number) => {
    setSelectedAnswer(index)
    setWrongAnswer(null)
    setAnswerFeedback(null)
  }, [])

  const handleClose = useCallback(() => {
    setSelectedAnswer(null)
    setWrongAnswer(null)
    setAnswerFeedback(null)
    onClose()
  }, [onClose])

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
        // Store timeout ref so we can cancel if a new question arrives
        autoCloseTimeoutRef.current = setTimeout(() => {
          autoCloseTimeoutRef.current = null
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
  }, [selectedAnswer, question, onSubmitAnswer, handleClose])

  // Don't render if no question
  if (!question) {
    console.log('🔒 [QuestionModal] Not rendering - question is null')
    return null
  }

  return (
    <div className={`absolute inset-0 z-30 flex items-start sm:items-center justify-center overflow-y-auto py-4 sm:py-8 ${
      isDark ? 'bg-black/20' : 'bg-black/30'
    } backdrop-blur-sm`}>
      <div
        className={`backdrop-blur-md rounded-2xl max-w-[660px] w-full mx-4 shadow-2xl border my-auto max-h-[calc(100vh-120px)] sm:max-h-[calc(100vh-80px)] flex flex-col ${
          isDark
            ? 'bg-[#000000]/55 border-gray-700/50'
            : 'bg-white/88 border-gray-200'
        }`}
        style={{
          animation: 'modalFadeIn 0.3s ease-out'
        }}
      >
        {/* Question Header - Fixed at top */}
        <div className={`flex-shrink-0 flex items-center justify-between pb-4 border-b px-2 py-4 ${
          isDark ? 'border-gray-400' : 'border-gray-900'
        }`}>
          <div className="flex items-center gap-3">
            <div>
              <h3 className={`font-small text-base ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>{question.name}</h3>
            </div>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Content Area - Image on left, Question/Answers on right */}
          <div className="flex gap-2 px-2 py-3">
            {/* Left Side - Image Placeholder */}
            <div
              className={`flex-shrink-0 rounded-xl hidden md:flex items-center justify-center ${
                isDark ? 'bg-white' : 'bg-[#000000]/55'
              }`}
              style={{ width: '256px', height: '294px' }}
            >
              <span className="text-gray-400 text-sm">Image</span>
            </div>

            {/* Right Side - Question and Answers */}
            <div className="flex-1">
              {/* Question Text */}
              <p className={`text-sm text-base lg:mb-3 mb-2 leading-relaxed ${
                isDark ? 'text-gray-200' : 'text-gray-900'
              }`}>{question.text}</p>

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
                      className={`w-full lg:p-3 p-2 text-left rounded-xl transition-all duration-200 flex items-center lg:gap-3 gap-2 ${
                        isCorrectAnswer
                          ? 'text-green-500'
                          : isWrongAnswer
                          ? 'bg-red-500/20 border border-red-500/50 text-red-400'
                          : isSelected
                          ? isDark ? 'text-white' : 'text-gray-900'
                          : isDark
                            ? 'text-gray-200 hover:bg-[#000000]/30 hover:border-[#39BEAE]/50'
                            : 'text-gray-700 hover:bg-gray-100 hover:border-[#39BEAE]/50'
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
                            ? isDark ? 'border-gray-300' : 'border-gray-600'
                            : isDark ? 'border-gray-500' : 'border-gray-400'
                        }`}
                      >
                        {(isSelected || isWrongAnswer) && (
                          <div className={`w-2 h-2 rounded-full transition-all duration-200 ${
                            isDark ? 'bg-white' : 'bg-gray-800'
                          }`} />
                        )}
                      </div>
                      <span>{option}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Feedback Message - Inside scrollable area */}
          {answerFeedback && (
            <div className={`p-1 rounded-xl mb-1 mx-1 ${
              answerFeedback.correct
                ? 'bg-green-500/20 border border-green-500/40 text-green-400'
                : 'bg-red-500/20 border border-red-500/40 text-red-400'
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-sm">{answerFeedback.message}</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className={`flex-shrink-0 flex items-center justify-center gap-1 px-5 pb-3 border-t py-2 ${
          isDark ? 'border-gray-400' : 'border-gray-900'
        }`}>
          {!answerFeedback?.correct ? (
            <button
              onClick={handleAnswerSubmit}
              disabled={selectedAnswer === null}
              className={`py-2 px-4 rounded-full font-medium transition-all duration-200 ${
                selectedAnswer !== null
                  ? 'bg-[#44CF8A] text-white hover:bg-[#2ea89a] cursor-pointer shadow-lg shadow-[#39BEAE]/20'
                  : isDark
                    ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Submit Answer
            </button>
          ) : (
            <button
              onClick={handleClose}
              className="py-1 px-4 rounded-full font-medium bg-[#39BEAE] text-white hover:bg-[#2ea89a] transition-all duration-200 shadow-lg shadow-[#39BEAE]/20"
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
