'use client'

import { useState } from 'react'
import type { TrainingControlAction } from '../hooks/useStreamMessaging'

// Training phases
interface Phase {
  id: string
  name: string
  description: string
  letter: string
}

const PHASES: Phase[] = [
  { id: 'phase-a', letter: 'A', name: 'X-Ray Analysis', description: 'Analyze underground utilities' },
  { id: 'phase-b', letter: 'B', name: 'Excavation', description: 'Dig to required depth' },
  { id: 'phase-c', letter: 'C', name: 'Measurement', description: 'Measure pipe distances' },
  { id: 'phase-d', letter: 'D', name: 'Fitting Selection', description: 'Choose correct fittings' },
  { id: 'phase-e', letter: 'E', name: 'Pipe Connection', description: 'Connect pipes together' },
  { id: 'phase-f', letter: 'F', name: 'Glue Application', description: 'Apply adhesive properly' },
  { id: 'phase-g', letter: 'G', name: 'Pressure Testing', description: 'Test for leaks' },
  { id: 'phase-h', letter: 'H', name: 'Summary', description: 'Review final results' }
]

// Available tools
interface Tool {
  id: string
  name: string
  icon: string
}

const TOOLS: Tool[] = [
  { id: 'shovel', name: 'Shovel', icon: '🪏' },
  { id: 'measuring-tape', name: 'Measuring Tape', icon: '📏' },
  { id: 'pipe-cutter', name: 'Pipe Cutter', icon: '✂️' },
  { id: 'glue-applicator', name: 'Glue Applicator', icon: '🧴' },
  { id: 'pressure-gauge', name: 'Pressure Gauge', icon: '🔧' }
]

// Camera views
interface CameraView {
  id: string
  name: string
}

const CAMERA_VIEWS: CameraView[] = [
  { id: 'overhead', name: 'Overhead' },
  { id: 'first-person', name: 'First Person' },
  { id: 'side', name: 'Side View' },
  { id: 'detail', name: 'Detail View' }
]

interface ControlPanelProps {
  onTrainingControl: (action: TrainingControlAction) => void
  onToolChange: (toolId: string) => void
  onToolOperation: (toolId: string, operation: string, params?: Record<string, unknown>) => void
  onCameraChange: (viewId: string) => void
  onRequestProgress: () => void
  isConnected?: boolean
  connectionStatus?: 'disconnected' | 'connecting' | 'connected'
}

export default function ControlPanel({
  onTrainingControl,
  onToolChange,
  onToolOperation,
  onCameraChange,
  onRequestProgress,
  isConnected = true,
  connectionStatus = 'connected'
}: ControlPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'training' | 'tools' | 'camera' | 'settings'>('training')
  const [selectedTool, setSelectedTool] = useState<string | null>(null)
  const [selectedCamera, setSelectedCamera] = useState<string>('first-person')
  const [settings, setSettings] = useState({
    volume: 80,
    showHints: true,
    showTimer: true
  })

  const handleToolSelect = (toolId: string) => {
    setSelectedTool(toolId)
    onToolChange(toolId)
  }

  const handleCameraSelect = (viewId: string) => {
    setSelectedCamera(viewId)
    onCameraChange(viewId)
  }

  const getConnectionColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500'
      case 'connecting': return 'bg-yellow-500 animate-pulse'
      default: return 'bg-red-500'
    }
  }

  const getConnectionText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected'
      case 'connecting': return 'Connecting...'
      default: return 'Disconnected'
    }
  }

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed left-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-xl transition-all duration-300 ${
          isOpen
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
            : 'bg-black/50 backdrop-blur-sm text-white/70 hover:text-white hover:bg-black/70'
        }`}
      >
        <svg
          className={`w-6 h-6 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={isOpen ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'}
          />
        </svg>
      </button>

      {/* Control Panel */}
      <div
        className={`fixed left-0 top-0 h-full w-80 bg-gray-900/95 backdrop-blur-md border-r border-gray-800 z-40 transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <div>
              <h2 className="text-white font-semibold">Control Panel</h2>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${getConnectionColor()}`} />
                <span className="text-xs text-gray-400">{getConnectionText()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          {(['training', 'tools', 'camera', 'settings'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-xs font-medium transition-colors ${
                activeTab === tab
                  ? 'text-indigo-400 border-b-2 border-indigo-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto h-[calc(100%-140px)]">

          {/* Training Tab */}
          {activeTab === 'training' && (
            <div className="space-y-4">
              {/* Training Controls */}
              <div className="space-y-2">
                <h3 className="text-sm text-gray-400 font-medium">Training Control</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onTrainingControl('start')}
                    className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 hover:bg-green-500/30 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    </svg>
                    Start
                  </button>
                  <button
                    onClick={() => onTrainingControl('pause')}
                    className="p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-yellow-400 hover:bg-yellow-500/30 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
                    </svg>
                    Pause
                  </button>
                  <button
                    onClick={() => onTrainingControl('resume')}
                    className="p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 hover:bg-blue-500/30 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    </svg>
                    Resume
                  </button>
                  <button
                    onClick={() => onTrainingControl('reset')}
                    className="p-3 bg-gray-500/20 border border-gray-500/30 rounded-lg text-gray-400 hover:bg-gray-500/30 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reset
                  </button>
                </div>
                <button
                  onClick={() => onTrainingControl('abort')}
                  className="w-full p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Abort Training
                </button>
              </div>

              {/* Progress Request */}
              <div className="space-y-2">
                <h3 className="text-sm text-gray-400 font-medium">Progress</h3>
                <button
                  onClick={onRequestProgress}
                  className="w-full p-3 bg-indigo-500/20 border border-indigo-500/30 rounded-lg text-indigo-400 hover:bg-indigo-500/30 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Request Progress Details
                </button>
              </div>

              {/* Phases Reference */}
              <div className="space-y-2">
                <h3 className="text-sm text-gray-400 font-medium">Training Phases</h3>
                <div className="space-y-1">
                  {PHASES.map((phase) => (
                    <div
                      key={phase.id}
                      className="p-2 bg-gray-800/50 rounded-lg flex items-center gap-3"
                    >
                      <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs font-bold">
                        {phase.letter}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{phase.name}</p>
                        <p className="text-gray-500 text-xs truncate">{phase.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tools Tab */}
          {activeTab === 'tools' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500">Select a tool to use in the simulation</p>

              {/* Tool Selection */}
              <div className="space-y-2">
                <h3 className="text-sm text-gray-400 font-medium">Available Tools</h3>
                <div className="grid grid-cols-1 gap-2">
                  {TOOLS.map((tool) => (
                    <button
                      key={tool.id}
                      onClick={() => handleToolSelect(tool.id)}
                      className={`p-3 rounded-lg text-left transition-all flex items-center gap-3 ${
                        selectedTool === tool.id
                          ? 'bg-indigo-500/20 border-2 border-indigo-500'
                          : 'bg-gray-800/50 border-2 border-transparent hover:bg-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <span className="text-2xl">{tool.icon}</span>
                      <span className="text-white font-medium">{tool.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tool Operations */}
              {selectedTool && (
                <div className="space-y-2">
                  <h3 className="text-sm text-gray-400 font-medium">Tool Operations</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onToolOperation(selectedTool, 'activate')}
                      className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 hover:bg-green-500/30 transition-colors text-sm"
                    >
                      Activate
                    </button>
                    <button
                      onClick={() => onToolOperation(selectedTool, 'deactivate')}
                      className="p-3 bg-gray-500/20 border border-gray-500/30 rounded-lg text-gray-400 hover:bg-gray-500/30 transition-colors text-sm"
                    >
                      Deactivate
                    </button>
                    <button
                      onClick={() => onToolOperation(selectedTool, 'use')}
                      className="p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 hover:bg-blue-500/30 transition-colors text-sm col-span-2"
                    >
                      Use Tool
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Camera Tab */}
          {activeTab === 'camera' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500">Change the camera perspective</p>

              <div className="space-y-2">
                <h3 className="text-sm text-gray-400 font-medium">Camera Views</h3>
                <div className="grid grid-cols-2 gap-2">
                  {CAMERA_VIEWS.map((view) => (
                    <button
                      key={view.id}
                      onClick={() => handleCameraSelect(view.id)}
                      className={`p-4 rounded-lg text-center transition-all ${
                        selectedCamera === view.id
                          ? 'bg-indigo-500/20 border-2 border-indigo-500 text-indigo-400'
                          : 'bg-gray-800/50 border-2 border-transparent hover:bg-gray-800 hover:border-gray-700 text-white'
                      }`}
                    >
                      <svg className="w-6 h-6 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm font-medium">{view.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <p className="text-xs text-gray-500">Customize your experience</p>

              {/* Volume */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-400 font-medium">Volume</label>
                  <span className="text-sm text-indigo-400">{settings.volume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.volume}
                  onChange={(e) => setSettings({ ...settings, volume: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              {/* Toggles */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                  <div>
                    <p className="text-white text-sm font-medium">Show Hints</p>
                    <p className="text-gray-500 text-xs">Display helpful tips</p>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, showHints: !settings.showHints })}
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      settings.showHints ? 'bg-indigo-500' : 'bg-gray-700'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                        settings.showHints ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                  <div>
                    <p className="text-white text-sm font-medium">Show Timer</p>
                    <p className="text-gray-500 text-xs">Display elapsed time</p>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, showTimer: !settings.showTimer })}
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      settings.showTimer ? 'bg-indigo-500' : 'bg-gray-700'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                        settings.showTimer ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Overlay when panel is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
