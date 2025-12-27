'use client';

import { useEffect } from 'react';

export default function PWARegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;

    // 🔹 Force service worker refresh on every deploy
    const SW_VERSION = '2025-10-26-01'; // bump this with each deploy
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register(`/sw.js?v=${SW_VERSION}`)
        .then((r) => console.log('SW registered:', r.scope))
        .catch((err) => console.warn('SW registration failed:', err));
    }

    // keep next-pwa compatibility
    import('next-pwa/register').catch(() => {
      // ignore if something goes wrong; don't crash the app
    });
  }, []);

  return null;
}
