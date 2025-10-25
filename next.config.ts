// next.config.ts
import type { NextConfig } from 'next';
import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  // 👇 add this line
  buildExcludes: [/app-build-manifest\.json$/],
});

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {},
  },
  eslint: { ignoreDuringBuilds: true },
};

export default withPWA(nextConfig);
