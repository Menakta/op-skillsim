import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output:'standalone',
  // Allow cross-origin requests from LTI providers (ngrok, SaLTire, iQualify)
  allowedDevOrigins: [
    'saltire.lti.app',
    'https://saltire.lti.app',
    '*.ngrok-free.dev',
    '*.iqualify.com',
  ],

  // Allow Server Actions from external origins (LTI iframe embedding)
  experimental: {
    serverActions: {
      allowedOrigins: [
        'saltire.lti.app',
        'localhost:3000',
        '*.ngrok-free.dev',
        '*.iqualify.com',
      ],
    },
  },

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

  async headers() {
  return [
    {
      source: '/dashboard/:path*',
      headers: [
        { key: 'Content-Security-Policy', value: "frame-ancestors 'self' https://*.iqualify.com https://saltire.lti.app" },
      ],
    },
  ]
}
};

export default nextConfig;
