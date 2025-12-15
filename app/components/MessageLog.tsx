'use client'

import { useState, useRef, useEffect } from 'react'
import type { MessageLogEntry, ParsedMessage } from '../lib/messageTypes'

interface MessageLogProps {
  messages: MessageLogEntry[]
  lastMessage: ParsedMessage | null
  onClear: () => void
  onSendTest?: (message: string) => void
  isConnected: boolean
  connectionStatus: 'disconnected' | 'connecting' | 'connected'
}

export default function MessageLog({
  messages,
  lastMessage,
  onClear,
  onSendTest,
  isConnected,
  connectionStatus
}: MessageLogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [testMessage, setTestMessage] = useState('')
  const [filter, setFilter] = useState<'all' | 'sent' | 'received'>('all')
  const [autoScroll, setAutoScroll] = useState(true)
  const logContainerRef = useRef<HTMLDivElement>(null)

  // Quick message presets
  const presetMessages = [
    { label: 'Start', msg: 'training_control:start' },
    { label: 'Reset', msg: 'training_control:reset' },
    { label: 'Test', msg: 'training_control:test' },
    { label: 'XRay', msg: 'tool_select:XRay' },
    { label: 'Shovel', msg: 'tool_select:Shovel' },
    { label: 'Layers', msg: 'hierarchical_control:list' },
    { label: 'Waypoints', msg: 'waypoint_control:list' },
    { label: 'Camera', msg: 'camera_control:IsometricNE' }
  ]

  // Auto-scroll to latest message
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = 0
    }
  }, [messages, autoScroll])

  const filteredMessages = messages.filter(m => {
    if (filter === 'all') return true
    return m.direction === filter
  })

  const handleSendTest = () => {
    if (testMessage.trim() && onSendTest) {
      onSendTest(testMessage)
      setTestMessage('')
    }
  }

  const handlePresetClick = (msg: string) => {
    if (onSendTest) {
      onSendTest(msg)
    }
  }

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts)
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }) + '.' + date.getMilliseconds().toString().padStart(3, '0')
  }

  const getConnectionColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500'
      case 'connecting': return 'bg-yellow-500 animate-pulse'
      default: return 'bg-red-500'
    }
  }

  // Minimized view - just a small indicator
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-50 flex items-center gap-2 px-3 py-2 bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors"
      >
        <div className={`w-2 h-2 rounded-full ${getConnectionColor()}`} />
        <span className="text-white/80 text-sm font-mono">Messages</span>
        {messages.length > 0 && (
          <span className="px-1.5 py-0.5 bg-indigo-500/30 text-indigo-300 text-xs rounded">
            {messages.length}
          </span>
        )}
      </button>
    )
  }

  return (
    <div
      className={`fixed bottom-4 left-4 z-50 bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl transition-all duration-300 ${
        isMinimized ? 'w-80 h-12' : 'w-[500px] h-[450px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${getConnectionColor()}`} />
          <span className="text-white font-medium text-sm">Message Log</span>
          <span className="text-gray-500 text-xs">
            {connectionStatus === 'connected' ? 'Live' : connectionStatus}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 text-gray-400 hover:text-white rounded transition-colors"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d={isMinimized ? 'M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4' : 'M20 12H4'}
              />
            </svg>
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 text-gray-400 hover:text-white rounded transition-colors"
            title="Close"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Toolbar */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-800">
            {/* Filter buttons */}
            <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-0.5">
              {(['all', 'sent', 'received'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    filter === f
                      ? 'bg-indigo-500 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'sent' ? '↑ Sent' : '↓ Recv'}
                </button>
              ))}
            </div>

            <div className="flex-1" />

            {/* Auto-scroll toggle */}
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`p-1.5 rounded transition-colors ${
                autoScroll ? 'text-indigo-400 bg-indigo-500/20' : 'text-gray-400 hover:text-white'
              }`}
              title={autoScroll ? 'Auto-scroll on' : 'Auto-scroll off'}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>

            {/* Clear button */}
            <button
              onClick={onClear}
              className="p-1.5 text-gray-400 hover:text-red-400 rounded transition-colors"
              title="Clear log"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>

          {/* Quick Send Presets */}
          <div className="flex flex-wrap gap-1 px-4 py-2 border-b border-gray-800">
            {presetMessages.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handlePresetClick(preset.msg)}
                className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded transition-colors"
                title={preset.msg}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div
            ref={logContainerRef}
            className="h-[calc(100%-180px)] overflow-y-auto p-2 space-y-1 font-mono text-xs"
          >
            {filteredMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                No messages yet
              </div>
            ) : (
              filteredMessages.map((entry) => (
                <div
                  key={entry.id}
                  className={`p-2 rounded-lg ${
                    entry.direction === 'sent'
                      ? 'bg-blue-500/10 border-l-2 border-blue-500'
                      : 'bg-green-500/10 border-l-2 border-green-500'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold ${
                      entry.direction === 'sent' ? 'text-blue-400' : 'text-green-400'
                    }`}>
                      {entry.direction === 'sent' ? '↑ SENT' : '↓ RECV'}
                    </span>
                    <span className="text-gray-500 text-[10px]">
                      {formatTimestamp(entry.timestamp)}
                    </span>
                    <span className="px-1.5 py-0.5 bg-gray-700 text-gray-300 text-[10px] rounded">
                      {entry.type}
                    </span>
                  </div>
                  <div className="text-gray-300 whitespace-pre-wrap break-all overflow-hidden">
                    <span className="text-yellow-400">{entry.type}</span>
                    {entry.data && (
                      <>
                        <span className="text-gray-500">:</span>
                        <span className="text-cyan-400">{entry.data}</span>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Test message input */}
          {onSendTest && (
            <div className="p-2 border-t border-gray-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendTest()}
                  placeholder="type:data (e.g. training_control:start)"
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs font-mono placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleSendTest}
                  disabled={!testMessage.trim()}
                  className="px-4 py-2 bg-indigo-500 text-white text-xs font-medium rounded-lg hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {/* Last message indicator */}
          {lastMessage && (
            <div className="absolute -top-10 left-0 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-lg">
              <span className="text-green-400 text-xs font-mono">
                Last: {lastMessage.type}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
