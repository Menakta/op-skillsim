/**
 * Task Configuration
 *
 * Centralized configuration for training tasks, tools, and pipes.
 */

import type { ToolName, PipeType } from '@/app/lib/messageTypes'

// =============================================================================
// Task Definitions
// =============================================================================

export interface TaskDefinition {
  tool: ToolName
  name: string
  taskId: string
  description: string
  icon: string
}

export const TASK_SEQUENCE: TaskDefinition[] = [
  {
    tool: 'XRay',
    name: 'Pipe Location Scanning',
    taskId: 'XRAY_MAIN',
    description: 'Use the X-Ray scanner to locate existing pipes',
    icon: '/icons/view.png'
  },
  {
    tool: 'Shovel',
    name: 'Excavation',
    taskId: 'SHOVEL_MAIN',
    description: 'Excavate the trench for pipe installation',
    icon: '/icons/Dig.png'
  },
  {
    tool: 'Measuring',
    name: 'Pipe Measuring',
    taskId: 'MEASURING_MAIN',
    description: 'Measure the pipe dimensions accurately',
    icon: '/icons/measure_tape.png'
  },
  {
    tool: 'PipeConnection',
    name: 'Pipe Connection',
    taskId: 'PIPE_CONNECTION_MAIN',
    description: 'Connect the pipes correctly',
    icon: '/icons/pipe.png'
  },
  {
    tool: 'Glue',
    name: 'Glue Application',
    taskId: 'GLUE_MAIN',
    description: 'Apply glue to secure the connections',
    icon: '/icons/glue-gun.png'
  },
  {
    tool: 'PressureTester',
    name: 'Pressure Testing',
    taskId: 'PRESSURE_TEST_MAIN',
    description: 'Test the system pressure for leaks',
    icon: '/icons/hand.png'
  }
]

// =============================================================================
// Tool Information
// =============================================================================

export interface ToolInfo {
  icon: string
  name: string
  description: string
  shortName: string
}

export const TOOL_INFO: Record<ToolName, ToolInfo> = {
  'None': {
    icon: 'N',
    name: 'None',
    description: 'No tool selected',
    shortName: 'None'
  },
  'XRay': {
    icon: '/icons/view.png',
    name: 'XRay Scanner',
    description: 'X-Ray scanning tool for locating pipes',
    shortName: 'X-Ray'
  },
  'Shovel': {
    icon: '/icons/Dig.png',
    name: 'Excavation Shovel',
    description: 'Digging tool for excavation',
    shortName: 'Shovel'
  },
  'Measuring': {
    icon: '/icons/measure_tape.png',
    name: 'Measuring Tape',
    description: 'Measuring tape for precision',
    shortName: 'Measure'
  },
  'PipeConnection': {
    icon: '/icons/pipe.png',
    name: 'Pipe Connection',
    description: 'Pipe connection tool',
    shortName: 'Connect'
  },
  'Glue': {
    icon: '/icons/glue-gun.png',
    name: 'Glue Applicator',
    description: 'Glue application tool',
    shortName: 'Glue'
  },
  'PressureTester': {
    icon: '/icons/hand.png',
    name: 'Pressure Tester',
    description: 'Pressure testing tool',
    shortName: 'Test'
  }
}

// =============================================================================
// Pipe Types
// =============================================================================

export interface PipeInfo {
  name: string
  displayName: string
  description: string
}

export const PIPE_TYPES: Record<PipeType, PipeInfo> = {
  'y-junction': {
    name: 'y-junction',
    displayName: 'Y-Junction',
    description: 'Y-shaped junction for branching pipes'
  },
  'elbow': {
    name: 'elbow',
    displayName: 'Elbow',
    description: '90-degree elbow connector'
  },
  '100mm': {
    name: '100mm',
    displayName: '100mm Pipe',
    description: '100mm diameter straight pipe'
  },
  '150mm': {
    name: '150mm',
    displayName: '150mm Pipe',
    description: '150mm diameter straight pipe'
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

export function getTaskByIndex(index: number): TaskDefinition | undefined {
  return TASK_SEQUENCE[index]
}

export function getTaskByTool(tool: ToolName): TaskDefinition | undefined {
  return TASK_SEQUENCE.find(task => task.tool === tool)
}

export function getTaskById(taskId: string): TaskDefinition | undefined {
  return TASK_SEQUENCE.find(task => task.taskId === taskId)
}

export function getNextTask(currentIndex: number): TaskDefinition | undefined {
  return TASK_SEQUENCE[currentIndex + 1]
}

export function isLastTask(currentIndex: number): boolean {
  return currentIndex >= TASK_SEQUENCE.length - 1
}

export function getToolInfo(tool: ToolName): ToolInfo {
  return TOOL_INFO[tool]
}

export function getPipeInfo(pipe: PipeType): PipeInfo {
  return PIPE_TYPES[pipe]
}
