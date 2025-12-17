import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Webpack config for handling Node.js modules that can't run in browser
  // PureWeb SDK depends on aws-iot-device-sdk which requires Node.js modules
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
