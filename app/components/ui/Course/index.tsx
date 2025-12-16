"use client";

import React from "react";
import Image from "next/image";
import { useTheme } from "@/app/context/ThemeContext";

const Course = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <>
      <div
        className={`relative w-full h-[100vh] ${isDark ? "bg-gray-900" : "bg-white"}`}
      >
        <div className="flex flex-col items-center justify-center">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${
              isDark
                ? "bg-gray-700 hover:bg-gray-600"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
            aria-label="Toggle theme"
          >
            {isDark ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-yellow-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-gray-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            )}
          </button>

          <div className="grid overflow-hidden pt-30">
            <h1
              className={`text-2xl font-semibold text-center mt-5 text-[40px] ${
                isDark ? "text-white" : "text-black"
              }`}
            >
              Courses
            </h1>
          </div>
          <div className="flex flex-col mt-20 items-center justify-center max-w-[950px] w-full px-5">
            <hr
              className={`w-full mb-10 ${
                isDark ? "border-gray-600" : "bg-black"
              }`}
            />
            <p className={`text-md text-center mt-5 text-[20px] ${isDark ? "text-white" : "text-black"}`}>Keep in mind that the full app is still in development.</p>
            <a
              className={`bg-[#39BEAE] mt-15 text-white py-1 px-8 rounded-full text-md text-center mb-5 hover:text-gray-700 transition-colors ${
                isDark ? "text-white" : "text-black"
              }`}
              href="/courses"
            >
              Continue
            </a>
           
            <hr
              className={`w-full mt-18 ${
                isDark ? "border-gray-600" : "bg-black"
              }`}
            />
          </div>
           <div className="absolute bottom-10 right-10">
          <Image
            src={isDark ? '/logos/Main_Logo.png' : '/logos/Dark_logo.png'}
            width={180}
            height={70}
            alt="OP-Skillsim Logo"
          />
        </div>
        </div>
      </div>
    </>
  );
};

export default Course;
