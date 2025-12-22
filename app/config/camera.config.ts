/**
 * Camera Configuration
 *
 * Centralized configuration for camera perspectives and controls.
 */

// =============================================================================
// Camera Types
// =============================================================================

export type CameraPerspective =
  | 'Front' | 'Back' | 'Left' | 'Right' | 'Top' | 'Bottom'
  | 'IsometricNE' | 'IsometricSE' | 'IsometricSW'

export type CameraMode = 'Manual' | 'Orbit'

// =============================================================================
// Perspective Groups
// =============================================================================

export interface PerspectiveInfo {
  name: string
  displayName: string
  icon: string
  group: 'orthogonal' | 'isometric'
}

export const CAMERA_PERSPECTIVES: Record<CameraPerspective, PerspectiveInfo> = {
  'Front': {
    name: 'Front',
    displayName: 'Front View',
    icon: '⬆️',
    group: 'orthogonal'
  },
  'Back': {
    name: 'Back',
    displayName: 'Back View',
    icon: '⬇️',
    group: 'orthogonal'
  },
  'Left': {
    name: 'Left',
    displayName: 'Left View',
    icon: '⬅️',
    group: 'orthogonal'
  },
  'Right': {
    name: 'Right',
    displayName: 'Right View',
    icon: '➡️',
    group: 'orthogonal'
  },
  'Top': {
    name: 'Top',
    displayName: 'Top View',
    icon: '🔼',
    group: 'orthogonal'
  },
  'Bottom': {
    name: 'Bottom',
    displayName: 'Bottom View',
    icon: '🔽',
    group: 'orthogonal'
  },
  'IsometricNE': {
    name: 'IsometricNE',
    displayName: 'Isometric NE',
    icon: '↗️',
    group: 'isometric'
  },
  'IsometricSE': {
    name: 'IsometricSE',
    displayName: 'Isometric SE',
    icon: '↘️',
    group: 'isometric'
  },
  'IsometricSW': {
    name: 'IsometricSW',
    displayName: 'Isometric SW',
    icon: '↙️',
    group: 'isometric'
  }
}

// =============================================================================
// Perspective Lists
// =============================================================================

export const ORTHOGONAL_PERSPECTIVES: CameraPerspective[] = [
  'Front', 'Back', 'Left', 'Right', 'Top', 'Bottom'
]

export const ISOMETRIC_PERSPECTIVES: CameraPerspective[] = [
  'IsometricNE', 'IsometricSE', 'IsometricSW'
]

export const ALL_PERSPECTIVES: CameraPerspective[] = [
  ...ORTHOGONAL_PERSPECTIVES,
  ...ISOMETRIC_PERSPECTIVES
]

// =============================================================================
// Default Values
// =============================================================================

export const DEFAULT_CAMERA_CONFIG = {
  perspective: 'IsometricNE' as CameraPerspective,
  mode: 'Manual' as CameraMode,
  distance: 1500,
  orbitSpeed: 1.0,
}

// =============================================================================
// Helper Functions
// =============================================================================

export function getPerspectiveInfo(perspective: CameraPerspective): PerspectiveInfo {
  return CAMERA_PERSPECTIVES[perspective]
}

export function isOrthogonal(perspective: CameraPerspective): boolean {
  return ORTHOGONAL_PERSPECTIVES.includes(perspective)
}

export function isIsometric(perspective: CameraPerspective): boolean {
  return ISOMETRIC_PERSPECTIVES.includes(perspective)
}
