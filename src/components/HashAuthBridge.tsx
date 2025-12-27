'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function HashAuthBridge() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes('access_token=')) return;

    const params = new URLSearchParams(hash.replace('#',''));
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');

    if (access_token && refresh_token) {
      supabase.auth.setSession({ access_token, refresh_token });
    }

    history.replaceState({}, '', window.location.pathname + window.location.search);
  }, []);

  return null;
}
