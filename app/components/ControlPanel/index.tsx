'use client'

import { useState } from 'react'
import type { TrainingState } from '@/app/hooks/useTrainingMessagesComposite'
import type { ToolName, PipeType, CameraPerspective } from '@/app/lib/messageTypes'
import { TASK_SEQUENCE } from '@/app/lib/messageTypes'
import {
  GraduationCap,
  Wrench,
  Camera,
  Layers,
  Film,
  X
} from 'lucide-react'

// Import tab components
import { TrainingTab } from './TrainingTab'
import { ToolsTab } from './ToolsTab'
import { CameraTab } from './CameraTab'
import { LayersTab } from './LayersTab'
import { CinematicTab } from './CinematicTab'

// Import dropdown components
import { MapDropdown } from './MapDropdown'
import { CameraDropdown } from './CameraDropdown'
import { TrainingControls } from './TrainingControls'

// =============================================================================
// Props Interface
// =============================================================================

interface ControlPanelProps {
  // State from hook
  state: TrainingState

  // Theme
  isDark?: boolean

  // Training Control
  onStartTraining: () => void
  onPauseTraining: () => void
  onResetTraining: () => void

  // Tool Selection
  onSelectTool: (tool: ToolName) => void

  // Pipe Selection
  onSelectPipe: (pipe: PipeType) => void

  // Pressure Testing
  onSelectPressureTest: (testType: 'air-plug' | 'conduct-test') => void

  // Camera Control
  onSetCameraPerspective: (perspective: CameraPerspective) => void
  onToggleAutoOrbit: () => void
  onResetCamera: () => void

  // Explosion Control
  onSetExplosionLevel: (level: number) => void
  onExplodeBuilding: () => void
  onAssembleBuilding: () => void

  // Waypoint Control
  onRefreshWaypoints: () => void
  onActivateWaypoint: (index: number) => void
  onDeactivateWaypoint: () => void

  // Layer Control
  onRefreshLayers: () => void
  onRefreshHierarchicalLayers: () => void
  onToggleLayer: (index: number) => void
  onShowAllLayers: () => void
  onHideAllLayers: () => void
  onToggleMainGroup: (groupName: string) => void
  onToggleChildGroup: (parentName: string, childIndex: number) => void

  // Application Control
  onQuitApplication: () => void

  // Connection status
  isConnected?: boolean

  // Panel control (for auto-close)
  onPanelClose?: () => void
}

// =============================================================================
// Tab Type
// =============================================================================

type TabType = 'training' | 'tools' | 'camera' | 'layers' | 'cinematic'

// Tab configuration with icons
const tabConfig = [
  { id: 'training' as TabType, label: 'Training', icon: GraduationCap },
  { id: 'tools' as TabType, label: 'Tools', icon: Wrench },
  { id: 'camera' as TabType, label: 'Camera', icon: Camera },
  { id: 'layers' as TabType, label: 'Layers', icon: Layers },
  { id: 'cinematic' as TabType, label: 'Cinematic', icon: Film },
]

// =============================================================================
// Component
// =============================================================================

export function ControlPanel({
  state,
  isDark = true,
  onStartTraining,
  onPauseTraining,
  onResetTraining,
  onSelectTool,
  onSelectPipe,
  onSelectPressureTest,
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
  isConnected = false,
  onPanelClose
}: ControlPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType | null>(null)
  const [hoveredTab, setHoveredTab] = useState<TabType | null>(null)

  const isCinematicMode = state.mode === 'cinematic'
  const isTrainingComplete = state.currentTaskIndex >= TASK_SEQUENCE.length

  // Theme-aware colors
  const colors = {
    bg: isDark ? 'bg-gray-900' : 'bg-white',
    bgSecondary: isDark ? 'bg-gray-800' : 'bg-gray-100',
    border: isDark ? 'border-gray-700' : 'border-gray-200',
    text: isDark ? 'text-white' : 'text-gray-900',
    textSecondary: isDark ? 'text-gray-400' : 'text-gray-600',
    accent: '#39BEAE'
  }

  // ==========================================================================
  // Render Tab Content
  // ==========================================================================

  const renderTabContent = () => {
    switch (activeTab) {
      case 'training':
        return (
          <TrainingTab
            isDark={isDark}
            state={state}
          />
        )
      case 'tools':
        return (
          <ToolsTab
            state={state}
            onSelectTool={(tool) => {
              onSelectTool(tool)
              if (tool !== 'PipeConnection' && tool !== 'PressureTester') {
                handleClosePanel()
                onPanelClose?.()
              }
            }}
            onSelectPipe={(pipe) => {
              onSelectPipe(pipe)
              handleClosePanel()
              onPanelClose?.()
            }}
            onSelectPressureTest={(testType) => {
              onSelectPressureTest(testType)
              if (testType === 'conduct-test') {
                handleClosePanel()
                onPanelClose?.()
              }
            }}
          />
        )
      case 'camera':
        return (
          <CameraTab
            state={state}
            onSetCameraPerspective={onSetCameraPerspective}
            onToggleAutoOrbit={onToggleAutoOrbit}
            onResetCamera={onResetCamera}
          />
        )
      case 'layers':
        return (
          <LayersTab
            state={state}
            onRefreshWaypoints={onRefreshWaypoints}
            onActivateWaypoint={onActivateWaypoint}
            onDeactivateWaypoint={onDeactivateWaypoint}
            onRefreshLayers={onRefreshLayers}
            onRefreshHierarchicalLayers={onRefreshHierarchicalLayers}
            onToggleLayer={onToggleLayer}
            onShowAllLayers={onShowAllLayers}
            onHideAllLayers={onHideAllLayers}
            onToggleMainGroup={onToggleMainGroup}
            onToggleChildGroup={onToggleChildGroup}
          />
        )
      case 'cinematic':
        return (
          <CinematicTab
            state={state}
            onSetExplosionLevel={onSetExplosionLevel}
            onExplodeBuilding={onExplodeBuilding}
            onAssembleBuilding={onAssembleBuilding}
            onStartTraining={onStartTraining}
          />
        )
      default:
        return null
    }
  }

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const handleToggle = () => {
    if (isOpen) {
      setIsOpen(false)
      setActiveTab(null)
    } else {
      setIsOpen(true)
    }
  }

  const handleTabClick = (tab: TabType) => {
    if (activeTab === tab) {
      setActiveTab(null)
    } else {
      setActiveTab(tab)
    }
  }

  const handleClosePanel = () => {
    setActiveTab(null)
  }

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <>
      {/* Toggle Button - Only show when closed */}
      {!isOpen && (
        <button
          onClick={handleToggle}
          className="fixed bottom-5 right-5 z-50 w-12 h-12 rounded-full text-white flex items-center justify-center shadow-lg transition-all hover:scale-105"
          style={{ zIndex: 2147483647, backgroundColor: colors.accent }}
        >
          ☰
        </button>
      )}

      {/* Top Left Button - Training Controls */}
      <div className="fixed top-5 left-5 flex items-start gap-3" style={{ zIndex: 2147483647 }}>
        <TrainingControls
          state={state}
          onStartTraining={onStartTraining}
          onPauseTraining={onPauseTraining}
          onResetTraining={onResetTraining}
        />
      </div>

      {/* Top Right Buttons - Map and Camera Dropdowns */}
      <div className="fixed top-5 right-5 flex items-start gap-3" style={{ zIndex: 2147483647 }}>
        <MapDropdown currentTaskIndex={state.currentTaskIndex} />
        <CameraDropdown
          state={state}
          onSetCameraPerspective={onSetCameraPerspective}
          onToggleAutoOrbit={onToggleAutoOrbit}
          onResetCamera={onResetCamera}
        />
      </div>

      {/* Icon Bar - Bottom Center */}
      <div
        className={`fixed bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 p-3 rounded-full bg-gray-700/50 shadow-xl transform transition-all duration-300 ${
          isOpen ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'
        }`}
        style={{ zIndex: 2147483646 }}
      >
        {tabConfig.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <div key={tab.id} className="relative">
              <button
                onClick={() => handleTabClick(tab.id)}
                onMouseEnter={() => setHoveredTab(tab.id)}
                onMouseLeave={() => setHoveredTab(null)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all text-white ${
                  isActive
                    ? 'text-white scale-110'
                    : `${colors.textSecondary} hover:scale-105`
                }`}
                style={isActive ? { backgroundColor: colors.accent } : {}}
              >
                <Icon size={22} />
              </button>
              {/* Tooltip */}
              {hoveredTab === tab.id && !activeTab && (
                <div
                  className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${colors.bg} ${colors.text} shadow-lg border ${colors.border}`}
                >
                  {tab.label}
                  <div
                    className={`absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 ${colors.bg} border-r border-b ${colors.border}`}
                    style={{ marginTop: '-4px' }}
                  />
                </div>
              )}
            </div>
          )
        })}

        {/* Close Button */}
        <button
          onClick={handleToggle}
          className={`w-10 h-10 rounded-full flex items-center justify-center ml-2 transition-all text-white bg-red-500/50 hover:bg-red-500`}
        >
          <X size={25} />
        </button>
      </div>

      {/* Panel - Shows when a tab is active */}
      <div
        className={`fixed bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-lg bg-[#1A1A1A]/60 rounded-xl shadow-2xl border ${colors.border} overflow-hidden transform transition-all duration-300 ${
          activeTab ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'
        }`}
        style={{ zIndex: 2147483645, maxHeight: '60vh' }}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between p-2 border-b border-gray-400">
          <h3 className={`text-lg font-medium ${colors.text}`}>{tabConfig.find((tab) => tab.id === activeTab)?.label}</h3>
          <button onClick={handleClosePanel} className="text-gray-100 bg-gray-700/50 hover:bg-gray-700 rounded-full p-1 hover:text-gray-800 transition-colors">
            <X size={25} />
          </button>
        </div>

        {/* Panel Content */}
        <div className={`overflow-y-auto p-4 ${colors.text}`} style={{ maxHeight: 'calc(60vh - 60px)' }}>
          {/* Training Complete Popup */}
          {isTrainingComplete && activeTab === 'training' && (
            <div
              className="text-white p-4 rounded-lg mb-4 text-center"
              style={{ background: `linear-gradient(135deg, ${colors.accent} 0%, #2ea89a 100%)` }}
            >
              <div className="font-bold text-lg">Training Complete!</div>
              <div className="text-sm opacity-90">All {state.totalTasks} tasks completed</div>
              <button
                onClick={onResetTraining}
                className="mt-3 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-colors"
              >
                Start Over
              </button>
            </div>
          )}
          {renderTabContent()}
        </div>
      </div>

      {/* Overlay when bottom panel is open */}
      {activeTab && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={handleClosePanel}
        />
      )}
    </>
  )
}

export default ControlPanel
