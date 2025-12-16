"use client";

import React from "react";
import Image from "next/image";
import { useTheme } from "@/app/context/ThemeContext";

const Menu = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <>
      <div
        className={`w-full h-[100vh] ${isDark ? "bg-gray-900" : "bg-white"}`}
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

          <div className="grid overflow-hidden pt-50">
            <div className="w-[130px] rounded-full h-[130px] bg-[#39BEAE] mx-auto"></div>
            <h1
              className={`text-2xl font-semibold text-center mt-5 text-[40px] ${
                isDark ? "text-white" : "text-black"
              }`}
            >
              OP Skillsim
            </h1>
          </div>
          <div className="flex flex-col mt-30 items-center justify-center w-[150px]">
            <hr
              className={`w-full ${isDark ? "border-gray-600" : "bg-black"}`}
            />
            <a
              className={`text-md text-center mt-5 text-[20px] mb-5 hover:text-[#39BEAE] transition-colors ${
                isDark ? "text-white" : "text-black"
              }`}
              href="/courses"
            >
              Courses
            </a>
            <hr
              className={`w-full ${isDark ? "border-gray-600" : "bg-black"}`}
            />
            <a
              className={`text-md text-center mt-5 text-[20px] mb-5 hover:text-[#39BEAE] transition-colors ${
                isDark ? "text-white" : "text-black"
              }`}
              href="/courses"
            >
              All Lessons
            </a>
            <hr
              className={`w-full ${isDark ? "border-gray-600" : "bg-black"}`}
            />
            <a
              className={`text-md text-center mt-5 text-[20px] mb-5 hover:text-[#39BEAE] transition-colors ${
                isDark ? "text-white" : "text-black"
              }`}
              href="/courses"
            >
              Settings
            </a>
            <a
              className={`text-md text-center mt-5 text-[20px] mb-5 hover:text-[#39BEAE] transition-colors ${
                isDark ? "text-white" : "text-black"
              }`}
              href="/courses"
            >
              Credits
            </a>
            <a
              className={`text-md text-center mt-5 text-[20px] mb-5 hover:text-[#39BEAE] transition-colors ${
                isDark ? "text-white" : "text-black"
              }`}
              href="/courses"
            >
              Log Out
            </a>
          </div>
        </div>

        {/* Logo - Bottom Right */}
        <div className="absolute bottom-10 right-10">
          <Image
            src={isDark ? "/logos/Main_Logo.png" : "/logos/Dark_logo.png"}
            width={180}
            height={70}
            alt="OP-Skillsim Logo"
          />
        </div>
      </div>
    </>
  );
};

export default Menu;
