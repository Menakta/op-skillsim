/**
 * Stream Quality Configuration
 *
 * Defines stream quality presets for PureWeb VideoStream component.
 * Uses the Resolution prop to control maximum stream resolution.
 */

// =============================================================================
// Types
// =============================================================================

export type StreamQualityPreset = 'auto' | 'low' | 'medium' | 'high' | 'ultra' | '4k'

export interface StreamQualityOption {
  key: StreamQualityPreset
  label: string
  description: string
  resolution: { maxWidth: number; maxHeight: number }
}

// =============================================================================
// Quality Presets
// =============================================================================

export const STREAM_QUALITY_OPTIONS: StreamQualityOption[] = [
  {
    key: 'auto',
    label: 'Auto',
    description: 'Best quality for your connection',
    resolution: { maxWidth: 1920, maxHeight: 1080 }
  },
  {
    key: 'low',
    label: '480p',
    description: 'Lower quality, saves bandwidth',
    resolution: { maxWidth: 854, maxHeight: 480 }
  },
  {
    key: 'medium',
    label: '720p',
    description: 'Standard HD quality',
    resolution: { maxWidth: 1280, maxHeight: 720 }
  },
  {
    key: 'high',
    label: '1080p',
    description: 'Full HD quality',
    resolution: { maxWidth: 1920, maxHeight: 1080 }
  },
  {
    key: 'ultra',
    label: '1440p',
    description: 'Quad HD quality',
    resolution: { maxWidth: 2560, maxHeight: 1440 }
  },
  {
    key: '4k',
    label: '4K',
    description: 'Ultra HD 4K quality',
    resolution: { maxWidth: 3840, maxHeight: 2160 }
  }
]

// =============================================================================
// Helper Functions
// =============================================================================

export function getStreamQualityOption(preset: StreamQualityPreset): StreamQualityOption {
  return STREAM_QUALITY_OPTIONS.find(o => o.key === preset) || STREAM_QUALITY_OPTIONS[3] // default to 'high'
}

export function getDefaultStreamQuality(): StreamQualityPreset {
  return 'high'
}

// =============================================================================
// LocalStorage
// =============================================================================

const STORAGE_KEY = 'op-skillsim-stream-quality'

export function loadStreamQuality(): StreamQualityPreset {
  if (typeof window === 'undefined') return getDefaultStreamQuality()
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && STREAM_QUALITY_OPTIONS.some(o => o.key === saved)) {
      return saved as StreamQualityPreset
    }
  } catch {
    // localStorage not available
  }
  return getDefaultStreamQuality()
}

export function saveStreamQuality(preset: StreamQualityPreset): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, preset)
  } catch {
    // localStorage not available
  }
}
