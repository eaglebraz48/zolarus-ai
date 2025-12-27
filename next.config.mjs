import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/app-build-manifest\.json$/],
});

const nextConfig = {
  experimental: {
    serverActions: {},
  },

  turbopack: {},
};

export default withPWA(nextConfig);
