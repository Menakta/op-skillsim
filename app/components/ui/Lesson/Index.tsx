"use client";

import React from "react";
import Image from "next/image";
import { useTheme } from "@/app/context/ThemeContext";

const Lesson = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <>
      <div
        className="relative w-full h-[100vh] bg-cover bg-center bg-no-repeat "
        style={{ backgroundImage: "url('/images/Commode.png')" }}
      >
        <div className="flex flex-col items-center justify-center mx-auto w-full h-full">
          {/* Theme Toggle Button */}

          <div className="grid overflow-hidden">
            <h1
              className={`text-2xl text-center text-[35px] text-white`}
            >
LESSON 1           </h1>
          </div>
          <div className="flex flex-col mt-10 items-center justify-center max-w-[950px] w-full px-5">
            <hr
              className={`w-full mb-10 h-1 bg-white`}
            />
           <h1 className="text-2xl text-center text-[50px] font-bold text-white">Basic plumbing</h1>
           
            <hr
              className={`w-full mt-10 h-1 bg-white`}
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

export default Lesson;
