'use client'

import { useState } from 'react'
import type {
  ToolName,
  PipeType,
  CameraPerspective
} from '../lib/messageTypes'
import { TASK_SEQUENCE, TOOL_INFO } from '../lib/messageTypes'
import type { TrainingState } from '../hooks/useTrainingMessages'

// =============================================================================
// Props Interface (matching player(2).html control flow)
// =============================================================================

interface ControlPanelProps {
  // State from hook
  state: TrainingState

  // Training Control
  onStartTraining: () => void
  onPauseTraining: () => void
  onResetTraining: () => void

  // Tool Selection (matching player(2).html selectTool)
  onSelectTool: (tool: ToolName) => void

  // Pipe Selection (matching player(2).html selectPipe)
  onSelectPipe: (pipe: PipeType) => void

  // Pressure Testing (matching player(2).html selectPressureTest)
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
// Camera Perspectives
// =============================================================================

const CAMERA_PERSPECTIVES: { id: CameraPerspective; label: string }[] = [
  { id: 'Front', label: 'Front' },
  { id: 'Back', label: 'Back' },
  { id: 'Left', label: 'Left' },
  { id: 'Right', label: 'Right' },
  { id: 'Top', label: 'Top' },
  { id: 'Bottom', label: 'Bottom' },
  { id: 'IsometricNE', label: 'ISO-NE' },
  { id: 'IsometricSE', label: 'ISO-SE' },
  { id: 'IsometricSW', label: 'ISO-SW' }
]

// =============================================================================
// Pipe Types (matching player(2).html)
// =============================================================================

const PIPE_TYPES: { id: PipeType; label: string }[] = [
  { id: 'y-junction', label: 'Y-Junction' },
  { id: 'elbow', label: '90° Elbow' },
  { id: '100mm', label: '100mm Pipe' },
  { id: '150mm', label: '150mm Pipe' }
]

// =============================================================================
// Component (matching player(2).html UI flow)
// =============================================================================

export default function ControlPanel({
  state,
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
  const [activeTab, setActiveTab] = useState<'training' | 'tools' | 'camera' | 'layers' | 'cinematic'>('training')
  const [wrongToolClicked, setWrongToolClicked] = useState<ToolName | null>(null)

  const isCinematicMode = state.mode === 'cinematic'
  const isTrainingMode = state.mode === 'training'
  const currentTaskDef = TASK_SEQUENCE[state.currentTaskIndex]
  const isTrainingComplete = state.currentTaskIndex >= TASK_SEQUENCE.length

  // Handle tool click with feedback (matching player(2).html)
  const handleToolClick = (tool: ToolName) => {
    // Check if this is the expected tool
    if (currentTaskDef && tool !== currentTaskDef.tool) {
      // Wrong tool - show feedback
      setWrongToolClicked(tool)
      setTimeout(() => setWrongToolClicked(null), 1500)
      console.log('Wrong tool clicked:', tool, '- Expected:', currentTaskDef.tool)
      return
    }

    // Correct tool - proceed
    setWrongToolClicked(null)
    onSelectTool(tool)
  }

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-5 right-5 z-50 w-12 h-12 rounded-full bg-blue-400 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg transition-all"
        style={{ zIndex: 2147483647 }}
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
        className="fixed top-5 right-20 z-50 px-4 py-2 rounded bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-colors"
        style={{ zIndex: 2147483647 }}
      >
        ✕ Quit
      </button>

      {/* Control Panel Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-[#16213e] border-l border-[#2c3e50] overflow-y-auto p-5 transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ zIndex: 2147483646 }}
      >
        {/* Header (matching player(2).html) */}
        <div className="bg-gradient-to-r from-[#16213e] to-[#0f3460] p-3 -mx-5 -mt-5 mb-5">
          <h1 className="text-white font-semibold text-lg">OPNZ Training</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-sm text-blue-300">
              {isCinematicMode ? 'Interactive View' :
               isTrainingComplete ? 'Training Complete!' :
               `Training: ${state.phase}`}
            </span>
          </div>
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-2 mb-4 p-2 bg-[#1e2a4a] rounded-lg">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-xs text-gray-400">{isConnected ? 'Connected to UE5' : 'Disconnected'}</span>
          <span className="text-xs text-gray-500 ml-auto">Mode: {state.uiMode}</span>
        </div>

        {/* Training Complete Popup */}
        {isTrainingComplete && (
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg mb-4 text-center">
            <div className="text-2xl mb-2">🎉</div>
            <div className="font-bold text-lg">Training Complete!</div>
            <div className="text-sm opacity-90">All {state.totalTasks} tasks completed</div>
            <button
              onClick={onResetTraining}
              className="mt-3 px-4 py-2 bg-white/20 hover:bg-white/30 rounded text-sm transition-colors"
            >
              Start Over
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-[#2c3e50] mb-4">
          {(['training', 'tools', 'camera', 'layers', 'cinematic'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                activeTab === tab
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* ================================================================== */}
        {/* TRAINING TAB */}
        {/* ================================================================== */}
        {activeTab === 'training' && (
          <div className="space-y-4">
            {/* Training Progress Widget */}
            <div className="bg-[#1e2a4a] rounded-lg p-4 border border-[#2c3e50]">
              <h3 className="text-blue-400 text-sm font-medium border-b border-[#2c3e50] pb-2 mb-3">Training Progress</h3>
              <div className="text-white text-sm mb-2">
                Task {Math.min(state.currentTaskIndex + 1, state.totalTasks)} of {state.totalTasks}
              </div>
              <div className="w-full h-2 bg-[#2c3e50] rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-300"
                  style={{ width: `${state.progress}%` }}
                />
              </div>
              <div className="text-white text-sm">{state.taskName}</div>
              <div className="text-gray-400 text-xs">Phase: {state.phase}</div>
            </div>

            {/* Training Controls */}
            <div className="bg-[#1e2a4a] rounded-lg p-4 border border-[#2c3e50]">
              <h3 className="text-blue-400 text-sm font-medium border-b border-[#2c3e50] pb-2 mb-3">Training Control</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onStartTraining}
                  className="p-2 bg-green-500/20 border border-green-500/30 rounded text-green-400 hover:bg-green-500/30 transition-colors text-sm"
                >
                  ▶ Start
                </button>
                <button
                  onClick={onPauseTraining}
                  className="p-2 bg-yellow-500/20 border border-yellow-500/30 rounded text-yellow-400 hover:bg-yellow-500/30 transition-colors text-sm"
                >
                  ⏸ Pause
                </button>
                <button
                  onClick={onResetTraining}
                  className="p-2 bg-gray-500/20 border border-gray-500/30 rounded text-gray-400 hover:bg-gray-500/30 transition-colors text-sm col-span-2"
                >
                  🔄 Reset Training
                </button>
              </div>
            </div>

            {/* Current Tool Widget */}
            <div className="bg-[#1e2a4a] rounded-lg p-4 border border-[#2c3e50]">
              <h3 className="text-blue-400 text-sm font-medium border-b border-[#2c3e50] pb-2 mb-3">Current Tool</h3>
              <div className="flex items-center gap-3 p-3 bg-[#2c3e50] rounded-lg">
                <div className="w-8 h-8 bg-blue-400 rounded flex items-center justify-center text-lg">
                  {TOOL_INFO[state.currentTool]?.icon || 'N'}
                </div>
                <div>
                  <div className="text-white text-sm">{TOOL_INFO[state.currentTool]?.name || 'None'}</div>
                  <div className="text-gray-400 text-xs">{TOOL_INFO[state.currentTool]?.description || 'No tool selected'}</div>
                </div>
              </div>
            </div>

            {/* Task Sequence Reference */}
            <div className="bg-[#1e2a4a] rounded-lg p-4 border border-[#2c3e50]">
              <h3 className="text-blue-400 text-sm font-medium border-b border-[#2c3e50] pb-2 mb-3">Task Sequence</h3>
              <div className="space-y-1">
                {TASK_SEQUENCE.map((task, index) => (
                  <div
                    key={task.taskId}
                    className={`p-2 rounded flex items-center gap-2 ${
                      index < state.currentTaskIndex
                        ? 'bg-green-500/20 text-green-400'
                        : index === state.currentTaskIndex
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                        : 'bg-gray-800/50 text-gray-500'
                    }`}
                  >
                    <span className="text-lg">{TOOL_INFO[task.tool]?.icon}</span>
                    <div className="flex-1">
                      <div className="text-xs font-medium">{task.name}</div>
                      <div className="text-xs opacity-70">{task.tool}</div>
                    </div>
                    {index < state.currentTaskIndex && <span className="text-green-400">✓</span>}
                    {index === state.currentTaskIndex && <span className="text-blue-400">→</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* TOOLS TAB (matching player(2).html tool selection flow) */}
        {/* ================================================================== */}
        {activeTab === 'tools' && (
          <div className="space-y-4">
            {/* Tool Selection Prompt - Only show when in training and not complete */}
            {isTrainingMode && currentTaskDef && !isTrainingComplete && (
              <div className="bg-gradient-to-r from-pink-500 to-pink-600 text-white p-3 rounded-lg text-center animate-pulse">
                <div className="text-sm font-bold mb-1">✨ SELECT REQUIRED TOOL ✨</div>
                <div className="text-xs">Choose {currentTaskDef.tool} to continue training</div>
              </div>
            )}

            {/* Wrong Tool Feedback */}
            {wrongToolClicked && (
              <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-lg text-center">
                <div className="text-sm font-bold">Wrong Tool!</div>
                <div className="text-xs">Expected: {currentTaskDef?.tool}</div>
              </div>
            )}

            {/* Tool Buttons (matching player(2).html) */}
            <div className="bg-[#1e2a4a] rounded-lg p-4 border border-[#2c3e50]">
              <h3 className="text-blue-400 text-sm font-medium border-b border-[#2c3e50] pb-2 mb-3">🔧 Available Tools</h3>
              <div className="grid grid-cols-2 gap-2">
                {(['XRay', 'Shovel', 'Measuring', 'PipeConnection', 'Glue', 'PressureTester'] as ToolName[]).map((tool) => {
                  const isRequired = currentTaskDef?.tool === tool && !isTrainingComplete
                  const isSelected = state.selectedTool === tool
                  const isWrong = wrongToolClicked === tool
                  const info = TOOL_INFO[tool]

                  return (
                    <button
                      key={tool}
                      onClick={() => handleToolClick(tool)}
                      disabled={isTrainingComplete}
                      className={`p-2 rounded text-sm font-medium transition-all ${
                        isWrong
                          ? 'bg-red-500 text-white border-2 border-red-300 animate-shake'
                          : isRequired
                          ? 'bg-pink-500 text-white border-2 border-pink-300 animate-pulse shadow-lg shadow-pink-500/50'
                          : isSelected
                          ? 'bg-teal-500 text-white border-2 border-teal-300'
                          : isTrainingComplete
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : 'bg-green-600 text-white hover:bg-green-500'
                      }`}
                    >
                      {info.icon} {info.name.split(' ')[0]}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Pipe Selection (show when PipeConnection is selected) */}
            {state.selectedTool === 'PipeConnection' && (
              <div className="bg-[#1e2a4a] rounded-lg p-4 border border-[#2c3e50] border-pink-500">
                <h3 className="text-pink-400 text-sm font-medium border-b border-[#2c3e50] pb-2 mb-3">🔧 Select Pipe Type</h3>
                <div className="text-xs text-gray-400 mb-3">Choose the correct pipe fitting to continue</div>
                <div className="grid grid-cols-2 gap-2">
                  {PIPE_TYPES.map((pipe) => (
                    <button
                      key={pipe.id}
                      onClick={() => onSelectPipe(pipe.id)}
                      className={`p-3 rounded text-sm font-medium transition-all ${
                        state.selectedPipe === pipe.id
                          ? 'bg-pink-500 text-white border-2 border-pink-300'
                          : 'bg-orange-500 text-white hover:bg-orange-400'
                      }`}
                    >
                      {pipe.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Pressure Test Panel (show when PressureTester is selected) */}
            {state.selectedTool === 'PressureTester' && (
              <div className="bg-[#1e2a4a] rounded-lg p-4 border border-[#2c3e50] border-pink-500">
                <h3 className="text-pink-400 text-sm font-medium border-b border-[#2c3e50] pb-2 mb-3">🔧 Pressure Test Setup</h3>
                <div className="text-xs text-gray-400 mb-3">
                  Step 1: Select Air Plug, then Step 2: Conduct Test
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => onSelectPressureTest('air-plug')}
                    className="p-3 bg-orange-500 text-white rounded text-sm hover:bg-orange-400 transition-colors flex items-center justify-center gap-2"
                  >
                    <span>1️⃣</span> Select Air Plug
                  </button>
                  <button
                    onClick={() => onSelectPressureTest('conduct-test')}
                    className="p-3 bg-blue-500 text-white rounded text-sm hover:bg-blue-400 transition-colors flex items-center justify-center gap-2"
                  >
                    <span>2️⃣</span> Conduct Test
                  </button>
                </div>
                <div className="text-xs text-gray-500 mt-3 p-2 bg-[#2c3e50] rounded">
                  Note: Q6 question will appear during the test. Answer correctly and click Close to continue.
                </div>
              </div>
            )}

            {/* Task Status */}
            <div className="bg-[#1e2a4a] rounded-lg p-4 border border-[#2c3e50]">
              <h3 className="text-blue-400 text-sm font-medium border-b border-[#2c3e50] pb-2 mb-3">Task Status</h3>
              <div className="text-xs text-gray-400 space-y-1">
                <div>Phase: <span className="text-white">{state.phase}</span></div>
                <div>Selected Tool: <span className="text-white">{state.selectedTool || 'None'}</span></div>
                <div>Current Task Index: <span className="text-white">{state.currentTaskIndex}</span></div>
                <div>Training Started: <span className="text-white">{state.trainingStarted ? 'Yes' : 'No'}</span></div>
                <div>Next Step: <span className="text-white">
                  {isTrainingComplete
                    ? 'All tasks complete!'
                    : currentTaskDef
                      ? `Select ${currentTaskDef.tool} for: ${currentTaskDef.name}`
                      : 'Start Training'}
                </span></div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* CAMERA TAB */}
        {/* ================================================================== */}
        {activeTab === 'camera' && (
          <div className="space-y-4">
            <div className="bg-[#1e2a4a] rounded-lg p-4 border border-[#2c3e50]">
              <h3 className="text-blue-400 text-sm font-medium border-b border-[#2c3e50] pb-2 mb-3">Camera Controls</h3>

              {/* Perspective Buttons */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {CAMERA_PERSPECTIVES.map((cam) => (
                  <button
                    key={cam.id}
                    onClick={() => onSetCameraPerspective(cam.id)}
                    className={`p-2 rounded text-xs font-medium transition-colors ${
                      state.cameraPerspective === cam.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-600 text-white hover:bg-gray-500'
                    }`}
                  >
                    {cam.label}
                  </button>
                ))}
              </div>

              {/* Orbit and Reset */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onToggleAutoOrbit}
                  className={`p-2 rounded text-sm font-medium transition-colors ${
                    state.cameraMode === 'Orbit'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-600 text-white hover:bg-gray-500'
                  }`}
                >
                  {state.cameraMode === 'Orbit' ? '⏹ Stop Orbit' : '🔄 Auto Orbit'}
                </button>
                <button
                  onClick={onResetCamera}
                  className="p-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-500 transition-colors"
                >
                  🔄 Reset
                </button>
              </div>

              {/* Camera Status */}
              <div className="text-xs text-gray-400 mt-3 space-y-1">
                <div>Mode: <span className="text-white">{state.cameraMode}</span></div>
                <div>Perspective: <span className="text-white">{state.cameraPerspective}</span></div>
                <div>Distance: <span className="text-white">{state.cameraDistance}</span></div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* LAYERS TAB */}
        {/* ================================================================== */}
        {activeTab === 'layers' && (
          <div className="space-y-4">
            {/* Layer Controls */}
            <div className="bg-[#1e2a4a] rounded-lg p-4 border border-[#2c3e50]">
              <h3 className="text-blue-400 text-sm font-medium border-b border-[#2c3e50] pb-2 mb-3">👁️ Layer Visibility</h3>

              {/* Layer List */}
              <div className="max-h-48 overflow-y-auto mb-3 space-y-1">
                {state.hierarchicalGroups.length > 0 ? (
                  state.hierarchicalGroups.map((group, index) => (
                    <button
                      key={`${group.name}-${index}`}
                      onClick={() => {
                        if (group.isChild && group.parentName !== undefined && group.childIndex !== undefined) {
                          onToggleChildGroup(group.parentName, group.childIndex)
                        } else {
                          onToggleMainGroup(group.name)
                        }
                      }}
                      className={`w-full p-2 rounded text-left text-xs transition-colors ${
                        group.visible
                          ? 'bg-[#2c3e50] text-white'
                          : 'bg-gray-700 text-gray-400 opacity-50'
                      } ${group.isChild ? 'ml-4' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>
                          {group.isChild ? '└ ' : '📁 '}
                          {group.name}
                          <span className="text-gray-500 ml-1">({group.actorCount})</span>
                        </span>
                        <span>{group.visible ? '👁️' : '🚫'}</span>
                      </div>
                    </button>
                  ))
                ) : state.layers.length > 0 ? (
                  state.layers.map((layer) => (
                    <button
                      key={layer.index}
                      onClick={() => onToggleLayer(layer.index)}
                      className={`w-full p-2 rounded text-left text-xs transition-colors ${
                        layer.visible
                          ? 'bg-[#2c3e50] text-white'
                          : 'bg-gray-700 text-gray-400 opacity-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>
                          🏗️ {layer.name}
                          <span className="text-gray-500 ml-1">({layer.actorCount})</span>
                        </span>
                        <span>{layer.visible ? '👁️' : '🚫'}</span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    Click Refresh to load layers
                  </div>
                )}
              </div>

              {/* Layer Actions */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button
                  onClick={onShowAllLayers}
                  className="p-2 bg-gray-600 text-white rounded text-xs hover:bg-gray-500 transition-colors"
                >
                  👁️ Show All
                </button>
                <button
                  onClick={onHideAllLayers}
                  className="p-2 bg-gray-600 text-white rounded text-xs hover:bg-gray-500 transition-colors"
                >
                  🚫 Hide All
                </button>
              </div>
              <button
                onClick={() => {
                  onRefreshLayers()
                  onRefreshHierarchicalLayers()
                }}
                className="w-full p-2 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
              >
                🔄 Refresh Layers
              </button>
            </div>

            {/* Waypoints Widget */}
            <div className="bg-[#1e2a4a] rounded-lg p-4 border border-[#2c3e50]">
              <h3 className="text-blue-400 text-sm font-medium border-b border-[#2c3e50] pb-2 mb-3">📍 Waypoints</h3>

              {/* Active Waypoint Indicator */}
              {state.activeWaypointIndex >= 0 && (
                <div className="bg-blue-500/20 border border-blue-500 text-blue-300 p-2 rounded mb-3">
                  <div className="text-xs font-bold">Active: {state.activeWaypointName}</div>
                </div>
              )}

              <div className="max-h-36 overflow-y-auto mb-3 space-y-1">
                {state.waypoints.length > 0 ? (
                  state.waypoints.map((waypoint) => (
                    <button
                      key={waypoint.index}
                      onClick={() => onActivateWaypoint(waypoint.index)}
                      className={`w-full p-2 rounded text-left text-xs transition-colors ${
                        state.activeWaypointIndex === waypoint.index
                          ? 'bg-blue-500/30 border border-blue-500 text-blue-300'
                          : 'bg-[#2c3e50] text-white hover:bg-[#3c5070]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          state.activeWaypointIndex === waypoint.index ? 'bg-green-500' : 'bg-gray-500'
                        }`} />
                        📍 {waypoint.name}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    Click Refresh to load waypoints
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {state.activeWaypointIndex >= 0 && (
                  <button
                    onClick={onDeactivateWaypoint}
                    className="p-2 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors"
                  >
                    ❌ Exit Waypoint
                  </button>
                )}
                <button
                  onClick={onRefreshWaypoints}
                  className={`p-2 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors ${
                    state.activeWaypointIndex >= 0 ? '' : 'col-span-2'
                  }`}
                >
                  🔄 Refresh
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* CINEMATIC TAB (Explosion Controls) */}
        {/* ================================================================== */}
        {activeTab === 'cinematic' && (
          <div className="space-y-4">
            <div className="bg-[#1e2a4a] rounded-lg p-4 border border-[#2c3e50]">
              <h3 className="text-blue-400 text-sm font-medium border-b border-[#2c3e50] pb-2 mb-3">🏗️ Building Explosion</h3>

              {/* Explosion Slider */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Explosion Level</span>
                  <span>{Math.round(state.explosionValue)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={state.explosionValue}
                  onChange={(e) => onSetExplosionLevel(parseInt(e.target.value))}
                  className="w-full h-2 bg-[#2c3e50] rounded appearance-none cursor-pointer accent-blue-400"
                />
              </div>

              {/* Explode/Assemble Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onExplodeBuilding}
                  className="p-3 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
                >
                  💥 Explode
                </button>
                <button
                  onClick={onAssembleBuilding}
                  className="p-3 bg-gray-600 text-white rounded text-sm hover:bg-gray-500 transition-colors"
                >
                  🔧 Assemble
                </button>
              </div>

              {/* Animation Status */}
              {state.isAnimating && (
                <div className="text-yellow-400 text-xs mt-3 animate-pulse text-center">
                  🔄 Animating...
                </div>
              )}
            </div>

            {/* Start Training Button - Only show in cinematic mode */}
            {isCinematicMode && (
              <button
                onClick={onStartTraining}
                className="w-full p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-bold text-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg shadow-blue-500/30"
              >
                🎯 Start Training
              </button>
            )}
          </div>
        )}
      </div>

      {/* Overlay when panel is open (mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Shake animation style */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </>
  )
}
