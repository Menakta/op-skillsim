"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
// Dynamically import the StreamingApp component with SSR disabled
// This prevents the PureWeb SDK (which uses Node.js modules like tls, fs, net)
// from being bundled on the server side
const StreamingApp = dynamic(() => import("./components/StreamingApp"), {
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
        />
      </div>
    </div>
  );
}

export default function Home() {
  return <StreamingApp />;
}
