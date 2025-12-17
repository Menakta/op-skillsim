'use client'

import { useState } from 'react'
import type { TrainingState } from '@/app/hooks/useTrainingMessagesComposite'
import type { ToolName, PipeType, CameraPerspective } from '@/app/lib/messageTypes'
import { TASK_SEQUENCE } from '@/app/lib/messageTypes'

// Import tab components
import { TrainingTab } from './TrainingTab'
import { ToolsTab } from './ToolsTab'
import { CameraTab } from './CameraTab'
import { LayersTab } from './LayersTab'
import { CinematicTab } from './CinematicTab'

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
}

// =============================================================================
// Tab Type
// =============================================================================

type TabType = 'training' | 'tools' | 'camera' | 'layers' | 'cinematic'

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
  isConnected = false
}: ControlPanelProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('training')

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
            state={state}
            onStartTraining={onStartTraining}
            onPauseTraining={onPauseTraining}
            onResetTraining={onResetTraining}
          />
        )
      case 'tools':
        return (
          <ToolsTab
            state={state}
            onSelectTool={onSelectTool}
            onSelectPipe={onSelectPipe}
            onSelectPressureTest={onSelectPressureTest}
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
  // Render
  // ==========================================================================

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-5 right-5 z-50 w-12 h-12 rounded-full text-white flex items-center justify-center shadow-lg transition-all hover:scale-105"
        style={{ zIndex: 2147483647, backgroundColor: colors.accent }}
      >
        {isOpen ? '✕' : '☰'}
      </button>

      {/* Quit Button */}
      <button
        onClick={() => {
          if (confirm('Are you sure you want to quit the training application?')) {
            onQuitApplication()
          }
        }}
        className="fixed top-5 right-20 z-50 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-colors"
        style={{ zIndex: 2147483647 }}
      >
        Quit
      </button>

      {/* Control Panel Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-80 ${colors.bg} ${colors.border} border-l overflow-y-auto p-5 transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ zIndex: 2147483646 }}
      >
        {/* Header */}
        <div
          className="p-4 -mx-5 -mt-5 mb-5"
          style={{ background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accent}dd 100%)` }}
        >
          <h1 className="text-white font-bold text-xl">OP Skillsim</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-sm text-white/90">
              {isCinematicMode ? 'Interactive View' :
               isTrainingComplete ? 'Training Complete!' :
               `Training: ${state.phase}`}
            </span>
          </div>
        </div>

        {/* Connection Status */}
        <div className={`flex items-center gap-2 mb-4 p-3 ${colors.bgSecondary} rounded-lg`}>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className={`text-xs ${colors.textSecondary}`}>{isConnected ? 'Connected to UE5' : 'Disconnected'}</span>
          <span className={`text-xs ${colors.textSecondary} ml-auto`}>Mode: {state.uiMode}</span>
        </div>

        {/* Training Complete Popup */}
        {isTrainingComplete && (
          <div
            className="text-white p-4 rounded-lg mb-4 text-center"
            style={{ background: `linear-gradient(135deg, ${colors.accent} 0%, #2ea89a 100%)` }}
          >
            <div className="text-2xl mb-2">🎉</div>
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

        {/* Tabs */}
        <div className={`flex ${colors.border} border-b mb-4`}>
          {(['training', 'tools', 'camera', 'layers', 'cinematic'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                activeTab === tab
                  ? 'border-b-2'
                  : `${colors.textSecondary} hover:${colors.text}`
              }`}
              style={activeTab === tab ? { color: colors.accent, borderColor: colors.accent } : {}}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className={colors.text}>
          {renderTabContent()}
        </div>
      </div>

      {/* Overlay when panel is open (mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}

export default ControlPanel
