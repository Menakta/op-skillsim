import React from 'react'

interface ToolTipProps {
  title: string
  description: string
  currentStep: number
  totalSteps: number
  onNext: () => void
  onPrevious: () => void
  onSkip: () => void
  isLastStep: boolean
  isFirstStep: boolean
}

const Tool_Tip = ({
  title,
  description,
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
  isLastStep,
  isFirstStep
}: ToolTipProps) => {
  return (
    <div className="bg-gray-100/80 rounded-xl shadow-xl p-6 max-w-[400px] w-[calc(100%-2rem)] md:w-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-[24px] font-bold text-black mt-2 mb-3">{title}</h3>

        <span className="text-sm text-gray-700 font-bold">
          {currentStep}/{totalSteps}
        </span>
      </div>

      <p className="text-gray-600 mb-6">{description}</p>

      <div className="flex justify-between items-center">
        <button
          onClick={onSkip}
          className="text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
        >
          Skip
        </button>
        <div className="flex gap-3">
          {!isFirstStep && (
            <button
              onClick={onPrevious}
              className="text-blue-700 font-bold  py-2 rounded-full hover:text-blue-800 transition-colors cursor-pointer"
            >
              {'< Previous'}
            </button>
          )}
          <button
            onClick={onNext}
            className="text-blue-700 font-bold py-2 rounded-full hover:text-blue-800 transition-colors cursor-pointer"
          >
            {isLastStep ? 'Finish' : 'Next >'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Tool_Tip