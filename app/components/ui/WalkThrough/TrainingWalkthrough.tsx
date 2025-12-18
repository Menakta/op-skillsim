"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
// Training-specific walkthrough steps
const walkthroughSteps = [
  {
    title: "Welcome to OP Skillsim",
    description:
      "This interactive training simulation will guide you through basic plumbing tasks. Follow the steps to learn and practice essential skills.",
  },
  {
    title: "Control Panel",
    description:
      "Use the control panel on the right side to manage your training. Switch between tabs: Training, Tools, Camera, Layers, and Cinematic modes.",
  },
  {
    title: "Tool Selection",
    description:
      "During training, select the correct tool when prompted. The required tool will be highlighted in pink. Follow the sequence: X-Ray, Shovel, Measuring, Pipe Connection, Glue, and Pressure Tester.",
  },
  {
    title: "Answer Questions",
    description:
      "After completing each task, a question will appear. Answer correctly to progress. You have multiple attempts if needed.",
  },
  {
    title: "Camera Controls",
    description:
      "Use the Camera tab to change your view perspective. You can orbit around the scene or select preset camera angles for better visibility.",
  },
  {
    title: "Ready to Start!",
    description:
      'Click "Start Training" in the Training tab to begin. Good luck with your plumbing simulation training!',
  },
];

interface TrainingWalkthroughProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function TrainingWalkthrough({
  onComplete,
  onSkip,
}: TrainingWalkthroughProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < walkthroughSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === walkthroughSteps.length - 1;

  return (
    <div
      className="fixed inset-0 z-[2147483646] flex items-center justify-center bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/images/Commode.png')" }}
    >
      {/* Dark overlay for better readability */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Walkthrough Card - Tool_Tip style */}
      <div className="relative bg-gray-100/70 rounded-xl shadow-xl p-6 max-w-[400px] w-[calc(100%-2rem)] md:w-full">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-[24px] font-bold text-black mt-2 mb-3">
            {walkthroughSteps[currentStep].title}
          </h3>
          <span className="text-sm text-gray-700 ">
            {currentStep + 1}/{walkthroughSteps.length}
          </span>
        </div>

        <p className="text-gray-800 mb-6">
          {walkthroughSteps[currentStep].description}
        </p>

        <div className="flex justify-between items-center">
          <button
            onClick={onSkip}
            className="text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
          >
            Skip
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleNext}
              className="text-blue-700 py-2 hover:text-blue-800 transition-colors cursor-pointer flex items-center"
            >
              {isLastStep ? (
                "Finish"
              ) : (
                <>
                  Next<ChevronRight size={20}/>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TrainingWalkthrough;
