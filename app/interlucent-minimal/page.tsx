'use client'

/**
 * Minimal Interlucent Test Page
 *
 * This is the simplest possible implementation to isolate connection issues.
 * Access at: /interlucent-minimal
 */

import { useEffect, useState, useRef } from 'react'
import Script from 'next/script'

export default function InterlucientMinimalPage() {
  const [token, setToken] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('idle')
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [`[${timestamp}] ${msg}`, ...prev].slice(0, 50))
    console.log(msg)
  }

  // Fetch token on mount
  useEffect(() => {
    async function fetchToken() {
      try {
        addLog('Fetching admission token...')

        // Try to get publishable token from env first (for testing)
        const publishableToken = process.env.NEXT_PUBLIC_INTERLUCENT_PUBLISHABLE_TOKEN
        if (publishableToken) {
          addLog('Using publishable token from env')
          setToken(publishableToken)
          return
        }

        const res = await fetch('/api/stream/interlucent-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        })
        const data = await res.json()

        if (data.error) {
          throw new Error(data.error)
        }

        addLog(`Token received (mode: ${data.mode}, appId: ${data.appId})`)
        addLog(`Token preview: ${data.token.substring(0, 50)}...`)
        setToken(data.token)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to fetch token'
        addLog(`ERROR: ${msg}`)
        setError(msg)
      }
    }
    fetchToken()
  }, [])

  // Setup pixel-stream after script loads and token is ready
  useEffect(() => {
    if (!scriptLoaded || !token || !containerRef.current) return

    addLog('Creating pixel-stream element...')

    // Create element
    const ps = document.createElement('pixel-stream') as any
    ps.style.width = '100%'
    ps.style.height = '100%'

    // Set attributes
    ps.setAttribute('controls', '')
    ps.setAttribute('swift-job-request', '')
    ps.setAttribute('reconnect-mode', 'recover')
    ps.setAttribute('reconnect-attempts', '-1')
    ps.setAttribute('queue-wait-tolerance', '60')
    ps.setAttribute('rendezvous-tolerance', '30')
    ps.setAttribute('flexible-presence-allowance', '120')
    ps.setAttribute('linger-tolerance', '30')
    ps.setAttribute('force-relay', '') // Force TURN relay to bypass DPI firewalls

    // Status change listener
    ps.addEventListener('status-change', (e: CustomEvent) => {
      const { newStatus, oldStatus } = e.detail
      addLog(`Status: ${oldStatus} → ${newStatus}`)
      setStatus(newStatus)

      // Log debug info - check both property and attribute
      addLog(`  isAdmitted (prop): ${ps.isAdmitted}`)
      addLog(`  isAdmitted (typeof): ${typeof ps.isAdmitted}`)
      addLog(`  sessionId: ${ps.sessionId || 'none'}`)
      addLog(`  agentId: ${ps.agentId || 'none'}`)
      addLog(`  failureReason: ${ps.failureReason || 'none'}`)

      if (newStatus === 'streaming') {
        addLog(`  streamStartedAt: ${ps.streamStartedAt}`)
      }

      if (newStatus === 'interrupted' && ps.streamStartedAt) {
        const duration = Date.now() - ps.streamStartedAt
        addLog(`  ⏱️ Stream was active for ${duration}ms`)
      }
    })

    ps.addEventListener('data-channel-open', () => {
      addLog('Data channel OPEN')
    })

    ps.addEventListener('session-ready', (e: CustomEvent) => {
      addLog(`Session ready: ${e.detail?.sessionId}`)
    })

    ps.addEventListener('session-ended', (e: CustomEvent) => {
      addLog(`Session ended: ${e.detail?.reason}`)
    })

    ps.addEventListener('ue-command-response', (e: CustomEvent) => {
      addLog(`UE message: ${JSON.stringify(e.detail).substring(0, 100)}`)
    })

    ps.addEventListener('transport-selected', (e: CustomEvent) => {
      const turnUsed = e.detail?.turnUsed ?? false
      addLog(turnUsed ? '🔄 Transport: RELAY (TURN over TLS)' : '🔗 Transport: DIRECT (P2P UDP)')
    })

    // Send periodic keep-alive ping when streaming
    let keepAliveInterval: NodeJS.Timeout | null = null
    ps.addEventListener('status-change', (e: CustomEvent) => {
      if (e.detail.newStatus === 'streaming') {
        addLog('Starting keep-alive ping every 3 seconds...')
        keepAliveInterval = setInterval(() => {
          try {
            // Send a simple ping message to UE5
            ps.sendUIInteraction({ type: 'ping', timestamp: Date.now() })
            addLog('📤 Sent keep-alive ping')
          } catch (err) {
            addLog(`Ping error: ${err}`)
          }
        }, 3000)
      } else if (e.detail.newStatus === 'interrupted' || e.detail.newStatus === 'ended') {
        if (keepAliveInterval) {
          clearInterval(keepAliveInterval)
          keepAliveInterval = null
          addLog('Stopped keep-alive ping')
        }
      }
    })

    // Add to DOM
    containerRef.current.innerHTML = ''
    containerRef.current.appendChild(ps)

    // Set token
    addLog('Setting admission token...')
    ps.admissionToken = token

    addLog('Waiting for user to click play (or auto-connect)...')

  }, [scriptLoaded, token])

  return (
    <div className="h-screen w-screen flex bg-black text-white">
      {/* Load CDN Script */}
      <Script
        src="https://cdn.interlucent.ai/dev/pixel-stream/0.0.73/pixel-stream.iife.min.js"
        strategy="afterInteractive"
        onLoad={() => {
          addLog('pixel-stream script loaded')
          setScriptLoaded(true)
        }}
        onError={() => {
          addLog('ERROR: Failed to load pixel-stream script')
          setError('Failed to load streaming component')
        }}
      />

      {/* Stream container - left side */}
      <div className="flex-1 relative">
        <div ref={containerRef} className="absolute inset-0" />

        {/* Status overlay */}
        <div className="absolute top-4 left-4 bg-black/80 p-4 rounded-lg">
          <h2 className="text-lg font-bold mb-2">Minimal Test</h2>
          <p>Status: <span className={status === 'streaming' ? 'text-green-400' : 'text-yellow-400'}>{status}</span></p>
          {error && <p className="text-red-400">Error: {error}</p>}
        </div>
      </div>

      {/* Log panel - right side */}
      <div className="w-96 bg-gray-900 p-4 overflow-auto">
        <h2 className="text-lg font-bold mb-2 sticky top-0 bg-gray-900">Logs</h2>
        <div className="text-xs font-mono space-y-1">
          {logs.map((log, i) => (
            <div key={i} className={
              log.includes('ERROR') ? 'text-red-400' :
              log.includes('Status:') ? 'text-blue-400' :
              log.includes('OPEN') ? 'text-green-400' :
              'text-gray-400'
            }>
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
