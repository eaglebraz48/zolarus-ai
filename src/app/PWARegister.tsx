'use client';

import { useEffect } from 'react';

export default function PWARegister() {
  useEffect(() => {
    // Only register the service worker in production builds.
    if (process.env.NODE_ENV !== 'production') return;

    // next-pwa will define __PWA_START_URL__ during prod build.
    import('next-pwa/register').catch(() => {
      // ignore if something goes wrong; don't crash the app
    });
  }, []);

  return null;
}
