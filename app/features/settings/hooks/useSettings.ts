'use client'

import { useCallback, useState, useRef } from 'react'
import type { ParsedMessage } from '@/app/lib/messageTypes'
import {
  GraphicsQuality,
  AudioGroup,
  BandwidthOption,
  ResolutionPreset,
  RESOLUTION_MAP,
  FpsUpdateData,
  SettingAppliedData,
  createResolutionMessage,
  createGraphicsQualityMessage,
  createAudioVolumeMessage,
  createBandwidthMessage,
  createStartFpsTrackingMessage,
  createStopFpsTrackingMessage,
  createGetSettingsOptionsMessage
} from '@/app/lib/messageTypes'

// =============================================================================
// Types
// =============================================================================

export interface SettingsState {
  // Audio
  audioEnabled: boolean
  masterVolume: number
  ambientVolume: number
  sfxVolume: number

  // Graphics
  graphicsQuality: GraphicsQuality

  // Display
  resolution: ResolutionPreset

  // Network
  bandwidthOption: BandwidthOption

  // Performance
  fpsTrackingEnabled: boolean
  currentFps: number
  showFpsOverlay: boolean
}

export interface UseSettingsConfig {
  debug?: boolean
  /** Called when a setting is successfully applied */
  onSettingApplied?: (settingType: string, value: string, success: boolean) => void
  /** Called when FPS updates are received */
  onFpsUpdate?: (fps: number) => void
}

export interface UseSettingsReturn {
  // State
  settings: SettingsState

  // Audio controls
  setAudioEnabled: (enabled: boolean) => void
  setMasterVolume: (volume: number) => void
  setAmbientVolume: (volume: number) => void
  setSfxVolume: (volume: number) => void

  // Graphics controls
  setGraphicsQuality: (quality: GraphicsQuality) => void

  // Display controls
  setResolution: (preset: ResolutionPreset) => void
  setCustomResolution: (width: number, height: number) => void

  // Network controls
  setBandwidthOption: (option: BandwidthOption) => void

  // Performance controls
  startFpsTracking: () => void
  stopFpsTracking: () => void
  setShowFpsOverlay: (show: boolean) => void

  // Utilities
  requestSettingsOptions: () => void
  handleSettingsMessage: (message: ParsedMessage) => boolean
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useSettings(
  sendRawMessage: (message: string) => void,
  config: UseSettingsConfig = {}
): UseSettingsReturn {
  const { debug = false, onSettingApplied, onFpsUpdate } = config

  // Store callbacks in refs to avoid re-creating handlers
  const onSettingAppliedRef = useRef(onSettingApplied)
  const onFpsUpdateRef = useRef(onFpsUpdate)
  const debugRef = useRef(debug)
  onSettingAppliedRef.current = onSettingApplied
  onFpsUpdateRef.current = onFpsUpdate
  debugRef.current = debug

  // ==========================================================================
  // State
  // ==========================================================================

  const [settings, setSettings] = useState<SettingsState>({
    // Audio
    audioEnabled: true,
    masterVolume: 1.0,
    ambientVolume: 0.7,
    sfxVolume: 0.8,

    // Graphics
    graphicsQuality: 'High',

    // Display
    resolution: '1080p',

    // Network
    bandwidthOption: 'Auto',

    // Performance
    fpsTrackingEnabled: false,
    currentFps: 60,
    showFpsOverlay: false
  })

  // Track if we need to send audio messages (for mute/unmute)
  const previousAudioEnabledRef = useRef(settings.audioEnabled)

  // ==========================================================================
  // Send message helper
  // ==========================================================================

  const sendMessage = useCallback((message: string) => {
    console.log('📤 [Settings] Sending to UE5:', message)
    if (debug) {
      console.log('🎛️ Settings sending:', message)
    }
    sendRawMessage(message)
  }, [sendRawMessage, debug])

  // ==========================================================================
  // Audio Controls
  // ==========================================================================

  const setAudioEnabled = useCallback((enabled: boolean) => {
    setSettings(prev => ({ ...prev, audioEnabled: enabled }))

    // Send mute/unmute by setting master volume to 0 or restoring
    if (!enabled) {
      sendMessage(createAudioVolumeMessage('Master', 0))
    } else {
      // Restore previous master volume
      setSettings(prev => {
        sendMessage(createAudioVolumeMessage('Master', prev.masterVolume))
        return prev
      })
    }
  }, [sendMessage])

  const setMasterVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume))
    setSettings(prev => ({ ...prev, masterVolume: clampedVolume }))

    if (settings.audioEnabled) {
      sendMessage(createAudioVolumeMessage('Master', clampedVolume))
    }
  }, [sendMessage, settings.audioEnabled])

  const setAmbientVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume))
    setSettings(prev => ({ ...prev, ambientVolume: clampedVolume }))
    sendMessage(createAudioVolumeMessage('Ambient', clampedVolume))
  }, [sendMessage])

  const setSfxVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume))
    setSettings(prev => ({ ...prev, sfxVolume: clampedVolume }))
    sendMessage(createAudioVolumeMessage('SFX', clampedVolume))
  }, [sendMessage])

  // ==========================================================================
  // Graphics Controls
  // ==========================================================================

  const setGraphicsQuality = useCallback((quality: GraphicsQuality) => {
    setSettings(prev => ({ ...prev, graphicsQuality: quality }))
    sendMessage(createGraphicsQualityMessage(quality))
  }, [sendMessage])

  // ==========================================================================
  // Display Controls
  // ==========================================================================

  const setResolution = useCallback((preset: ResolutionPreset) => {
    setSettings(prev => ({ ...prev, resolution: preset }))
    const { width, height } = RESOLUTION_MAP[preset]
    sendMessage(createResolutionMessage(width, height))
  }, [sendMessage])

  const setCustomResolution = useCallback((width: number, height: number) => {
    sendMessage(createResolutionMessage(width, height))
  }, [sendMessage])

  // ==========================================================================
  // Network Controls
  // ==========================================================================

  const setBandwidthOption = useCallback((option: BandwidthOption) => {
    setSettings(prev => ({ ...prev, bandwidthOption: option }))
    sendMessage(createBandwidthMessage(option))
  }, [sendMessage])

  // ==========================================================================
  // Performance Controls
  // ==========================================================================

  const startFpsTracking = useCallback(() => {
    setSettings(prev => ({ ...prev, fpsTrackingEnabled: true }))
    sendMessage(createStartFpsTrackingMessage())
  }, [sendMessage])

  const stopFpsTracking = useCallback(() => {
    setSettings(prev => ({ ...prev, fpsTrackingEnabled: false }))
    sendMessage(createStopFpsTrackingMessage())
  }, [sendMessage])

  const setShowFpsOverlay = useCallback((show: boolean) => {
    setSettings(prev => ({ ...prev, showFpsOverlay: show }))

    // Auto-start/stop FPS tracking based on overlay visibility
    if (show && !settings.fpsTrackingEnabled) {
      sendMessage(createStartFpsTrackingMessage())
      setSettings(prev => ({ ...prev, fpsTrackingEnabled: true }))
    } else if (!show && settings.fpsTrackingEnabled) {
      sendMessage(createStopFpsTrackingMessage())
      setSettings(prev => ({ ...prev, fpsTrackingEnabled: false }))
    }
  }, [sendMessage, settings.fpsTrackingEnabled])

  // ==========================================================================
  // Utilities
  // ==========================================================================

  const requestSettingsOptions = useCallback(() => {
    sendMessage(createGetSettingsOptionsMessage())
  }, [sendMessage])

  // ==========================================================================
  // Message Handler
  // ==========================================================================

  const handleSettingsMessage = useCallback((message: ParsedMessage): boolean => {
    console.log('📥 [Settings] Received from UE5:', message.type, message.dataString)

    switch (message.type) {
      case 'fps_update': {
        const data = message.data as FpsUpdateData
        const fps = data.fps
        setSettings(prev => ({ ...prev, currentFps: fps }))
        onFpsUpdateRef.current?.(fps)

        console.log('📊 FPS Update:', fps.toFixed(1))
        if (debugRef.current) {
          console.log('📊 FPS Update:', fps.toFixed(1))
        }
        return true
      }

      case 'setting_applied': {
        const data = message.data as SettingAppliedData
        onSettingAppliedRef.current?.(data.settingType, data.value, data.success)

        console.log(
          data.success ? '✅' : '❌',
          `Setting ${data.settingType}:`,
          data.value,
          data.success ? 'APPLIED' : 'FAILED',
          '| Raw:', message.dataString
        )

        if (debugRef.current) {
          console.log(
            data.success ? '✅' : '❌',
            `Setting ${data.settingType}:`,
            data.value,
            data.success ? 'applied' : 'failed'
          )
        }
        return true
      }

      case 'settings_options': {
        console.log('📋 Settings options received:', message.dataString)
        console.log('📋 Parsed data:', message.data)
        if (debugRef.current) {
          console.log('📋 Settings options received:', message.data)
        }
        return true
      }

      default:
        return false
    }
  }, []) // Empty deps - uses refs for callbacks

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    settings,

    // Audio
    setAudioEnabled,
    setMasterVolume,
    setAmbientVolume,
    setSfxVolume,

    // Graphics
    setGraphicsQuality,

    // Display
    setResolution,
    setCustomResolution,

    // Network
    setBandwidthOption,

    // Performance
    startFpsTracking,
    stopFpsTracking,
    setShowFpsOverlay,

    // Utilities
    requestSettingsOptions,
    handleSettingsMessage
  }
}

export default useSettings
