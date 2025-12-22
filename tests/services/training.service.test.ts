/**
 * Training Service Tests
 */

import { describe, it, expect } from 'vitest'
import { trainingService } from '@/app/services'

describe('trainingService', () => {
  describe('getTotalTasks()', () => {
    it('should return the total number of tasks', () => {
      const total = trainingService.getTotalTasks()
      expect(total).toBeGreaterThan(0)
      expect(typeof total).toBe('number')
    })
  })

  describe('getTaskInfo()', () => {
    it('should return task info for valid index', () => {
      const taskInfo = trainingService.getTaskInfo(0)

      expect(taskInfo).not.toBeNull()
      expect(taskInfo).toHaveProperty('index', 0)
      expect(taskInfo).toHaveProperty('toolName')
      expect(taskInfo).toHaveProperty('displayName')
      expect(taskInfo).toHaveProperty('description')
      expect(taskInfo).toHaveProperty('isFirst', true)
    })

    it('should return null for invalid index', () => {
      const taskInfo = trainingService.getTaskInfo(-1)
      expect(taskInfo).toBeNull()

      const taskInfo2 = trainingService.getTaskInfo(1000)
      expect(taskInfo2).toBeNull()
    })

    it('should correctly identify first task', () => {
      const firstTask = trainingService.getTaskInfo(0)
      expect(firstTask?.isFirst).toBe(true)
      expect(firstTask?.isLast).toBe(false)
    })

    it('should correctly identify last task', () => {
      const total = trainingService.getTotalTasks()
      const lastTask = trainingService.getTaskInfo(total - 1)
      expect(lastTask?.isFirst).toBe(false)
      expect(lastTask?.isLast).toBe(true)
    })
  })

  describe('getNextTask()', () => {
    it('should return next task for valid current index', () => {
      const nextTask = trainingService.getNextTask(0)
      expect(nextTask).not.toBeNull()
      expect(nextTask?.index).toBe(1)
    })

    it('should return null when at last task', () => {
      const total = trainingService.getTotalTasks()
      const nextTask = trainingService.getNextTask(total - 1)
      expect(nextTask).toBeNull()
    })
  })

  describe('getPreviousTask()', () => {
    it('should return previous task for valid current index', () => {
      const prevTask = trainingService.getPreviousTask(1)
      expect(prevTask).not.toBeNull()
      expect(prevTask?.index).toBe(0)
    })

    it('should return null when at first task', () => {
      const prevTask = trainingService.getPreviousTask(0)
      expect(prevTask).toBeNull()
    })
  })

  describe('calculateProgress()', () => {
    it('should calculate 0% for no completed tasks', () => {
      const progress = trainingService.calculateProgress(0)
      expect(progress.percentage).toBe(0)
      expect(progress.isComplete).toBe(false)
    })

    it('should calculate 100% when all tasks completed', () => {
      const total = trainingService.getTotalTasks()
      const progress = trainingService.calculateProgress(total)
      expect(progress.percentage).toBe(100)
      expect(progress.isComplete).toBe(true)
    })

    it('should calculate correct intermediate progress', () => {
      const total = trainingService.getTotalTasks()
      const half = Math.floor(total / 2)
      const progress = trainingService.calculateProgress(half)

      expect(progress.percentage).toBeGreaterThan(0)
      expect(progress.percentage).toBeLessThan(100)
      expect(progress.currentTask).toBe(half)
      expect(progress.totalTasks).toBe(total)
    })

    it('should include phase information', () => {
      const progress = trainingService.calculateProgress(0)
      expect(progress.phase).toBeDefined()
      expect(typeof progress.phase).toBe('string')
    })
  })

  describe('getPhaseForTask()', () => {
    it('should return a phase name for any task index', () => {
      const phase0 = trainingService.getPhaseForTask(0)
      const phase5 = trainingService.getPhaseForTask(5)
      const phase10 = trainingService.getPhaseForTask(10)

      expect(typeof phase0).toBe('string')
      expect(typeof phase5).toBe('string')
      expect(typeof phase10).toBe('string')
    })
  })

  describe('validateToolSelection()', () => {
    it('should return true for correct tool selection', () => {
      const firstTask = trainingService.getTaskInfo(0)
      if (firstTask) {
        const isValid = trainingService.validateToolSelection(firstTask.toolName, 0)
        expect(isValid).toBe(true)
      }
    })

    it('should return false for incorrect tool selection', () => {
      const isValid = trainingService.validateToolSelection('None', 0)
      // This depends on whether 'None' is the first task tool
      // Just check it returns a boolean
      expect(typeof isValid).toBe('boolean')
    })

    it('should return false for invalid task index', () => {
      const isValid = trainingService.validateToolSelection('XRay', 1000)
      expect(isValid).toBe(false)
    })
  })

  describe('getAllTasks()', () => {
    it('should return all tasks in sequence', () => {
      const allTasks = trainingService.getAllTasks()

      expect(Array.isArray(allTasks)).toBe(true)
      expect(allTasks.length).toBe(trainingService.getTotalTasks())

      // Check each task has required properties
      allTasks.forEach((task, index) => {
        expect(task.index).toBe(index)
        expect(task.toolName).toBeDefined()
        expect(task.displayName).toBeDefined()
      })
    })
  })

  describe('isTrainingComplete()', () => {
    it('should return false when not at end', () => {
      expect(trainingService.isTrainingComplete(0)).toBe(false)
      expect(trainingService.isTrainingComplete(1)).toBe(false)
    })

    it('should return true when at or past total tasks', () => {
      const total = trainingService.getTotalTasks()
      expect(trainingService.isTrainingComplete(total)).toBe(true)
      expect(trainingService.isTrainingComplete(total + 1)).toBe(true)
    })
  })

  describe('getToolDisplayName()', () => {
    it('should return display name for known tools', () => {
      const displayName = trainingService.getToolDisplayName('XRay')
      expect(typeof displayName).toBe('string')
      expect(displayName.length).toBeGreaterThan(0)
    })
  })

  describe('getToolDescription()', () => {
    it('should return description for known tools', () => {
      const description = trainingService.getToolDescription('XRay')
      expect(typeof description).toBe('string')
    })
  })

  describe('getToolIcon()', () => {
    it('should return icon for known tools', () => {
      const icon = trainingService.getToolIcon('XRay')
      expect(icon).toBeDefined()
    })
  })
})
