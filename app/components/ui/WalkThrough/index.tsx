"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useTheme } from "@/app/context/ThemeContext";
import Tool_Tip from "./components/Tool_Tip";

const walkthroughData = [
  {
    title: "Welcome to the Simulation",
    description: "This walkthrough will guide you through the basic plumbing simulation. You'll learn how to identify and interact with different components."
  },
  {
    title: "Identify the Components",
    description: "Look around the environment to find the plumbing fixtures. Each component is highlighted when you hover over it."
  },
  {
    title: "Use the Tools",
    description: "Select the appropriate tool from the toolbar on the left. Different tasks require different tools - make sure to choose wisely!"
  },
  {
    title: "Complete the Task",
    description: "Follow the on-screen instructions to complete each repair task. Your progress will be saved automatically."
  }
];

const WalkThrough = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const handleNext = () => {
    if (currentStep < walkthroughData.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsComplete(true);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    setIsComplete(true);
  };

  return (
    <>
      <div
        className="relative w-full h-[100vh] bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/Commode.png')" }}
      >
        {/* Overlay for better tooltip visibility */}
        {!isComplete && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center ">
            <Tool_Tip
              title={walkthroughData[currentStep].title}
              description={walkthroughData[currentStep].description}
              currentStep={currentStep + 1}
              totalSteps={walkthroughData.length}
              onNext={handleNext}
              onPrevious={handlePrevious}
              onSkip={handleSkip}
              isLastStep={currentStep === walkthroughData.length - 1}
              isFirstStep={currentStep === 0}
            />
          </div>
        )}

        {/* Logo - Bottom Right */}
        <div className="absolute bottom-10 right-10">
          <Image
            src={isDark ? '/logos/Main_Logo.png' : '/logos/Dark_logo.png'}
            width={180}
            height={70}
            alt="OP-Skillsim Logo"
          />
        </div>
      </div>
    </>
  );
};

export default WalkThrough;
