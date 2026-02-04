'use client'

import { useState, useRef, useEffect, memo, useMemo } from 'react'
import type { MessageLogEntry, ParsedMessage } from '../lib/messageTypes'

interface MessageLogProps {
  messages: MessageLogEntry[]
  lastMessage: ParsedMessage | null
  onClear: () => void
  onSendTest?: (message: string) => void
  isConnected: boolean
  connectionStatus: 'disconnected' | 'connecting' | 'connected'
  isDark?: boolean
}

// Accent color
const ACCENT = '#39BEAE'

// Memoized message item to prevent re-renders
const MessageItem = memo(function MessageItem({
  entry,
  isDark,
  formatTimestamp,
}: {
  entry: MessageLogEntry
  isDark: boolean
  formatTimestamp: (ts: number) => string
}) {
  const colors = {
    bgSecondary: isDark ? 'bg-gray-800' : 'bg-gray-100',
    text: isDark ? 'text-white' : 'text-gray-900',
    textSecondary: isDark ? 'text-gray-400' : 'text-gray-600',
  }

  return (
    <div
      className={`p-2 rounded-lg border-l-2 ${
        entry.direction === 'sent'
          ? `${isDark ? 'bg-blue-500/10' : 'bg-blue-50'} border-blue-500`
          : `${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'}`
      }`}
      style={entry.direction === 'received' ? { borderColor: ACCENT } : {}}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className="text-[10px] font-bold"
          style={{ color: entry.direction === 'sent' ? '#3b82f6' : ACCENT }}
        >
          {entry.direction === 'sent' ? '↑ SENT' : '↓ RECV'}
        </span>
        <span className={`${colors.textSecondary} text-[10px]`}>
          {formatTimestamp(entry.timestamp)}
        </span>
        <span className={`px-1.5 py-0.5 ${colors.bgSecondary} ${colors.textSecondary} text-[10px] rounded`}>
          {entry.type}
        </span>
      </div>
      <div className={`${colors.text} whitespace-pre-wrap break-all overflow-hidden`}>
        <span style={{ color: ACCENT }}>{entry.type}</span>
        {entry.data && (
          <>
            <span className={colors.textSecondary}>:</span>
            <span className="text-cyan-500">{entry.data}</span>
          </>
        )}
      </div>
    </div>
  )
})

function MessageLogComponent({
  messages,
  lastMessage,
  onClear,
  onSendTest,
  isConnected,
  connectionStatus,
  isDark = true
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

  // Auto-scroll to latest message - only when length changes
  const messagesLength = messages.length
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = 0
    }
  }, [messagesLength, autoScroll])

  // Memoize filtered messages
  const filteredMessages = useMemo(() => {
    return messages.filter(m => {
      if (filter === 'all') return true
      return m.direction === filter
    })
  }, [messages, filter])

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

  // Theme colors
  const colors = {
    bg: isDark ? 'bg-gray-900/95' : 'bg-white/95',
    bgSecondary: isDark ? 'bg-gray-800' : 'bg-gray-100',
    border: isDark ? 'border-gray-700' : 'border-gray-200',
    text: isDark ? 'text-white' : 'text-gray-900',
    textSecondary: isDark ? 'text-gray-400' : 'text-gray-600'
  }

  const getConnectionColor = () => {
    switch (connectionStatus) {
      case 'connected': return ACCENT
      case 'connecting': return '#eab308'
      default: return '#ef4444'
    }
  }

  // Minimized view - just a small indicator
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-4 left-4 z-50 flex items-center gap-2 px-4 py-2.5 ${colors.bg} backdrop-blur-sm ${colors.border} border rounded-xl hover:scale-105 transition-all shadow-lg`}
      >
        <div
          className={`w-2 h-2 rounded-full ${connectionStatus === 'connecting' ? 'animate-pulse' : ''}`}
          style={{ backgroundColor: getConnectionColor() }}
        />
        <span className={`${colors.text} text-sm font-medium`}>Messages</span>
        {messages.length > 0 && (
          <span
            className="px-2 py-0.5 text-white text-xs rounded-full"
            style={{ backgroundColor: ACCENT }}
          >
            {messages.length}
          </span>
        )}
      </button>
    )
  }

  return (
    <div
      className={`fixed bottom-4 left-4 z-50 ${colors.bg} backdrop-blur-md ${colors.border} border rounded-xl shadow-2xl transition-all duration-300 ${
        isMinimized ? 'w-80 h-12' : 'w-[500px] h-[450px]'
      }`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-2 ${colors.border} border-b`}>
        <div className="flex items-center gap-3">
          <div
            className={`w-2 h-2 rounded-full ${connectionStatus === 'connecting' ? 'animate-pulse' : ''}`}
            style={{ backgroundColor: getConnectionColor() }}
          />
          <span className={`${colors.text} font-medium text-sm`}>Message Log</span>
          <span className={colors.textSecondary} style={{ fontSize: '11px' }}>
            {connectionStatus === 'connected' ? 'Live' : connectionStatus}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className={`p-1.5 ${colors.textSecondary} hover:${colors.text} rounded transition-colors`}
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
            className={`p-1.5 ${colors.textSecondary} hover:${colors.text} rounded transition-colors`}
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
          <div className={`flex items-center gap-2 px-4 py-2 ${colors.border} border-b`}>
            {/* Filter buttons */}
            <div className={`flex items-center gap-1 ${colors.bgSecondary} rounded-lg p-0.5`}>
              {(['all', 'sent', 'received'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    filter === f
                      ? 'text-white'
                      : `${colors.textSecondary} hover:${colors.text}`
                  }`}
                  style={filter === f ? { backgroundColor: ACCENT } : {}}
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
                autoScroll ? '' : `${colors.textSecondary} hover:${colors.text}`
              }`}
              style={autoScroll ? { color: ACCENT, backgroundColor: `${ACCENT}20` } : {}}
              title={autoScroll ? 'Auto-scroll on' : 'Auto-scroll off'}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>

            {/* Clear button */}
            <button
              onClick={onClear}
              className={`p-1.5 ${colors.textSecondary} hover:text-red-400 rounded transition-colors`}
              title="Clear log"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>

          {/* Quick Send Presets */}
          <div className={`flex flex-wrap gap-1 px-4 py-2 ${colors.border} border-b`}>
            {presetMessages.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handlePresetClick(preset.msg)}
                className={`px-2 py-1 ${colors.bgSecondary} ${colors.textSecondary} text-xs rounded transition-all hover:scale-105`}
                style={{ ':hover': { backgroundColor: ACCENT } } as React.CSSProperties}
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
              <div className={`flex items-center justify-center h-full ${colors.textSecondary}`}>
                No messages yet
              </div>
            ) : (
              filteredMessages.map((entry) => (
                <MessageItem
                  key={entry.id}
                  entry={entry}
                  isDark={isDark}
                  formatTimestamp={formatTimestamp}
                />
              ))
            )}
          </div>

          {/* Test message input */}
          {onSendTest && (
            <div className={`p-2 ${colors.border} border-t`}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendTest()}
                  placeholder="type:data (e.g. training_control:start)"
                  className={`flex-1 px-3 py-2 ${colors.bgSecondary} ${colors.border} border rounded-lg ${colors.text} text-xs font-mono placeholder-gray-500 focus:outline-none`}
                  style={{ borderColor: 'transparent' }}
                  onFocus={(e) => e.target.style.borderColor = ACCENT}
                  onBlur={(e) => e.target.style.borderColor = 'transparent'}
                />
                <button
                  onClick={handleSendTest}
                  disabled={!testMessage.trim()}
                  className="px-4 py-2 text-white text-xs font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:opacity-90"
                  style={{ backgroundColor: ACCENT }}
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {/* Last message indicator */}
          {lastMessage && (
            <div
              className="absolute -top-10 left-0 px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: `${ACCENT}20`, border: `1px solid ${ACCENT}40` }}
            >
              <span className="text-xs font-mono" style={{ color: ACCENT }}>
                Last: {lastMessage.type}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Export memoized component
export default memo(MessageLogComponent)
