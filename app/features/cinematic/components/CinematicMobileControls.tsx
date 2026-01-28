'use client'

import { useState, useEffect, useCallback } from 'react'
import { Layers, Navigation, X, Camera, Video, Home, Eye, EyeOff, ChevronDown, ChevronRight, Maximize, Minimize, PanelLeftOpen, Sun, Moon } from 'lucide-react'
import { ExplosionControls } from './ExplosionControls'
import { WaypointControls } from './WaypointControls'
import { CameraControls } from './CameraControls'
import { LayerControls } from './LayerControls'
import { useTheme } from '@/app/context/ThemeContext'
import type { CameraPerspective } from '@/app/lib/messageTypes'

// =============================================================================
// Types
// =============================================================================

interface WaypointData {
  index: number
  name: string
}

interface HierarchicalLayerData {
  name: string
  visible: boolean
  isChild: boolean
  actorCount: number
  parentName?: string
  childIndex?: number
}

// =============================================================================
// Props Interface
// =============================================================================

interface CinematicMobileControlsProps {
  // Explosion Controls Props
  explosionValue: number
  onExplosionValueChange: (value: number) => void
  onExplode: () => void
  onAssemble: () => void

  // Waypoint Controls Props
  waypoints: WaypointData[]
  activeWaypointIndex: number
  activeWaypointName: string
  waypointProgress?: number
  onRefreshWaypoints: () => void
  onActivateWaypoint: (index: number) => void
  onDeactivateWaypoint: () => void
  onWaypointProgressChange?: (progress: number) => void

  // Camera Controls Props
  cameraPerspective?: string
  cameraMode?: string
  onSetCameraPerspective: (perspective: CameraPerspective) => void
  onToggleAutoOrbit: () => void
  onResetCamera: () => void

  // Layer Controls Props
  hierarchicalGroups: HierarchicalLayerData[]
  onRefreshLayers: () => void
  onToggleMainGroup: (groupName: string) => void
  onToggleChildGroup: (parentName: string, childIndex: number) => void
  onShowAllLayers: () => void
  onHideAllLayers: () => void

  // Visibility
  isVisible: boolean
}

// =============================================================================
// Camera Perspectives for Mobile
// =============================================================================

const CAMERA_PERSPECTIVES: { id: CameraPerspective; label: string }[] = [
  { id: 'Front', label: 'Front' },
  { id: 'Back', label: 'Back' },
  { id: 'Left', label: 'Left' },
  { id: 'Right', label: 'Right' },
  { id: 'Top', label: 'Top' },
  { id: 'IsometricNE', label: 'Iso' },
]

// =============================================================================
// Component
// =============================================================================

export function CinematicMobileControls({
  // Explosion props
  explosionValue,
  onExplosionValueChange,
  onExplode,
  onAssemble,

  // Waypoint props
  waypoints,
  activeWaypointIndex,
  activeWaypointName,
  waypointProgress = 0,
  onRefreshWaypoints,
  onActivateWaypoint,
  onDeactivateWaypoint,
  onWaypointProgressChange,

  // Camera props
  cameraPerspective,
  cameraMode,
  onSetCameraPerspective,
  onToggleAutoOrbit,
  onResetCamera,

  // Layer props
  hierarchicalGroups,
  onRefreshLayers,
  onToggleMainGroup,
  onToggleChildGroup,
  onShowAllLayers,
  onHideAllLayers,

  // Visibility
  isVisible
}: CinematicMobileControlsProps) {
  const [showExplosionPanel, setShowExplosionPanel] = useState(false)
  const [showWaypointPanel, setShowWaypointPanel] = useState(false)
  const [showCameraPanel, setShowCameraPanel] = useState(false)
  const [showLayerPanel, setShowLayerPanel] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const isOrbitActive = cameraMode === 'Orbit'

  // Fullscreen handlers
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (err) {
      console.error('Fullscreen error:', err)
    }
  }, [])

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key.toLowerCase()) {
        case 'f':
          e.preventDefault()
          toggleFullscreen()
          break
        case 'r':
          e.preventDefault()
          onResetCamera()
          break
        case 'o':
          e.preventDefault()
          onToggleAutoOrbit()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [toggleFullscreen, onResetCamera, onToggleAutoOrbit])

  // Layer helpers
  const mainGroups = hierarchicalGroups.filter(g => !g.isChild)
  const childGroups = hierarchicalGroups.filter(g => g.isChild)
  const getChildren = (parentName: string) => childGroups.filter(g => g.parentName === parentName)
  const toggleExpanded = (groupName: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupName)) {
        next.delete(groupName)
      } else {
        next.add(groupName)
      }
      return next
    })
  }

  if (!isVisible) return null

  return (
    <>
      {/* Desktop: Sidebar toggle button — placed where ThemeToggle normally sits */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`${sidebarOpen ? 'hidden' : 'sm:flex'} fixed top-4 left-4 z-50 w-10 h-10 rounded-xl items-center justify-center backdrop-blur-md border transition-all duration-200 ${
           isDark
              ? 'bg-black/70 hover:bg-black/80 text-white/80 hover:text-white border-white/10'
              : 'bg-white/90 hover:bg-white text-gray-700 hover:text-gray-900 border-gray-200 shadow-lg'
        }`}
        title={sidebarOpen ? 'Close Controls' : 'Open Controls'}
      >
        {!sidebarOpen && <PanelLeftOpen className="w-5 h-5" />}
      </button>

      {/* Desktop: Full-height sidebar */}
      <div className={`hidden sm:flex fixed top-0 left-0 bottom-0 z-40 w-64 flex-col backdrop-blur-md border-r transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } ${isDark ? 'bg-black/90 border-white/10' : 'bg-white/95 border-gray-200 shadow-xl'}`}>

        {/* Sidebar Header */}
        <div className={`px-4 py-4 border-b flex items-center justify-between flex-shrink-0 ${
          isDark ? 'border-white/10' : 'border-gray-200'
        }`}>
          <span className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>Controls</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable accordion content */}
        <div className="flex-1 overflow-y-auto">
          {/* Explosion Dropdown */}
          <div>
            <button
              onClick={() => setShowExplosionPanel(!showExplosionPanel)}
              className={`w-full flex items-center justify-between px-3 py-2.5 transition-colors ${
                isDark
                  ? showExplosionPanel ? 'bg-[#39BEAE]/10' : 'hover:bg-white/5'
                  : showExplosionPanel ? 'bg-[#39BEAE]/5' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#39BEAE]" />
                <span className={`font-semibold text-xs ${isDark ? 'text-white' : 'text-gray-900'}`}>Building Explosion</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${showExplosionPanel ? 'rotate-180' : ''} ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            </button>
            {showExplosionPanel && (
              <div className={`p-3 space-y-3 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={`text-xs ${isDark ? 'text-white/70' : 'text-gray-600'}`}>Explosion Level</label>
                    <span className="text-[#39BEAE] font-mono font-semibold text-sm">{Math.round(explosionValue)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={explosionValue}
                    onChange={(e) => onExplosionValueChange(Number(e.target.value))}
                    className={`w-full h-2 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#39BEAE] [&::-webkit-slider-thumb]:cursor-pointer ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={onExplode} className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#39BEAE] hover:bg-[#2ea89a] text-white rounded-lg transition-all text-xs font-medium">
                    Explode
                  </button>
                  <button onClick={onAssemble} className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg transition-all text-xs font-medium ${isDark ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}>
                    Assemble
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Waypoint Dropdown */}
          <div className={`border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
            <button
              onClick={() => setShowWaypointPanel(!showWaypointPanel)}
              className={`w-full flex items-center justify-between px-3 py-2.5 transition-colors ${
                isDark
                  ? showWaypointPanel ? 'bg-[#39BEAE]/10' : 'hover:bg-white/5'
                  : showWaypointPanel ? 'bg-[#39BEAE]/5' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-[#39BEAE]" />
                <span className={`font-semibold text-xs ${isDark ? 'text-white' : 'text-gray-900'}`}>Waypoints</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${showWaypointPanel ? 'rotate-180' : ''} ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            </button>
            {showWaypointPanel && (
              <div className={`p-3 space-y-3 border-t max-h-60 overflow-y-auto ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                {activeWaypointIndex >= 0 && (
                  <div className="p-2.5 bg-[#39BEAE]/20 rounded-lg border border-[#39BEAE]/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[#39BEAE] font-medium text-xs">Active: {activeWaypointName}</span>
                      <button onClick={onDeactivateWaypoint} className="p-1 text-gray-400 hover:text-red-400 rounded"><X className="w-3.5 h-3.5" /></button>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={waypointProgress}
                      onChange={(e) => onWaypointProgressChange?.(Number(e.target.value))}
                      className={`w-full h-2 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#39BEAE] [&::-webkit-slider-thumb]:cursor-pointer ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`}
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  {waypoints.map((waypoint) => (
                    <button
                      key={waypoint.index}
                      onClick={() => activeWaypointIndex === waypoint.index ? onDeactivateWaypoint() : onActivateWaypoint(waypoint.index)}
                      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all text-xs ${
                        activeWaypointIndex === waypoint.index
                          ? 'bg-[#39BEAE] text-white'
                          : isDark ? 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {waypoint.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Layers Dropdown */}
          <div className={`border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
            <button
              onClick={() => setShowLayerPanel(!showLayerPanel)}
              className={`w-full flex items-center justify-between px-3 py-2.5 transition-colors ${
                isDark
                  ? showLayerPanel ? 'bg-[#39BEAE]/10' : 'hover:bg-white/5'
                  : showLayerPanel ? 'bg-[#39BEAE]/5' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#39BEAE]" />
                <span className={`font-semibold text-xs ${isDark ? 'text-white' : 'text-gray-900'}`}>Layers</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${showLayerPanel ? 'rotate-180' : ''} ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            </button>
            {showLayerPanel && (
              <div className={`border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                <div className={`px-3 py-2 flex gap-2 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                  <button onClick={onShowAllLayers} className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium ${isDark ? 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>
                    <Eye className="w-3 h-3" /> Show All
                  </button>
                  <button onClick={onHideAllLayers} className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium ${isDark ? 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>
                    <EyeOff className="w-3 h-3" /> Hide All
                  </button>
                </div>
                <div className="p-2 max-h-48 overflow-y-auto space-y-1">
                  {mainGroups.map((group) => {
                    const children = getChildren(group.name)
                    const hasChildren = children.length > 0
                    const isExpanded = expandedGroups.has(group.name)
                    return (
                      <div key={group.name}>
                        <div className="flex items-center gap-1">
                          {hasChildren ? (
                            <button onClick={() => toggleExpanded(group.name)} className={`p-0.5 rounded ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
                              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            </button>
                          ) : <div className="w-4" />}
                          <button
                            onClick={() => onToggleMainGroup(group.name)}
                            className={`flex-1 flex items-center gap-1.5 px-2 py-1 rounded-lg text-left text-xs ${
                              group.visible
                                ? isDark ? 'bg-[#39BEAE]/20 text-white' : 'bg-[#39BEAE]/20 text-gray-900'
                                : isDark ? 'bg-gray-800/30 text-gray-400 hover:bg-gray-700/50' : 'bg-gray-100/50 text-gray-500 hover:bg-gray-200/50'
                            }`}
                          >
                            {group.visible ? <Eye className="w-3 h-3 text-[#39BEAE]" /> : <EyeOff className="w-3 h-3" />}
                            <span className="truncate">{group.name}</span>
                          </button>
                        </div>
                        {hasChildren && isExpanded && (
                          <div className={`ml-4 mt-1 space-y-1 border-l pl-2 ${isDark ? 'border-gray-700/50' : 'border-gray-300/50'}`}>
                            {children.map((child) => (
                              <button
                                key={`${child.parentName}-${child.childIndex}`}
                                onClick={() => onToggleChildGroup(child.parentName!, child.childIndex!)}
                                className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-lg text-left text-xs ${
                                  child.visible
                                    ? isDark ? 'bg-[#39BEAE]/10 text-white' : 'bg-[#39BEAE]/10 text-gray-900'
                                    : isDark ? 'bg-gray-800/20 text-gray-500 hover:bg-gray-700/30' : 'bg-gray-100/30 text-gray-500 hover:bg-gray-200/30'
                                }`}
                              >
                                {child.visible ? <Eye className="w-2.5 h-2.5 text-[#39BEAE]" /> : <EyeOff className="w-2.5 h-2.5" />}
                                <span className="truncate">{child.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Camera Dropdown */}
          <div className={`border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
            <button
              onClick={() => setShowCameraPanel(!showCameraPanel)}
              className={`w-full flex items-center justify-between px-3 py-2.5 transition-colors ${
                isDark
                  ? showCameraPanel ? 'bg-[#39BEAE]/10' : 'hover:bg-white/5'
                  : showCameraPanel ? 'bg-[#39BEAE]/5' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#39BEAE]" />
                <span className={`font-semibold text-xs ${isDark ? 'text-white' : 'text-gray-900'}`}>Camera</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${showCameraPanel ? 'rotate-180' : ''} ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            </button>
            {showCameraPanel && (
              <div className={`p-3 space-y-3 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                <div>
                  <label className={`text-xs mb-2 block ${isDark ? 'text-white/70' : 'text-gray-600'}`}>Camera View</label>
                  <div className="grid grid-cols-3 gap-2">
                    {CAMERA_PERSPECTIVES.map((cam) => (
                      <button
                        key={cam.id}
                        onClick={() => onSetCameraPerspective(cam.id)}
                        className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          cameraPerspective === cam.id
                            ? 'bg-[#39BEAE] text-white'
                            : isDark
                              ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                        }`}
                      >
                        {cam.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={onToggleAutoOrbit}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isOrbitActive
                        ? 'bg-[#39BEAE] text-white'
                        : isDark
                          ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    {isOrbitActive ? 'Stop Orbit' : 'Auto Orbit'}
                  </button>
                  <button
                    onClick={onResetCamera}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isDark
                        ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                    }`}
                  >
                    <Home className="w-3.5 h-3.5" />
                    Reset
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Footer — Theme Toggle + Fullscreen */}
        <div className={`px-3 py-3 border-t flex items-center gap-2 flex-shrink-0 ${
          isDark ? 'border-white/10' : 'border-gray-200'
        }`}>
          <button
            onClick={toggleTheme}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              isDark
                ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            }`}
            title={isDark ? 'Light Mode' : 'Dark Mode'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button
            onClick={toggleFullscreen}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              isDark
                ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            }`}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            {isFullscreen ? 'Exit' : 'Fullscreen'}
          </button>
        </div>
      </div>

      {/* Mobile: Fullscreen Button - Top Right */}
      <button
        onClick={toggleFullscreen}
        className={`sm:hidden fixed top-4 right-3 z-40 w-10 h-10 flex items-center justify-center backdrop-blur-md rounded-xl border transition-all duration-200 ${
          isDark
            ? 'bg-black/70 hover:bg-black/80 text-white/80 hover:text-white border-white/10'
            : 'bg-white/90 hover:bg-white text-gray-700 hover:text-gray-900 border-gray-200 shadow-lg'
        }`}
        title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
      >
        {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
      </button>

      {/* Mobile: Show toggle buttons in corners */}
      <div className="sm:hidden">
        {/* Top Left Toggle Button - Explosion Controls */}
        <button
          onClick={() => {
            setShowExplosionPanel(!showExplosionPanel)
            setShowWaypointPanel(false)
            setShowCameraPanel(false)
            setShowLayerPanel(false)
          }}
          className={`fixed top-16 left-3 z-40 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
            showExplosionPanel
              ? 'bg-[#39BEAE] text-white'
              : isDark
                ? 'bg-black/70 backdrop-blur-md text-white/80 hover:bg-black/80 hover:text-white border border-white/10'
                : 'bg-white/90 backdrop-blur-md text-gray-700 hover:bg-white hover:text-gray-900 border border-gray-200 shadow-lg'
          }`}
        >
          {showExplosionPanel ? <X className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
        </button>

        {/* Top Right Toggle Button - Waypoint Controls */}
        <button
          onClick={() => {
            setShowWaypointPanel(!showWaypointPanel)
            setShowExplosionPanel(false)
            setShowCameraPanel(false)
            setShowLayerPanel(false)
          }}
          className={`fixed top-16 right-3 z-40 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
            showWaypointPanel
              ? 'bg-[#39BEAE] text-white'
              : isDark
                ? 'bg-black/70 backdrop-blur-md text-white/80 hover:bg-black/80 hover:text-white border border-white/10'
                : 'bg-white/90 backdrop-blur-md text-gray-700 hover:bg-white hover:text-gray-900 border border-gray-200 shadow-lg'
          }`}
        >
          {showWaypointPanel ? <X className="w-5 h-5" /> : <Navigation className="w-5 h-5" />}
        </button>

        {/* Bottom Left Toggle Button - Camera Controls */}
        <button
          onClick={() => {
            setShowCameraPanel(!showCameraPanel)
            setShowExplosionPanel(false)
            setShowWaypointPanel(false)
            setShowLayerPanel(false)
          }}
          className={`fixed bottom-4 left-3 z-40 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
            showCameraPanel
              ? 'bg-[#39BEAE] text-white'
              : isDark
                ? 'bg-black/70 backdrop-blur-md text-white/80 hover:bg-black/80 hover:text-white border border-white/10'
                : 'bg-white/90 backdrop-blur-md text-gray-700 hover:bg-white hover:text-gray-900 border border-gray-200 shadow-lg'
          }`}
        >
          {showCameraPanel ? <X className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
        </button>

        {/* Bottom Right Toggle Button - Layer Controls */}
        <button
          onClick={() => {
            setShowLayerPanel(!showLayerPanel)
            setShowExplosionPanel(false)
            setShowWaypointPanel(false)
            setShowCameraPanel(false)
          }}
          className={`fixed bottom-4 right-3 z-40 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
            showLayerPanel
              ? 'bg-[#39BEAE] text-white'
              : isDark
                ? 'bg-black/70 backdrop-blur-md text-white/80 hover:bg-black/80 hover:text-white border border-white/10'
                : 'bg-white/90 backdrop-blur-md text-gray-700 hover:bg-white hover:text-gray-900 border border-gray-200 shadow-lg'
          }`}
        >
          {showLayerPanel ? <X className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>

        {/* Mobile Explosion Panel - Slides in from left */}
        {showExplosionPanel && (
          <div className={`fixed top-28 left-3 right-3 z-30 backdrop-blur-md rounded-xl border overflow-hidden animate-in slide-in-from-left-2 duration-200 ${
            isDark ? 'bg-black/80 border-white/10' : 'bg-white/90 border-gray-200 shadow-lg'
          }`}>
            {/* Header */}
            <div className={`px-3 py-2 border-b ${
              isDark
                ? 'bg-gradient-to-r from-[#39BEAE]/20 to-transparent border-white/10'
                : 'bg-gradient-to-r from-[#39BEAE]/10 to-transparent border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#39BEAE]" />
                  <h3 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>Building Explosion</h3>
                </div>
                <button
                  onClick={() => setShowExplosionPanel(false)}
                  className={`p-1 rounded-lg transition-colors ${
                    isDark ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-3 space-y-3">
              {/* Slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={`text-xs ${isDark ? 'text-white/70' : 'text-gray-600'}`}>Explosion Level</label>
                  <span className="text-[#39BEAE] font-mono font-semibold text-sm">{Math.round(explosionValue)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={explosionValue}
                  onChange={(e) => onExplosionValueChange(Number(e.target.value))}
                  className={`w-full h-2 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#39BEAE] [&::-webkit-slider-thumb]:cursor-pointer ${
                    isDark ? 'bg-gray-700' : 'bg-gray-300'
                  }`}
                />
              </div>

              {/* Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onExplode}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#39BEAE] hover:bg-[#2ea89a] text-white rounded-lg transition-all duration-200 text-xs font-medium"
                >
                  Explode
                </button>
                <button
                  onClick={onAssemble}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg transition-all duration-200 text-xs font-medium ${
                    isDark ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  }`}
                >
                  Assemble
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Waypoint Panel - Slides in from right */}
        {showWaypointPanel && (
          <div className={`fixed top-28 left-3 right-3 z-30 max-h-[60vh] backdrop-blur-md rounded-xl border overflow-hidden animate-in slide-in-from-right-2 duration-200 ${
            isDark ? 'bg-black/80 border-white/10' : 'bg-white/90 border-gray-200 shadow-lg'
          }`}>
            {/* Header */}
            <div className={`px-3 py-2 border-b ${
              isDark
                ? 'bg-gradient-to-r from-[#39BEAE]/20 to-transparent border-white/10'
                : 'bg-gradient-to-r from-[#39BEAE]/10 to-transparent border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-[#39BEAE]" />
                  <h3 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>Waypoint Navigation</h3>
                </div>
                <button
                  onClick={() => setShowWaypointPanel(false)}
                  className={`p-1 rounded-lg transition-colors ${
                    isDark ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-3 space-y-3 overflow-y-auto max-h-[calc(60vh-3rem)]">
              {/* Active Waypoint Display */}
              {activeWaypointIndex >= 0 && (
                <div className="p-2.5 bg-[#39BEAE]/20 rounded-lg border border-[#39BEAE]/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-[#39BEAE] rounded-full animate-pulse" />
                      <span className="text-[#39BEAE] font-medium text-xs">Active</span>
                    </div>
                    <button
                      onClick={onDeactivateWaypoint}
                      className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className={`font-semibold text-sm mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{activeWaypointName}</div>

                  {/* Progress Slider */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className={`text-xs ${isDark ? 'text-white/70' : 'text-gray-600'}`}>Position</label>
                      <span className="text-[#39BEAE] font-mono text-xs">{Math.round(waypointProgress)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={waypointProgress}
                      onChange={(e) => onWaypointProgressChange?.(Number(e.target.value))}
                      className={`w-full h-2 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#39BEAE] [&::-webkit-slider-thumb]:cursor-pointer ${
                        isDark ? 'bg-gray-700' : 'bg-gray-300'
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* Waypoint List */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className={`text-xs font-medium ${isDark ? 'text-white/70' : 'text-gray-600'}`}>Available Waypoints</h4>
                  <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{waypoints.length} found</span>
                </div>

                {waypoints.length === 0 ? (
                  <div className="text-center py-4">
                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No waypoints available</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {waypoints.map((waypoint) => {
                      const isActive = activeWaypointIndex === waypoint.index
                      return (
                        <button
                          key={waypoint.index}
                          onClick={() => isActive ? onDeactivateWaypoint() : onActivateWaypoint(waypoint.index)}
                          className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all ${
                            isActive
                              ? 'bg-[#39BEAE] text-white'
                              : isDark
                                ? 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-xs truncate">{waypoint.name}</div>
                            <div className={`text-xs ${isActive ? 'text-white/70' : 'text-gray-500'}`}>
                              Waypoint {waypoint.index + 1}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Camera Panel - Slides up from bottom */}
        {showCameraPanel && (
          <div className={`fixed bottom-16 left-3 right-3 z-30 backdrop-blur-md rounded-xl border overflow-hidden animate-in slide-in-from-bottom-2 duration-200 ${
            isDark ? 'bg-black/80 border-white/10' : 'bg-white/90 border-gray-200 shadow-lg'
          }`}>
            {/* Header */}
            <div className={`px-3 py-2 border-b ${
              isDark
                ? 'bg-gradient-to-r from-[#39BEAE]/20 to-transparent border-white/10'
                : 'bg-gradient-to-r from-[#39BEAE]/10 to-transparent border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#39BEAE]" />
                  <h3 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>Camera</h3>
                </div>
                <button
                  onClick={() => setShowCameraPanel(false)}
                  className={`p-1 rounded-lg transition-colors ${
                    isDark ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-3 space-y-3">
              {/* Perspective Buttons */}
              <div>
                <label className={`text-xs mb-2 block ${isDark ? 'text-white/70' : 'text-gray-600'}`}>Camera View</label>
                <div className="grid grid-cols-3 gap-2">
                  {CAMERA_PERSPECTIVES.map((cam) => (
                    <button
                      key={cam.id}
                      onClick={() => onSetCameraPerspective(cam.id)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        cameraPerspective === cam.id
                          ? 'bg-[#39BEAE] text-white'
                          : isDark
                            ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                      }`}
                    >
                      {cam.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto Orbit & Reset */}
              <div className="flex gap-2">
                <button
                  onClick={onToggleAutoOrbit}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isOrbitActive
                      ? 'bg-[#39BEAE] text-white'
                      : isDark
                        ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  {isOrbitActive ? 'Stop Orbit' : 'Auto Orbit'}
                </button>
                <button
                  onClick={onResetCamera}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isDark
                      ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                  }`}
                >
                  <Home className="w-3.5 h-3.5" />
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Layer Panel - Slides up from bottom right */}
        {showLayerPanel && (
          <div className={`fixed bottom-16 left-3 right-3 z-30 max-h-[50vh] backdrop-blur-md rounded-xl border overflow-hidden animate-in slide-in-from-bottom-2 duration-200 flex flex-col ${
            isDark ? 'bg-black/80 border-white/10' : 'bg-white/90 border-gray-200 shadow-lg'
          }`}>
            {/* Header */}
            <div className={`px-3 py-2 border-b flex-shrink-0 ${
              isDark
                ? 'bg-gradient-to-r from-[#39BEAE]/20 to-transparent border-white/10'
                : 'bg-gradient-to-r from-[#39BEAE]/10 to-transparent border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[#39BEAE]" />
                  <h3 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>Layers</h3>
                </div>
                <button
                  onClick={() => setShowLayerPanel(false)}
                  className={`p-1 rounded-lg transition-colors ${
                    isDark ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Show All / Hide All */}
            <div className={`px-3 py-2 border-b flex gap-2 flex-shrink-0 ${
              isDark ? 'border-white/10' : 'border-gray-200'
            }`}>
              <button
                onClick={onShowAllLayers}
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isDark
                    ? 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900'
                }`}
              >
                <Eye className="w-3 h-3" />
                Show All
              </button>
              <button
                onClick={onHideAllLayers}
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isDark
                    ? 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900'
                }`}
              >
                <EyeOff className="w-3 h-3" />
                Hide All
              </button>
            </div>

            {/* Layer List */}
            <div className="flex-1 overflow-y-auto p-2">
              {mainGroups.length === 0 ? (
                <div className="text-center py-4">
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No layers available</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {mainGroups.map((group) => {
                    const children = getChildren(group.name)
                    const hasChildren = children.length > 0
                    const isExpanded = expandedGroups.has(group.name)

                    return (
                      <div key={group.name}>
                        {/* Main Group */}
                        <div className="flex items-center gap-1">
                          {hasChildren ? (
                            <button
                              onClick={() => toggleExpanded(group.name)}
                              className={`p-0.5 rounded transition-colors ${
                                isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                              }`}
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-3 h-3" />
                              ) : (
                                <ChevronRight className="w-3 h-3" />
                              )}
                            </button>
                          ) : (
                            <div className="w-4" />
                          )}

                          <button
                            onClick={() => onToggleMainGroup(group.name)}
                            className={`flex-1 flex items-center gap-1.5 px-2 py-1 rounded-lg text-left text-xs transition-all ${
                              group.visible
                                ? isDark
                                  ? 'bg-[#39BEAE]/20 text-white'
                                  : 'bg-[#39BEAE]/20 text-gray-900'
                                : isDark
                                  ? 'bg-gray-800/30 text-gray-400 hover:bg-gray-700/50'
                                  : 'bg-gray-100/50 text-gray-500 hover:bg-gray-200/50 hover:text-gray-700'
                            }`}
                          >
                            {group.visible ? (
                              <Eye className="w-3 h-3 text-[#39BEAE]" />
                            ) : (
                              <EyeOff className="w-3 h-3" />
                            )}
                            <span className="flex-1 truncate">{group.name}</span>
                          </button>
                        </div>

                        {/* Children */}
                        {hasChildren && isExpanded && (
                          <div className={`ml-4 mt-1 space-y-1 border-l pl-2 ${
                            isDark ? 'border-gray-700/50' : 'border-gray-300/50'
                          }`}>
                            {children.map((child) => (
                              <button
                                key={`${child.parentName}-${child.childIndex}`}
                                onClick={() => onToggleChildGroup(child.parentName!, child.childIndex!)}
                                className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-lg text-left text-xs transition-all ${
                                  child.visible
                                    ? isDark
                                      ? 'bg-[#39BEAE]/10 text-white'
                                      : 'bg-[#39BEAE]/10 text-gray-900'
                                    : isDark
                                      ? 'bg-gray-800/20 text-gray-500 hover:bg-gray-700/30'
                                      : 'bg-gray-100/30 text-gray-500 hover:bg-gray-200/30 hover:text-gray-600'
                                }`}
                              >
                                {child.visible ? (
                                  <Eye className="w-2.5 h-2.5 text-[#39BEAE]" />
                                ) : (
                                  <EyeOff className="w-2.5 h-2.5" />
                                )}
                                <span className="flex-1 truncate">{child.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default CinematicMobileControls
