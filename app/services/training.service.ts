/**
 * Training Service
 *
 * Handles training-related business logic, progress calculation,
 * and task management utilities.
 */

import { TASK_SEQUENCE, TOOL_INFO, getTaskByIndex } from '@/app/config'
import type { TaskDefinition, ToolInfo } from '@/app/config'
import type { ToolName } from '@/app/lib/messageTypes'

// =============================================================================
// Types
// =============================================================================

export interface TaskInfo {
  index: number
  toolName: ToolName
  displayName: string
  description: string
  isLast: boolean
  isFirst: boolean
}

export interface ProgressInfo {
  percentage: number
  currentTask: number
  totalTasks: number
  phase: string
  isComplete: boolean
}

// =============================================================================
// Training Service
// =============================================================================

export const trainingService = {
  /**
   * Get total number of tasks
   */
  getTotalTasks(): number {
    return TASK_SEQUENCE.length
  },

  /**
   * Get task info by index
   */
  getTaskInfo(index: number): TaskInfo | null {
    const task = getTaskByIndex(index)
    if (!task) {
      return null
    }

    const toolInfo = TOOL_INFO[task.tool]

    return {
      index,
      toolName: task.tool,
      displayName: task.name,
      description: task.description,
      isLast: index === TASK_SEQUENCE.length - 1,
      isFirst: index === 0,
    }
  },

  /**
   * Get next task info
   */
  getNextTask(currentIndex: number): TaskInfo | null {
    return this.getTaskInfo(currentIndex + 1)
  },

  /**
   * Get previous task info
   */
  getPreviousTask(currentIndex: number): TaskInfo | null {
    return this.getTaskInfo(currentIndex - 1)
  },

  /**
   * Calculate progress percentage
   */
  calculateProgress(completedTasks: number): ProgressInfo {
    const total = TASK_SEQUENCE.length
    const percentage = total > 0 ? Math.round((completedTasks / total) * 100) : 0

    return {
      percentage,
      currentTask: completedTasks,
      totalTasks: total,
      phase: this.getPhaseForTask(completedTasks),
      isComplete: completedTasks >= total,
    }
  },

  /**
   * Get phase name for task index
   */
  getPhaseForTask(taskIndex: number): string {
    // Define phase boundaries based on your task sequence
    if (taskIndex <= 2) return 'Initial Setup'
    if (taskIndex <= 5) return 'Pipe Selection'
    if (taskIndex <= 8) return 'Fitting Installation'
    if (taskIndex <= 11) return 'Testing'
    return 'Completion'
  },

  /**
   * Validate tool selection for current task
   */
  validateToolSelection(selectedTool: ToolName, currentTaskIndex: number): boolean {
    const task = getTaskByIndex(currentTaskIndex)
    if (!task) return false
    return selectedTool === task.tool
  },

  /**
   * Get all tasks in sequence
   */
  getAllTasks(): TaskInfo[] {
    return TASK_SEQUENCE.map((_, index) => this.getTaskInfo(index)!).filter(Boolean)
  },

  /**
   * Check if training is complete
   */
  isTrainingComplete(currentTaskIndex: number): boolean {
    return currentTaskIndex >= TASK_SEQUENCE.length
  },

  /**
   * Get tool display name
   */
  getToolDisplayName(toolName: ToolName): string {
    return TOOL_INFO[toolName]?.name || toolName
  },

  /**
   * Get tool description
   */
  getToolDescription(toolName: ToolName): string {
    return TOOL_INFO[toolName]?.description || ''
  },

  /**
   * Get tool icon path
   */
  getToolIcon(toolName: ToolName): string | undefined {
    return TOOL_INFO[toolName]?.icon
  },
}

export default trainingService
