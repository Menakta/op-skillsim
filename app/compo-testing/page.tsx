import React from 'react'
import Menu from '../components/ui/Main_Menu/page'
import Courses from '../components/ui/courses'
import Course from '../components/ui/Course'
import Lesson from '../components/ui/Lesson/Index'
import WalkThrough from '../components/ui/WalkThrough'
const page = () => {
  return (
    <div>
      <Menu />
      <Courses/>
      <Course/>
      <Lesson/>
      <WalkThrough/>
    </div>
  )
}

export default page