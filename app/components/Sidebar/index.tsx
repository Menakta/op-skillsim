'use client'

import { useState } from 'react'
import {
  Menu,
  X,
  Play,
  Pause,
  RotateCcw,
  Camera,
  GraduationCap,
  Layers,
  Film,
  Video,
  RotateCw,
  Home,
  Sun,
  Moon
} from 'lucide-react'
import type { CameraPerspective } from '@/app/lib/messageTypes'

// Redux imports
import { useAppSelector } from '@/app/store/hooks'
import { selectTrainingState } from '@/app/store/slices/trainingSlice'

// Theme imports
import { useTheme } from '@/app/context/ThemeContext'

// =============================================================================
// Props Interface
// =============================================================================

interface SidebarProps {
  // Training Control Actions
  onStartTraining: () => void
  onPauseTraining: () => void
  onResetTraining: () => void

  // Camera Control Actions
  onSetCameraPerspective: (perspective: CameraPerspective) => void
  onToggleAutoOrbit: () => void
  onResetCamera: () => void

  // Explosion Control Actions
  onSetExplosionLevel: (level: number) => void
  onExplodeBuilding: () => void
  onAssembleBuilding: () => void

  // Waypoint Control Actions
  onRefreshWaypoints: () => void
  onActivateWaypoint: (index: number) => void
  onDeactivateWaypoint: () => void

  // Layer Control Actions
  onRefreshLayers: () => void
  onRefreshHierarchicalLayers: () => void
  onToggleLayer: (index: number) => void
  onShowAllLayers: () => void
  onHideAllLayers: () => void
  onToggleMainGroup: (groupName: string) => void
  onToggleChildGroup: (parentName: string, childIndex: number) => void

  // Application Control
  onQuitApplication: () => void
}

// =============================================================================
// Types
// =============================================================================

type SubMenuType = 'training' | 'camera' | 'layers' | 'cinematic' | null

// =============================================================================
// Component
// =============================================================================

export function Sidebar({
  onStartTraining,
  onPauseTraining,
  onResetTraining,
  onSetCameraPerspective,
  onToggleAutoOrbit,
  onResetCamera,
  onSetExplosionLevel,
  onExplodeBuilding,
  onAssembleBuilding,
  onRefreshWaypoints,
  onActivateWaypoint,
  onDeactivateWaypoint,
  onRefreshLayers,
  onRefreshHierarchicalLayers,
  onToggleLayer,
  onShowAllLayers,
  onHideAllLayers,
  onToggleMainGroup,
  onToggleChildGroup,
  onQuitApplication,
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeSubMenu, setActiveSubMenu] = useState<SubMenuType>(null)

  // Get state from Redux
  const state = useAppSelector(selectTrainingState)

  // Get theme
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  const isRunning = state.isActive
  const isPaused = !state.isActive && state.trainingStarted

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const toggleSidebar = () => {
    setIsOpen(!isOpen)
    if (isOpen) {
      setActiveSubMenu(null)
    }
  }

  const handleSubMenuClick = (menu: SubMenuType) => {
    setActiveSubMenu(activeSubMenu === menu ? null : menu)
  }

  const closeSidebar = () => {
    setIsOpen(false)
    setActiveSubMenu(null)
  }

  // ==========================================================================
  // Camera Perspectives
  // ==========================================================================

  const cameraPerspectives: { id: CameraPerspective; label: string }[] = [
    { id: 'Front', label: 'Front' },
    { id: 'Back', label: 'Back' },
    { id: 'Left', label: 'Left' },
    { id: 'Right', label: 'Right' },
    { id: 'Top', label: 'Top' },
  ]

  // ==========================================================================
  // Menu Items
  // ==========================================================================

  const menuItems = [
    {
      id: 'training' as SubMenuType,
      icon: GraduationCap,
      label: 'Training',
      hasSubMenu: true,
    },
    {
      id: 'camera' as SubMenuType,
      icon: Camera,
      label: 'Camera',
      hasSubMenu: true,
    },
    {
      id: 'layers' as SubMenuType,
      icon: Layers,
      label: 'Layers',
      hasSubMenu: true,
    },
    {
      id: 'cinematic' as SubMenuType,
      icon: Film,
      label: 'Cinematic',
      hasSubMenu: true,
    },
  ]

  // ==========================================================================
  // Render Sub Menu Content
  // ==========================================================================

  // Theme-aware button styles
  const btnClass = isDark
    ? 'bg-[#79CFC2] text-white'
    : 'bg-gray-100 hover:bg-gray-200 text-gray-900'

  const labelClass = isDark ? 'text-gray-400' : 'text-gray-800'
  const textClass = isDark ? 'text-white' : 'text-gray-900'
  const borderClass = isDark ? 'border-gray-500' : 'border-gray-600'

  const renderSubMenuContent = () => {
    switch (activeSubMenu) {
      case 'training':
        return (
          <div className="flex flex-col gap-2 p-3">
            <h4 className={`text-xs font-semibold uppercase mb-2 ${labelClass}`}>Training Controls</h4>
            <button
              onClick={() => isRunning && !isPaused ? onPauseTraining() : onStartTraining()}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${btnClass}`}
            >
              {isRunning && !isPaused ? <Pause size={16} /> : <Play size={16} />}
              {isRunning && !isPaused ? 'Pause' : isPaused ? 'Resume' : 'Start'}
            </button>
            <button
              onClick={onResetTraining}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${btnClass}`}
            >
              <RotateCcw size={16} />
              Reset
            </button>
            <div className={`mt-2 p-2 rounded-lg ${isDark ? 'bg-gray-800/50' : 'bg-gray-100'}`}>
              <div className={`text-xs ${labelClass}`}>Progress</div>
              <div className={`text-lg font-bold ${textClass}`}>{state.progress}%</div>
              <div className={`text-xs ${labelClass}`}>Task {state.currentTaskIndex + 1} of {state.totalTasks}</div>
            </div>
          </div>
        )

      case 'camera':
        return (
          <div className="flex flex-col gap-2 p-3">
            <h4 className={`text-xs font-semibold uppercase mb-2 ${labelClass}`}>Camera Views</h4>
            <div className="grid grid-cols-2 gap-2">
              {cameraPerspectives.map((cam) => (
                <button
                  key={cam.id}
                  onClick={() => onSetCameraPerspective(cam.id)}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    state.cameraPerspective === cam.id
                      ? 'bg-[#39BEAE] text-white'
                      : btnClass
                  }`}
                >
                  {cam.label}
                </button>
              ))}
            </div>
            <div className={`border-t my-2 ${borderClass}`} />
            <button
              onClick={onToggleAutoOrbit}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                state.cameraMode === 'Orbit'
                  ? 'bg-[#39BEAE] text-white'
                  : btnClass
              }`}
            >
              <Video size={16} />
              Auto Orbit {state.cameraMode === 'Orbit' ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={onResetCamera}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${btnClass}`}
            >
              <Home size={16} />
              Reset Camera
            </button>
          </div>
        )

      case 'layers':
        return (
          <div className="flex flex-col gap-2 p-3">
            <h4 className={`text-xs font-semibold uppercase mb-2 ${labelClass}`}>Layer Controls</h4>
            <button
              onClick={onRefreshHierarchicalLayers}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${btnClass}`}
            >
              <RotateCw size={16} />
              Refresh Layers
            </button>
            <button
              onClick={onShowAllLayers}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${btnClass}`}
            >
              Show All
            </button>
            <button
              onClick={onHideAllLayers}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${btnClass}`}
            >
              Hide All
            </button>
            {state.hierarchicalGroups.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto">
                {state.hierarchicalGroups.map((group: { name: string; visible: boolean }, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => onToggleMainGroup(group.name)}
                    className={`w-full text-left px-3 py-1.5 text-xs rounded ${
                      isDark ? 'text-gray-300 hover:bg-gray-700/50' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {group.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )

      case 'cinematic':
        return (
          <div className="flex flex-col gap-2 p-3">
            <h4 className={`text-xs font-semibold uppercase mb-2 ${labelClass}`}>Cinematic Mode</h4>
            <button
              onClick={onExplodeBuilding}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${btnClass}`}
            >
              Explode Building
            </button>
            <button
              onClick={onAssembleBuilding}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${btnClass}`}
            >
              Assemble Building
            </button>
            <div className="mt-2">
              <label className={`text-xs mb-1 block ${labelClass}`}>Explosion Level</label>
              <input
                type="range"
                min="0"
                max="100"
                value={state.explosionValue}
                onChange={(e) => onSetExplosionLevel(Number(e.target.value))}
                className={`${isDark ? 'accent-[#39BEAE]' : ' accent-[#ffffff]'} w-full h-2`}
              />
              <div className={`text-xs text-center ${labelClass}`}>{state.explosionValue}%</div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <>
      {/* Hamburger Toggle Button - Fixed left side */}
      <button
        onClick={toggleSidebar}
        className={`fixed top-4 left-2 z-[100] w-10 h-10 rounded-lg flex items-center justify-center shadow-lg transition-all backdrop-blur-sm  bg-[#000000]/70 hover:bg-gray-600/50 text-white`}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full backdrop-blur-md shadow-2xl transition-all duration-300 ease-in-out z-[99] bg-[#000000]/75  ${
          isOpen ? 'w-[60px]' : 'w-0'
        } overflow-hidden`}
      >
        {/* Menu Items - Centered vertically */}
        <div className="flex flex-col items-center justify-center gap-2 h-full">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeSubMenu === item.id

            return (
              <div key={item.id} className="relative group">
                <button
                  onClick={() => handleSubMenuClick(item.id)}
                  className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all m-1 ${
                    isActive
                      ? 'bg-[#39BEAE] text-white': ' text-gray-200 hover:text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  <Icon size={20} />
                </button>

                {/* Tooltip */}
                <div className={`absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity ${
                  isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900 shadow-md'
                }`}>
                  {item.label}
                </div>
              </div>
            )
          })}

          {/* Theme Toggle Button - After menu items */}
          <div className="relative group mt-2">
            <button
              onClick={toggleTheme}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                isDark
                  ? 'text-yellow-400 hover:text-yellow-300 hover:bg-gray-800'
                  : 'text-gray-200 hover:text-gray-900 hover:bg-gray-200'
              }`}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Tooltip */}
            <div className={`absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity ${
              isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900 shadow-md'
            }`}>
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </div>
          </div>
        </div>
      </div>

      {/* Sub Menu Panel - Slides out from sidebar */}
      <div
        className={`fixed top-0 left-[60px] h-full w-64 backdrop-blur-md shadow-2xl transition-all duration-300 ease-in-out z-[98] ${
          isOpen && activeSubMenu ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
        } ${
          isDark ? 'bg-black/85' : 'bg-[#39BEAE] border-r border-gray-200'
        }`}
      >
        {/* Sub Menu Header */}
        <div className={`flex items-center justify-between p-3 border-b ${
          isDark ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <h3 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {menuItems.find(m => m.id === activeSubMenu)?.label}
          </h3>
          <button
            onClick={() => setActiveSubMenu(null)}
            className={isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}
          >
            <X size={18} />
          </button>
        </div>

        {/* Sub Menu Content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 80px)' }}>
          {renderSubMenuContent()}
        </div>
      </div>

      {/* Overlay - Click to close */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-[97]"
          onClick={closeSidebar}
        />
      )}
    </>
  )
}

export default Sidebar
