import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empty turbopack config to use Turbopack (Next.js 16 default)
  turbopack: {},

  // Webpack config for handling Node.js modules that can't run in browser
  // This is kept for backwards compatibility but Turbopack is used by default
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        tls: false,
        net: false,
        dns: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        buffer: false,
      };
    }
    return config;
  },
};

export default nextConfig;
