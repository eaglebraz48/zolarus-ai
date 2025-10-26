// src/components/HashAuthBridge.tsx
'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function HashAuthBridge() {
  const ran = useRef(false);
  const router = useRouter();
  const sp = useSearchParams();

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    // Only handle if the URL arrived with a fragment-style token
    if (typeof window === 'undefined') return;
    const hash = window.location.hash || '';
    if (!hash || (!hash.includes('access_token=') && !hash.includes('refresh_token='))) return;

    (async () => {
      try {
        // Parse #key=value&key=value
        const params = new URLSearchParams(hash.replace(/^#/, ''));
        const access_token = params.get('access_token') ?? '';
        const refresh_token = params.get('refresh_token') ?? '';
        const lang = (sp.get('lang') || 'en').toLowerCase();
        const next = sp.get('next') || `/dashboard?lang=${encodeURIComponent(lang)}`;

        if (!access_token || !refresh_token) {
          // If fragment is malformed, punt to sign-in with intended next
          router.replace(`/sign-in?lang=${encodeURIComponent(lang)}&next=${encodeURIComponent(next)}`);
          return;
        }

        // Establish the session from fragment tokens
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) {
          router.replace(`/sign-in?lang=${encodeURIComponent(lang)}&next=${encodeURIComponent(next)}`);
          return;
        }

        // Clean the URL: drop the fragment to avoid re-processing on refresh
        try {
          const clean = new URL(window.location.href);
          clean.hash = '';
          window.history.replaceState({}, '', clean.toString());
        } catch {}

        // Go where we meant to go
        router.replace(next);
      } catch {
        // Quiet fallback: keep current behavior rather than crash
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
