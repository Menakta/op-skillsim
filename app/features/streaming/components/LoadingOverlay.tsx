'use client'

import { LaunchStatusType, StreamerStatus } from '@pureweb/platform-sdk'

// =============================================================================
// Props Interface
// =============================================================================

interface LoadingOverlayProps {
  streamerStatus: StreamerStatus
  launchStatus: LaunchStatusType
  isVisible: boolean
}

// =============================================================================
// Component
// =============================================================================

export function LoadingOverlay({
  streamerStatus,
  launchStatus,
  isVisible
}: LoadingOverlayProps) {
  if (!isVisible) return null

  const getStatusMessage = () => {
    if (launchStatus === LaunchStatusType.Queued) return 'In queue...'
    if (launchStatus === LaunchStatusType.Requested) return 'Starting stream...'
    if (streamerStatus === StreamerStatus.New) return 'Initializing...'
    if (streamerStatus === StreamerStatus.Checking) return 'Connecting...'
    return 'Loading...'
  }

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-950">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 mx-auto border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400">{getStatusMessage()}</p>
        <p className="text-gray-600 text-xs">
          Launch: {launchStatus} | Stream: {streamerStatus}
        </p>
      </div>
    </div>
  )
}

export default LoadingOverlay
