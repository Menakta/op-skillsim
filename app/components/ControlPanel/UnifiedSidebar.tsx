'use client'

/**
 * UnifiedSidebar Component (Drawer Menu)
 *
 * A collapsible drawer-style side menu that contains all features in one place.
 * - Hidden by default, opens from left edge via arrow/handle trigger
 * - Contains: Inventory, Settings, System/Performance, and mode-specific controls
 * - Can auto-close after actions or be closed manually
 *
 * Sections:
 * - Inventory: Materials (pipes, pressure test) - Training mode only
 * - Settings: Theme, Audio, Graphics
 * - System: FPS, Resolution, Bandwidth, Performance
 * - Controls: Explosion, Waypoints, Layers, Camera (both modes)
 * - Session: Pause/Resume, Quit - Training mode only
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Layers,
  Navigation,
  X,
  Camera,
  Video,
  Home,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Maximize,
  Minimize,
  Sun,
  Moon,
  Play,
  Pause,
  LogOut,
  Plug,
  Wrench,
  Settings,
  Monitor,
  Volume2,
  VolumeX,
  Gauge,
  Wifi,
  Package,
  Sliders,
  Cpu,
  RefreshCw,
} from 'lucide-react'
import Image from 'next/image'
import { useTheme } from '@/app/context/ThemeContext'
import { useFittingOptions } from '@/app/features/training'
import type { CameraPerspective } from '@/app/lib/messageTypes'
import type { TrainingState } from '@/app/hooks/useTrainingMessagesComposite'

// =============================================================================
// Types
// =============================================================================

type SidebarMode = 'cinematic' | 'training'

type MenuTab = 'inventory' | 'controls' | 'settings' | 'system'

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

interface UnifiedSidebarProps {
  /** Sidebar mode - determines which sections are visible */
  mode: SidebarMode

  // Visibility
  isVisible: boolean

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

  // Training Controls Props (only used when mode === 'training')
  isPaused?: boolean
  onPause?: () => void
  onResume?: () => void
  onQuit?: () => void

  // Materials Props (only used when mode === 'training')
  trainingState?: TrainingState
  onSelectPipe?: (pipe: string) => void
  onSelectPressureTest?: (testType: 'air-plug' | 'conduct-test') => void
}

// =============================================================================
// Camera Perspectives
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

export function UnifiedSidebar({
  mode,
  isVisible,

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

  // Training controls props
  isPaused = false,
  onPause,
  onResume,
  onQuit,

  // Materials props
  trainingState,
  onSelectPipe,
  onSelectPressureTest,
}: UnifiedSidebarProps) {
  // ==========================================================================
  // State
  // ==========================================================================

  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<MenuTab>('controls')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['explosion']))
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Settings state
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [audioVolume, setAudioVolume] = useState(80)
  const [graphicsQuality, setGraphicsQuality] = useState<'low' | 'medium' | 'high' | 'ultra'>('high')

  // System/Performance state (these would typically come from the streaming SDK)
  const [showFps, setShowFps] = useState(false)
  const [targetFps, setTargetFps] = useState(60)
  const [resolution, setResolution] = useState<'720p' | '1080p' | '1440p' | '4k'>('1080p')
  const [bandwidthLimit, setBandwidthLimit] = useState(0) // 0 = unlimited

  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const isOrbitActive = cameraMode === 'Orbit'
  const { pipeTypes, loading: fittingsLoading } = useFittingOptions()

  const isTrainingMode = mode === 'training'

  // ==========================================================================
  // Fullscreen handlers
  // ==========================================================================

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

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  // ==========================================================================
  // Keyboard shortcuts
  // ==========================================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
        case 'escape':
          if (isOpen) {
            e.preventDefault()
            setIsOpen(false)
          }
          break
        case 'm':
          e.preventDefault()
          setIsOpen(!isOpen)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [toggleFullscreen, onResetCamera, onToggleAutoOrbit, isOpen])

  // ==========================================================================
  // Helpers
  // ==========================================================================

  const mainGroups = hierarchicalGroups.filter(g => !g.isChild)
  const childGroups = hierarchicalGroups.filter(g => g.isChild)
  const getChildren = (parentName: string) => childGroups.filter(g => g.parentName === parentName)

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

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

  // Auto-close after certain actions (optional behavior)
  const handleActionWithAutoClose = (action: () => void, shouldClose = false) => {
    action()
    if (shouldClose) {
      setIsOpen(false)
    }
  }

  if (!isVisible) return null

  // ==========================================================================
  // Menu tabs configuration
  // ==========================================================================

  const menuTabs: { id: MenuTab; label: string; icon: React.ReactNode; showInMode?: SidebarMode }[] = [
    { id: 'inventory', label: 'Inventory', icon: <Package className="w-4 h-4" />, showInMode: 'training' },
    { id: 'controls', label: 'Controls', icon: <Sliders className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
    { id: 'system', label: 'System', icon: <Cpu className="w-4 h-4" /> },
  ]

  const visibleTabs = menuTabs.filter(tab => !tab.showInMode || tab.showInMode === mode)

  return (
    <>
      {/* ====================================================================
          DRAWER TRIGGER - Edge handle/arrow
          ==================================================================== */}
      <div
        className={`fixed top-1/2 -translate-y-1/2 z-50 transition-all duration-300 ${
          isOpen ? 'left-72' : 'left-0'
        }`}
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`group flex items-center justify-center w-6 h-16 rounded-r-lg transition-all duration-200 ${
            isDark
              ? 'bg-black/80 hover:bg-black/90 border-y border-r border-white/10'
              : 'bg-white/95 hover:bg-white border-y border-r border-gray-200 shadow-lg'
          }`}
          title={isOpen ? 'Close Menu (M)' : 'Open Menu (M)'}
        >
          <ChevronRight
            className={`w-4 h-4 transition-transform duration-300 ${
              isOpen ? 'rotate-180' : ''
            } ${isDark ? 'text-white/70 group-hover:text-white' : 'text-gray-500 group-hover:text-gray-900'}`}
          />
        </button>
      </div>

      {/* ====================================================================
          DRAWER MENU
          ==================================================================== */}
      <div
        className={`fixed top-0 left-0 bottom-0 z-40 w-72 flex flex-col backdrop-blur-md border-r transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isDark ? 'bg-[#000000]/55 border-black/10' : 'bg-white/88 border-gray-100 shadow-2xl'}`}
      >
        {/* ================================================================
            HEADER
            ================================================================ */}
        <div className={`px-4 py-3 border-b flex items-center justify-between flex-shrink-0 ${
          isDark ? 'border-white/10' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isDark ? 'bg-[#39BEAE]/20' : 'bg-[#39BEAE]/10'
            }`}>
              <Sliders className="w-4 h-4 text-[#39BEAE]" />
            </div>
            <div>
              <h2 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Menu
              </h2>
              <p className={`text-[10px] ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                {isTrainingMode ? 'Training Mode' : 'Cinematic Mode'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ================================================================
            TAB NAVIGATION
            ================================================================ */}
        <div className={`px-2 pt-2 pb-1 border-b flex-shrink-0 ${
          isDark ? 'border-white/10' : 'border-gray-200'
        }`}>
          <div className={`flex gap-1 overflow-x-auto sidebar-tabs-scroll ${
            isDark ? 'sidebar-tabs-scroll-dark' : 'sidebar-tabs-scroll-light'
          }`}>
            {visibleTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-[#39BEAE] text-white'
                    : isDark
                      ? 'text-gray-400 hover:text-white hover:bg-white/5'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ================================================================
            CONTENT AREA
            ================================================================ */}
        <div className="flex-1 overflow-y-auto">
          <div className='p-2 space-y-4'>  <div className={`p-3 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-medium ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
                    Session
                  </span>
                  {isPaused && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/20 rounded text-[10px] text-amber-500 font-medium">
                      <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                      Paused
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => isPaused ? onResume?.() : onPause?.()}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isPaused
                        ? 'bg-[#39BEAE] text-white hover:bg-[#2ea89a]'
                        : isDark
                          ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                    {isPaused ? 'Resume' : 'Pause'}
                  </button>
                  <button
                    onClick={onQuit}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition-all"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Quit
                  </button>
                </div>
              </div>
              </div>
        
          {/* ============================================================
              INVENTORY TAB (Training Mode Only)
              ============================================================ */}
          {activeTab === 'inventory' && isTrainingMode && (
            <div className="p-3 space-y-4">
              {/* Session Controls */}
             

              {/* Pipe Selection */}
              <div>
                <h3 className={`text-xs font-medium mb-2 flex items-center gap-2 ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
                  <Wrench className="w-3.5 h-3.5" />
                  Pipes
                </h3>
                {fittingsLoading ? (
                  <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Loading...</div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {pipeTypes.map((pipe) => {
                      const isSelected = trainingState?.selectedPipe === pipe.id
                      return (
                        <button
                          key={pipe.id}
                          onClick={() => handleActionWithAutoClose(() => onSelectPipe?.(pipe.id))}
                          className={`aspect-square rounded-lg flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-[#39BEAE] ring-2 ring-[#39BEAE]/50'
                              : isDark
                                ? 'bg-white/10 hover:bg-[#39BEAE]/30'
                                : 'bg-gray-100 hover:bg-[#39BEAE]/20'
                          }`}
                          title={pipe.label}
                        >
                          <Image
                            src={pipe.icon}
                            alt={pipe.label}
                            width={24}
                            height={24}
                          />
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Pressure Test */}
              <div>
                <h3 className={`text-xs font-medium mb-2 flex items-center gap-2 ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
                  <Gauge className="w-3.5 h-3.5" />
                  Pressure Test
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleActionWithAutoClose(() => onSelectPressureTest?.('air-plug'))}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                      trainingState?.airPlugSelected
                        ? 'bg-[#39BEAE] text-white'
                        : isDark
                          ? 'bg-white/10 text-gray-300 hover:bg-white/20'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Plug className="w-3.5 h-3.5" />
                    Air Plug
                  </button>
                  <button
                    onClick={() => trainingState?.airPlugSelected && handleActionWithAutoClose(() => onSelectPressureTest?.('conduct-test'))}
                    disabled={!trainingState?.airPlugSelected}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                      trainingState?.airPlugSelected
                        ? isDark
                          ? 'bg-white/10 text-gray-300 hover:bg-[#39BEAE] hover:text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-[#39BEAE] hover:text-white'
                        : 'bg-gray-700/30 opacity-50 cursor-not-allowed text-gray-500'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5" />
                    Conduct Test
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================
              CONTROLS TAB
              ============================================================ */}
          {activeTab === 'controls' && (
            <div className="p-2 space-y-1">
              {/* Explosion Section */}
              <AccordionSection
                title="Building Explosion"
                icon={<Layers className="w-4 h-4" />}
                isExpanded={expandedSections.has('explosion')}
                onToggle={() => toggleSection('explosion')}
                isDark={isDark}
              >
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className={`text-xs ${isDark ? 'text-white/70' : 'text-gray-600'}`}>Level</label>
                      <span className="text-[#39BEAE] font-mono font-semibold text-sm">{Math.round(explosionValue)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={explosionValue}
                      onChange={(e) => onExplosionValueChange(Number(e.target.value))}
                      className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#39BEAE] ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={onExplode} className="px-3 py-2 bg-[#39BEAE] hover:bg-[#2ea89a] text-white rounded-lg text-xs font-medium transition-all">
                      Explode
                    </button>
                    <button onClick={onAssemble} className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}>
                      Assemble
                    </button>
                  </div>
                </div>
              </AccordionSection>

              {/* Waypoints Section */}
              <AccordionSection
                title="Waypoints"
                icon={<Navigation className="w-4 h-4" />}
                isExpanded={expandedSections.has('waypoints')}
                onToggle={() => toggleSection('waypoints')}
                isDark={isDark}
                headerAction={
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onRefreshWaypoints()
                    }}
                    className={`p-1 rounded transition-colors ${
                      isDark
                        ? 'text-gray-400 hover:text-white hover:bg-white/10'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'
                    }`}
                    title="Refresh waypoints"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                }
              >
                <div className="space-y-2">
                  {waypoints.length === 0 ? (
                    <div className={`text-center py-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      <p className="text-xs">No waypoints loaded</p>
                      <button
                        onClick={onRefreshWaypoints}
                        className={`mt-2 text-xs flex items-center gap-1 mx-auto px-2 py-1 rounded transition-colors ${
                          isDark
                            ? 'text-[#39BEAE] hover:bg-[#39BEAE]/10'
                            : 'text-[#39BEAE] hover:bg-[#39BEAE]/10'
                        }`}
                      >
                        <RefreshCw className="w-3 h-3" />
                        Load Waypoints
                      </button>
                    </div>
                  ) : (
                    <>
                      {activeWaypointIndex >= 0 && (
                        <div className="p-2 bg-[#39BEAE]/20 rounded-lg border border-[#39BEAE]/30">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[#39BEAE] font-medium text-xs">Active: {activeWaypointName}</span>
                            <button onClick={onDeactivateWaypoint} className="p-1 text-gray-400 hover:text-red-400 rounded"><X className="w-3 h-3" /></button>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={waypointProgress}
                            onChange={(e) => onWaypointProgressChange?.(Number(e.target.value))}
                            className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-[#39BEAE] ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`}
                          />
                        </div>
                      )}
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {waypoints.map((waypoint) => (
                          <button
                            key={waypoint.index}
                            onClick={() => activeWaypointIndex === waypoint.index ? onDeactivateWaypoint() : onActivateWaypoint(waypoint.index)}
                            className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs transition-all ${
                              activeWaypointIndex === waypoint.index
                                ? 'bg-[#39BEAE] text-white'
                                : isDark ? 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {waypoint.name}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </AccordionSection>

              {/* Layers Section */}
              <AccordionSection
                title="Layers"
                icon={<Eye className="w-4 h-4" />}
                isExpanded={expandedSections.has('layers')}
                onToggle={() => toggleSection('layers')}
                isDark={isDark}
                headerAction={
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onRefreshLayers()
                    }}
                    className={`p-1 rounded transition-colors ${
                      isDark
                        ? 'text-gray-400 hover:text-white hover:bg-white/10'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'
                    }`}
                    title="Refresh layers"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                }
              >
                <div className="space-y-2">
                  {mainGroups.length === 0 ? (
                    <div className={`text-center py-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      <p className="text-xs">No layers loaded</p>
                      <button
                        onClick={onRefreshLayers}
                        className={`mt-2 text-xs flex items-center gap-1 mx-auto px-2 py-1 rounded transition-colors ${
                          isDark
                            ? 'text-[#39BEAE] hover:bg-[#39BEAE]/10'
                            : 'text-[#39BEAE] hover:bg-[#39BEAE]/10'
                        }`}
                      >
                        <RefreshCw className="w-3 h-3" />
                        Load Layers
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <button onClick={onShowAllLayers} className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium ${isDark ? 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>
                          <Eye className="w-3 h-3" /> Show
                        </button>
                        <button onClick={onHideAllLayers} className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium ${isDark ? 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>
                          <EyeOff className="w-3 h-3" /> Hide
                        </button>
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
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
                    </>
                  )}
                </div>
              </AccordionSection>

              {/* Camera Section */}
              <AccordionSection
                title="Camera"
                icon={<Camera className="w-4 h-4" />}
                isExpanded={expandedSections.has('camera')}
                onToggle={() => toggleSection('camera')}
                isDark={isDark}
              >
                <div className="space-y-3">
                  <div>
                    <label className={`text-xs mb-2 block ${isDark ? 'text-white/70' : 'text-gray-600'}`}>View</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {CAMERA_PERSPECTIVES.map((cam) => (
                        <button
                          key={cam.id}
                          onClick={() => onSetCameraPerspective(cam.id)}
                          className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            cameraPerspective === cam.id
                              ? 'bg-[#39BEAE] text-white'
                              : isDark
                                ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                            ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Video className="w-3.5 h-3.5" />
                      {isOrbitActive ? 'Stop' : 'Orbit'}
                    </button>
                    <button
                      onClick={onResetCamera}
                      className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        isDark
                          ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Home className="w-3.5 h-3.5" />
                      Reset
                    </button>
                  </div>
                </div>
              </AccordionSection>
            </div>
          )}

          {/* ============================================================
              SETTINGS TAB
              ============================================================ */}
          {activeTab === 'settings' && (
            <div className="p-3 space-y-4">

              {/* Theme */}
              <div className={`p-3 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                <h3 className={`text-xs font-medium mb-3 ${isDark ? 'text-white/70' : 'text-gray-600'}`}>Appearance</h3>
                <button
                  onClick={toggleTheme}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all ${
                    isDark
                      ? 'bg-gray-700/50 hover:bg-gray-600/50'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isDark ? <Moon className="w-4 h-4 text-blue-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                    <span className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {isDark ? 'Dark Mode' : 'Light Mode'}
                    </span>
                  </div>
                  <div className={`w-10 h-5 rounded-full relative transition-colors ${isDark ? 'bg-blue-500' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow ${isDark ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                </button>
              </div>

              {/* Audio */}
              <div className={`p-3 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                <h3 className={`text-xs font-medium mb-3 ${isDark ? 'text-white/70' : 'text-gray-600'}`}>Audio</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setAudioEnabled(!audioEnabled)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all ${
                      isDark
                        ? 'bg-gray-700/50 hover:bg-gray-600/50'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {audioEnabled ? <Volume2 className="w-4 h-4 text-[#39BEAE]" /> : <VolumeX className="w-4 h-4 text-gray-500" />}
                      <span className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>Sound</span>
                    </div>
                    <div className={`w-10 h-5 rounded-full relative transition-colors ${audioEnabled ? 'bg-[#39BEAE]' : 'bg-gray-400'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow ${audioEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                  </button>
                  {audioEnabled && (
                    <div className="px-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Volume</span>
                        <span className={`text-xs font-mono ${isDark ? 'text-white/70' : 'text-gray-600'}`}>{audioVolume}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={audioVolume}
                        onChange={(e) => setAudioVolume(Number(e.target.value))}
                        className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-[#39BEAE] ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Graphics Quality */}
              <div className={`p-3 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                <h3 className={`text-xs font-medium mb-3 ${isDark ? 'text-white/70' : 'text-gray-600'}`}>Graphics Quality</h3>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['low', 'medium', 'high', 'ultra'] as const).map((quality) => (
                    <button
                      key={quality}
                      onClick={() => setGraphicsQuality(quality)}
                      className={`px-2 py-2 rounded-lg text-xs font-medium capitalize transition-all ${
                        graphicsQuality === quality
                          ? 'bg-[#39BEAE] text-white'
                          : isDark
                            ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {quality}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
                  isDark
                    ? 'bg-white/5 hover:bg-white/10'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isFullscreen ? <Minimize className="w-4 h-4 text-[#39BEAE]" /> : <Maximize className="w-4 h-4" />}
                  <span className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                  </span>
                </div>
                <span className={`text-xs ${isDark ? 'text-white/30' : 'text-gray-400'}`}>F</span>
              </button>
            </div>
          )}

          {/* ============================================================
              SYSTEM TAB
              ============================================================ */}
          {activeTab === 'system' && (
            <div className="p-3 space-y-4">
              {/* Performance Monitor */}
              <div className={`p-3 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                <h3 className={`text-xs font-medium mb-3 ${isDark ? 'text-white/70' : 'text-gray-600'}`}>Performance</h3>
                <button
                  onClick={() => setShowFps(!showFps)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all ${
                    isDark
                      ? 'bg-gray-700/50 hover:bg-gray-600/50'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-[#39BEAE]" />
                    <span className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>Show FPS</span>
                  </div>
                  <div className={`w-10 h-5 rounded-full relative transition-colors ${showFps ? 'bg-[#39BEAE]' : 'bg-gray-400'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow ${showFps ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                </button>
              </div>

              {/* Target FPS */}
              <div className={`p-3 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                <h3 className={`text-xs font-medium mb-3 ${isDark ? 'text-white/70' : 'text-gray-600'}`}>Target FPS</h3>
                <div className="grid grid-cols-4 gap-1.5">
                  {[30, 60, 90, 120].map((fps) => (
                    <button
                      key={fps}
                      onClick={() => setTargetFps(fps)}
                      className={`px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                        targetFps === fps
                          ? 'bg-[#39BEAE] text-white'
                          : isDark
                            ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {fps}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resolution */}
              <div className={`p-3 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Monitor className="w-3.5 h-3.5 text-[#39BEAE]" />
                  <h3 className={`text-xs font-medium ${isDark ? 'text-white/70' : 'text-gray-600'}`}>Resolution</h3>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['720p', '1080p', '1440p', '4k'] as const).map((res) => (
                    <button
                      key={res}
                      onClick={() => setResolution(res)}
                      className={`px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                        resolution === res
                          ? 'bg-[#39BEAE] text-white'
                          : isDark
                            ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bandwidth */}
              <div className={`p-3 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Wifi className="w-3.5 h-3.5 text-[#39BEAE]" />
                  <h3 className={`text-xs font-medium ${isDark ? 'text-white/70' : 'text-gray-600'}`}>Bandwidth Limit</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                      {bandwidthLimit === 0 ? 'Unlimited' : `${bandwidthLimit} Mbps`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={bandwidthLimit}
                    onChange={(e) => setBandwidthLimit(Number(e.target.value))}
                    className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-[#39BEAE] ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`}
                  />
                  <div className="flex justify-between text-[10px] text-gray-500">
                    <span>Unlimited</span>
                    <span>100 Mbps</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ================================================================
            FOOTER
            ================================================================ */}
        <div className={`px-3 py-2 border-t text-center flex-shrink-0 ${
          isDark ? 'border-white/10' : 'border-gray-200'
        }`}>
          <p className={`text-[10px] ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
            Press <kbd className={`px-1 py-0.5 rounded ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>M</kbd> to toggle menu
          </p>
        </div>
      </div>

      {/* ====================================================================
          MOBILE: Floating action button to open menu
          ==================================================================== */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`sm:hidden fixed top-4 left-4 z-50 w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-md border transition-all duration-200 ${
          isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        } ${
          isDark
            ? 'bg-black/70 hover:bg-black/80 text-white/80 hover:text-white border-white/10'
            : 'bg-white/90 hover:bg-white text-gray-700 hover:text-gray-900 border-gray-200 shadow-lg'
        }`}
      >
        <Sliders className="w-5 h-5" />
      </button>
    </>
  )
}

// =============================================================================
// Accordion Section Component
// =============================================================================

interface AccordionSectionProps {
  title: string
  icon: React.ReactNode
  isExpanded: boolean
  onToggle: () => void
  isDark: boolean
  children: React.ReactNode
  headerAction?: React.ReactNode
}

function AccordionSection({ title, icon, isExpanded, onToggle, isDark, children, headerAction }: AccordionSectionProps) {
  return (
    <div className={`rounded-lg overflow-hidden ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-3 py-2.5 transition-colors ${
          isDark
            ? isExpanded ? 'bg-[#39BEAE]/10' : 'hover:bg-white/5'
            : isExpanded ? 'bg-[#39BEAE]/5' : 'hover:bg-gray-100'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-[#39BEAE]">{icon}</span>
          <span className={`font-medium text-xs ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</span>
        </div>
        <div className="flex items-center gap-1">
          {headerAction}
          <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''} ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
        </div>
      </button>
      {isExpanded && (
        <div className={`px-3 pb-3 pt-1 ${isDark ? 'border-t border-white/5' : 'border-t border-gray-100'}`}>
          {children}
        </div>
      )}
    </div>
  )
}

export default UnifiedSidebar
