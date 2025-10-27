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

    if (typeof window === 'undefined') return;
    const hash = window.location.hash || '';
    const hasTokens = hash.includes('access_token=') || hash.includes('refresh_token=');
    if (!hasTokens) return;

    (async () => {
      try {
        const params = new URLSearchParams(hash.replace(/^#/, ''));
        const access_token = params.get('access_token') ?? '';
        const refresh_token = params.get('refresh_token') ?? '';

        const langRaw = sp?.get?.('lang') || 'en';
        const lang = String(langRaw).toLowerCase();
        const next =
          sp?.get?.('next') || `/dashboard?lang=${encodeURIComponent(lang)}`;

        if (!access_token || !refresh_token) {
          router.replace(`/sign-in?lang=${encodeURIComponent(lang)}&next=${encodeURIComponent(next)}`);
          return;
        }

        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) {
          router.replace(`/sign-in?lang=${encodeURIComponent(lang)}&next=${encodeURIComponent(next)}`);
          return;
        }

        // Clean fragment so refreshes don’t re-run the bridge
        try {
          const clean = new URL(window.location.href);
          clean.hash = '';
          window.history.replaceState({}, '', clean.toString());
        } catch {
          /* ignore */
        }

        router.replace(next);
      } catch {
        // Silent fail → leave user on current page rather than crash
      }
    })();
  }, [router, sp]);

  return null;
}
