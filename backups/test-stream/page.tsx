'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { PlatformNext, ModelDefinition } from '@pureweb/platform-sdk'
import ControlPanel from '../components/ControlPanel'
import PureWebStream, { PureWebStreamHandle } from '../components/PureWebStream'
import type { TrainingControlAction } from '../lib/messageTypes'

type Status =
  | 'checking'
  | 'authenticated'
  | 'stream-ready'
  | 'unauthorized'
  | 'error'
  | 'expired'

export default function TestStream() {
  const router = useRouter()
  const streamRef = useRef<PureWebStreamHandle>(null)
  const [status, setStatus] = useState<Status>('checking')
  const [progress, setProgress] = useState(0)
  const [userName, setUserName] = useState<string>('')
  const [platform, setPlatform] = useState<PlatformNext | null>(null)
  const [modelDefinition, setModelDefinition] = useState<ModelDefinition | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')

  useEffect(() => {
    async function initStream() {
      try {
        // Step 1: Validate existing session
        setProgress(20)
        const validateRes = await fetch('/api/auth/validate', {
          credentials: 'include'
        })

        if (!validateRes.ok) {
          setStatus('unauthorized')
          return
        }

        const validateJson = await validateRes.json()
        if (!validateJson.valid) {
          setStatus('unauthorized')
          return
        }

        setStatus('authenticated')
        setUserName(validateJson.payload?.sub || 'Test User')
        setProgress(40)

        // Step 2: Initialize PureWeb Platform
        const p = new PlatformNext()
        p.initialize({
          endpoint: 'https://api.pureweb.io'
        })

        // Step 3: Get credentials from our API
        const credRes = await fetch('/api/stream/credentials', {
          method: 'POST',
          credentials: 'include'
        })

        if (!credRes.ok) {
          throw new Error('Failed to get stream credentials')
        }

        const credJson = await credRes.json()
        setProgress(60)

        // Step 4: Use anonymous credentials with our project
        await p.useAnonymousCredentials(
          credJson.projectId,
          credJson.environmentId
        )

        setProgress(80)

        // Step 5: Get the model definition
        const models = await p.getModels()
        const model = models.find(m => m.id === credJson.modelId) || models[0]

        if (!model) {
          throw new Error('No model available')
        }

        setPlatform(p)
        setModelDefinition(model)
        setProgress(100)
        setTimeout(() => setStatus('stream-ready'), 500)

      } catch (err) {
        console.error('Stream init error', err)
        setStatus('error')
      }
    }

    initStream()

    return () => {
      platform?.disconnect()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Heartbeat validation loop
  useEffect(() => {
    if (status === 'stream-ready') {
      const id = setInterval(async () => {
        try {
          const res = await fetch('/api/auth/validate', {
            credentials: 'include'
          })
          if (!res.ok) {
            setStatus('expired')
          } else {
            const json = await res.json()
            if (!json.valid) {
              setStatus('expired')
            }
          }
        } catch {
          setStatus('expired')
        }
      }, 30_000)
      return () => clearInterval(id)
    }
  }, [status])

  const handleLogout = () => {
    document.cookie = 'access_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    router.push('/test-login')
  }

  const handleRetry = () => {
    window.location.reload()
  }

  const handleConnectionChange = useCallback((connected: boolean, connStatus: 'disconnected' | 'connecting' | 'connected') => {
    setIsConnected(connected)
    setConnectionStatus(connStatus)
  }, [])

  const handleMessage = useCallback((message: string) => {
    console.log('Received UE5 message:', message)
  }, [])

  // Control panel handlers
  const handleTrainingControl = useCallback((action: TrainingControlAction) => {
    streamRef.current?.trainingControl(action)
  }, [])

  const handleToolChange = useCallback((toolId: string) => {
    streamRef.current?.requestToolChange(toolId)
  }, [])

  const handleToolOperation = useCallback((toolId: string, operation: string, params?: Record<string, unknown>) => {
    streamRef.current?.executeToolOperation(toolId, operation, params)
  }, [])

  const handleCameraChange = useCallback((viewId: string) => {
    streamRef.current?.setCameraView(viewId)
  }, [])

  const handleRequestProgress = useCallback(() => {
    streamRef.current?.requestProgress()
  }, [])

  // Checking auth state
  if (status === 'checking' || status === 'authenticated') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-950 flex items-center justify-center">
        <div className="text-center space-y-8">
          <div className="space-y-2">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">OP Skillsim</h1>
            <p className="text-gray-400 text-sm">
              {status === 'checking' ? 'Verifying session...' : 'Preparing your stream...'}
            </p>
          </div>

          <div className="w-72 mx-auto">
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-3 flex justify-between text-xs text-gray-500">
              <span className={progress >= 20 ? 'text-indigo-400' : ''}>Validating</span>
              <span className={progress >= 50 ? 'text-indigo-400' : ''}>Connecting</span>
              <span className={progress >= 80 ? 'text-indigo-400' : ''}>Loading</span>
            </div>
          </div>

          <div className="flex justify-center gap-1.5">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    )
  }

  // Unauthorized - redirect to login
  if (status === 'unauthorized') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-950 flex items-center justify-center">
        <div className="text-center space-y-6 p-8">
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Session Required</h2>
            <p className="text-gray-400 mt-2 text-sm">Please log in to access the simulation</p>
          </div>
          <button
            onClick={() => router.push('/test-login')}
            className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-950 flex items-center justify-center">
        <div className="text-center space-y-6 p-8">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Something went wrong</h2>
            <p className="text-gray-400 mt-2 text-sm">We couldn&apos;t start the simulation</p>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRetry}
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
            >
              Try Again
            </button>
            <button
              onClick={handleLogout}
              className="px-6 py-2.5 bg-gray-800 text-white font-medium rounded-lg hover:bg-gray-700 transition-all duration-200 border border-gray-700"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Expired state
  if (status === 'expired') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-950 flex items-center justify-center">
        <div className="text-center space-y-6 p-8">
          <div className="w-16 h-16 mx-auto rounded-full bg-blue-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Session Expired</h2>
            <p className="text-gray-400 mt-2 text-sm">Your session has timed out for security</p>
          </div>
          <button
            onClick={() => router.push('/test-login')}
            className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
          >
            Login Again
          </button>
        </div>
      </div>
    )
  }

  // Stream ready - PureWeb SDK stream with control panel
  return (
    <div className="h-screen w-screen bg-gray-950 relative overflow-hidden">
      {status === 'stream-ready' && platform && modelDefinition && (
        <>
          {/* Control Panel - NOTE: This page uses the old interface
              The main page.tsx has been updated with the new player(2).html message protocol.
              This test-stream page needs to be migrated to use the new useTrainingMessages hook.
          <ControlPanel
            onTrainingControl={handleTrainingControl}
            onToolChange={handleToolChange}
            onToolOperation={handleToolOperation}
            onCameraChange={handleCameraChange}
            onRequestProgress={handleRequestProgress}
            isConnected={isConnected}
            connectionStatus={connectionStatus}
          />
          */}

          {/* PureWeb Stream */}
          <div className="w-full h-full">
            <PureWebStream
              ref={streamRef}
              platform={platform}
              modelDefinition={modelDefinition}
              onMessage={handleMessage}
              onConnectionChange={handleConnectionChange}
              className="w-full h-full"
            />
          </div>

          {/* Top overlay controls */}
          <div className="absolute top-4 left-16 right-4 flex justify-between items-center pointer-events-none">
            {/* User info */}
            <div className="flex items-center gap-3 px-3 py-2 bg-black/50 backdrop-blur-sm rounded-lg pointer-events-auto">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center">
                <span className="text-white text-xs font-medium">
                  {userName.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-white/80 text-sm">{userName}</span>
              <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-white/20">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-xs text-gray-400">{isConnected ? 'Live' : 'Connecting'}</span>
              </div>
            </div>

            {/* Right controls */}
            <div className="flex gap-2 pointer-events-auto">
              <button
                onClick={() => document.documentElement.requestFullscreen()}
                className="p-2 bg-black/50 backdrop-blur-sm rounded-lg text-white/70 hover:text-white hover:bg-black/70 transition-all"
                title="Fullscreen"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
              <button
                onClick={handleLogout}
                className="p-2 bg-red-500/50 backdrop-blur-sm rounded-lg text-white/70 hover:text-white hover:bg-red-500/70 transition-all"
                title="Logout"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
