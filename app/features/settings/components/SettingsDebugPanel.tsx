'use client'

/**
 * Settings Debug Panel
 *
 * Developer tool for testing all settings_control features.
 * Press Ctrl+Shift+D to toggle this panel.
 */

import { useState, useEffect } from 'react'
import { X, Play, CheckCircle, XCircle, Clock } from 'lucide-react'

interface TestResult {
  name: string
  message: string
  status: 'idle' | 'sent' | 'success' | 'failed'
  timestamp?: number
  response?: string
}

interface SettingsDebugPanelProps {
  sendMessage: (message: string) => void
  onClose?: () => void
}

export function SettingsDebugPanel({ sendMessage, onClose }: SettingsDebugPanelProps) {
  const [results, setResults] = useState<TestResult[]>([])
  const [isVisible, setIsVisible] = useState(false)

  // Toggle with Ctrl+Shift+D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault()
        setIsVisible(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const runTest = (name: string, message: string) => {
    console.log(`🧪 Running test: ${name}`)
    console.log(`📤 Sending: ${message}`)

    setResults(prev => [...prev, {
      name,
      message,
      status: 'sent',
      timestamp: Date.now()
    }])

    sendMessage(message)
  }

  const runAllTests = async () => {
    console.log('🧪 Running all settings tests...')
    setResults([])

    const tests = [
      // Resolution
      { name: 'Resolution 1080p', message: 'settings_control:resolution:1920:1080' },
      { name: 'Resolution 720p', message: 'settings_control:resolution:1280:720' },

      // Graphics
      { name: 'Graphics Low', message: 'settings_control:graphics_quality:Low' },
      { name: 'Graphics High', message: 'settings_control:graphics_quality:High' },

      // Audio
      { name: 'Master Volume 80%', message: 'settings_control:audio_volume:Master:0.8' },
      { name: 'Ambient Volume 60%', message: 'settings_control:audio_volume:Ambient:0.6' },

      // Bandwidth
      { name: 'Bandwidth Auto', message: 'settings_control:bandwidth:Auto' },
      { name: 'Bandwidth High', message: 'settings_control:bandwidth:High Quality' },

      // FPS
      { name: 'FPS Start', message: 'settings_control:fps_tracking:start' },

      // Options
      { name: 'Get Options', message: 'settings_control:get_options:request' },
    ]

    for (const test of tests) {
      runTest(test.name, test.message)
      await new Promise(resolve => setTimeout(resolve, 300))
    }
  }

  const clearResults = () => {
    setResults([])
  }

  const handleClose = () => {
    setIsVisible(false)
    onClose?.()
  }

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg shadow-lg hover:bg-purple-700 transition-colors text-sm font-medium"
        >
          🧪 Settings Debug
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-white">🧪 Settings Debug Panel</h2>
            <p className="text-sm text-gray-400 mt-1">Test all settings_control features</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Controls */}
        <div className="p-4 border-b border-gray-700 flex gap-2">
          <button
            onClick={runAllTests}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <Play className="w-4 h-4" />
            Run All Tests
          </button>
          <button
            onClick={clearResults}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
          >
            Clear Results
          </button>
        </div>

        {/* Quick Tests */}
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-sm font-semibold text-white mb-3">Quick Tests</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button
              onClick={() => runTest('Resolution 1080p', 'settings_control:resolution:1920:1080')}
              className="px-3 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors text-xs"
            >
              🖥️ 1080p
            </button>
            <button
              onClick={() => runTest('Graphics High', 'settings_control:graphics_quality:High')}
              className="px-3 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors text-xs"
            >
              🎮 High
            </button>
            <button
              onClick={() => runTest('Master Vol 80%', 'settings_control:audio_volume:Master:0.8')}
              className="px-3 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors text-xs"
            >
              🔊 Vol 80%
            </button>
            <button
              onClick={() => runTest('FPS Start', 'settings_control:fps_tracking:start')}
              className="px-3 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors text-xs"
            >
              📊 FPS
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-sm font-semibold text-white mb-3">
            Test Results ({results.length})
          </h3>
          {results.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No tests run yet. Click "Run All Tests" to begin.
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((result, index) => (
                <div
                  key={index}
                  className="bg-gray-800 rounded-lg p-3 border border-gray-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-white text-sm">{result.name}</span>
                    <div className="flex items-center gap-2">
                      {result.status === 'sent' && (
                        <span className="flex items-center gap-1 text-xs text-blue-400">
                          <Clock className="w-3 h-3" />
                          Sent
                        </span>
                      )}
                      {result.status === 'success' && (
                        <span className="flex items-center gap-1 text-xs text-green-400">
                          <CheckCircle className="w-3 h-3" />
                          Success
                        </span>
                      )}
                      {result.status === 'failed' && (
                        <span className="flex items-center gap-1 text-xs text-red-400">
                          <XCircle className="w-3 h-3" />
                          Failed
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs font-mono text-gray-400 break-all">
                    {result.message}
                  </div>
                  {result.response && (
                    <div className="mt-2 text-xs font-mono text-green-400 break-all">
                      → {result.response}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-800/50">
          <p className="text-xs text-gray-400">
            💡 <strong>Tip:</strong> Press <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs">Ctrl</kbd> +{' '}
            <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs">Shift</kbd> +{' '}
            <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs">D</kbd> to toggle this panel.
            Check browser console for detailed logs.
          </p>
        </div>
      </div>
    </div>
  )
}
