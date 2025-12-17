'use client'

import React, { useState } from 'react'
import { useTheme } from '@/app/context/ThemeContext'
import Tool_Tip from './components/Tool_Tip'

// Training-specific walkthrough steps
const walkthroughSteps = [
  {
    title: 'Welcome to OP Skillsim',
    description: 'This interactive training simulation will guide you through basic plumbing tasks. Follow the steps to learn and practice essential skills.'
  },
  {
    title: 'Control Panel',
    description: 'Use the control panel on the right side to manage your training. Switch between tabs: Training, Tools, Camera, Layers, and Cinematic modes.'
  },
  {
    title: 'Tool Selection',
    description: 'During training, select the correct tool when prompted. The required tool will be highlighted in pink. Follow the sequence: X-Ray, Shovel, Measuring, Pipe Connection, Glue, and Pressure Tester.'
  },
  {
    title: 'Answer Questions',
    description: 'After completing each task, a question will appear. Answer correctly to progress. You have multiple attempts if needed.'
  },
  {
    title: 'Camera Controls',
    description: 'Use the Camera tab to change your view perspective. You can orbit around the scene or select preset camera angles for better visibility.'
  },
  {
    title: 'Ready to Start!',
    description: 'Click "Start Training" in the Training tab to begin. Good luck with your plumbing simulation training!'
  }
]

interface TrainingWalkthroughProps {
  onComplete: () => void
  onSkip: () => void
}

export function TrainingWalkthrough({ onComplete, onSkip }: TrainingWalkthroughProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [currentStep, setCurrentStep] = useState(0)

  const handleNext = () => {
    if (currentStep < walkthroughSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[2147483646] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
    >
      {/* Background gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: isDark
            ? 'radial-gradient(circle at center, rgba(57, 190, 174, 0.1) 0%, transparent 70%)'
            : 'radial-gradient(circle at center, rgba(57, 190, 174, 0.15) 0%, transparent 70%)'
        }}
      />

      {/* Walkthrough Card */}
      <div
        className={`relative max-w-md w-[calc(100%-2rem)] rounded-xl shadow-2xl p-6 ${
          isDark ? 'bg-gray-800/95' : 'bg-white/95'
        }`}
      >
        {/* Step indicator */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-1">
            {walkthroughSteps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep
                    ? 'bg-[#39BEAE]'
                    : index < currentStep
                      ? 'bg-[#39BEAE]/50'
                      : isDark ? 'bg-gray-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {currentStep + 1}/{walkthroughSteps.length}
          </span>
        </div>

        {/* Title */}
        <h2 className={`text-2xl font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {walkthroughSteps[currentStep].title}
        </h2>

        {/* Description */}
        <p className={`mb-6 leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          {walkthroughSteps[currentStep].description}
        </p>

        {/* Action buttons */}
        <div className="flex justify-between items-center">
          <button
            onClick={onSkip}
            className={`text-sm transition-colors ${
              isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Skip Tutorial
          </button>

          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className="px-4 py-2 text-[#39BEAE] font-medium hover:text-[#2ea89a] transition-colors"
              >
                Previous
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-[#39BEAE] hover:bg-[#2ea89a] text-white font-medium rounded-lg transition-colors"
            >
              {currentStep === walkthroughSteps.length - 1 ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TrainingWalkthrough
