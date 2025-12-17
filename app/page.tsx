'use client'

import dynamic from 'next/dynamic'

// Dynamically import the StreamingApp component with SSR disabled
// This prevents the PureWeb SDK (which uses Node.js modules like tls, fs, net)
// from being bundled on the server side
const StreamingApp = dynamic(
  () => import('./components/StreamingApp'),
  {
    ssr: false,
    loading: () => <LoadingPlaceholder />
  }
)

function LoadingPlaceholder() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center space-y-4">
        <div className="w-14 h-14 mx-auto border-4 border-[#39BEAE] border-t-transparent rounded-full animate-spin" />
        <p className="font-medium text-white">Loading Application...</p>
      </div>
    </div>
  )
}

export default function Home() {
  return <StreamingApp />
}
