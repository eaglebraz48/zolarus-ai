// src/app/auth/callback/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const redirect = sp.get('redirect') || '/dashboard';

  useEffect(() => {
    const hash = window.location.hash;

    if (!hash || !hash.includes('access_token')) {
      router.replace(redirect);
      return;
    }

    const params = new URLSearchParams(hash.replace('#', ''));
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');

    if (!access_token || !refresh_token) {
      router.replace(redirect);
      return;
    }

    (async () => {
      await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      window.history.replaceState({}, '', redirect);
      router.replace(redirect);
    })();
  }, [router, redirect]);

  return <div style={{ padding: 24 }}>Signing you in…</div>;
}
