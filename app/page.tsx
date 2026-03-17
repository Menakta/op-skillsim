"use client";

import dynamic from "next/dynamic";
import Image from "next/image";

// =============================================================================
// Streaming Provider Configuration
// =============================================================================
// Set NEXT_PUBLIC_STREAMING_PROVIDER to switch between providers:
// - "pureweb" (default): Use PureWeb SDK for pixel streaming
// - "interlucent": Use Interlucent SDK for pixel streaming
const STREAMING_PROVIDER = process.env.NEXT_PUBLIC_STREAMING_PROVIDER || "pureweb";

// =============================================================================
// Dynamic Imports - Load the appropriate streaming app based on provider
// =============================================================================

// PureWeb version (default)
// Uses @pureweb/platform-sdk for connection and string message format
const StreamingAppPureWeb = dynamic(() => import("./components/StreamingApp"), {
  ssr: false,
  loading: () => <LoadingPlaceholder />,
});

// Interlucent version
// Uses @interlucent/admission-sdk + CDN web component and JSON message format
const StreamingAppInterlucent = dynamic(() => import("./components/StreamingAppInterlucent"), {
  ssr: false,
  loading: () => <LoadingPlaceholder />,
});

function LoadingPlaceholder() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center space-y-4">
        <Image
          src="/icons/loading.png"
          alt="Loading"
          width={80}
          height={80}
          className="animate-spin-slow"
          style={{ width: 'auto', height: 'auto' }}
          priority
        />
      </div>
    </div>
  );
}

export default function Home() {
  // Log which provider is being used
  if (typeof window !== "undefined") {
    console.log(`🎮 Streaming Provider: ${STREAMING_PROVIDER.toUpperCase()}`);
    console.log(`   ENV: NEXT_PUBLIC_STREAMING_PROVIDER = "${process.env.NEXT_PUBLIC_STREAMING_PROVIDER || '(not set, defaulting to pureweb)'}"`);
  }

  // Return the appropriate streaming app based on the provider configuration
  if (STREAMING_PROVIDER === "interlucent") {
    return <StreamingAppInterlucent />;
  }

  // Default to PureWeb
  return <StreamingAppPureWeb />;
}
