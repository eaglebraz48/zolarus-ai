'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function SignInPage() {
  const sp = useSearchParams();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const lang = (sp.get('lang') ?? 'en').toLowerCase();
  const next = sp.get('next') ?? `/dashboard?lang=${encodeURIComponent(lang)}`;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const base =
      typeof window !== 'undefined' ? window.location.origin : '';
    const emailRedirectTo = `${base}/callback?lang=${encodeURIComponent(lang)}&redirect=${encodeURIComponent(next)}`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo },
    });

    if (error) {
      setErr(error.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <main style={{ maxWidth: 480, margin: '40px auto', padding: 24 }}>
        <h1>Check your email</h1>
        <p>We’ve sent a secure sign-in link to <b>{email}</b>.</p>
        <p>If you open it on this device, you’ll be redirected to your dashboard.</p>
        <button onClick={() => router.replace(`/dashboard?lang=${encodeURIComponent(lang)}`)} style={{ marginTop: 16 }}>
          Go to dashboard
        </button>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 480, margin: '40px auto', padding: 24 }}>
      <h1>Sign in</h1>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12, marginTop: 16 }}>
        <input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: '12px 14px', border: '1px solid #cbd5e1', borderRadius: 8 }}
        />
        <button type="submit" style={{ padding: '12px 14px', borderRadius: 8, background: '#0f172a', color: '#fff', border: 'none' }}>
          Send magic link
        </button>
        {err && <p style={{ color: '#be123c' }}>{err}</p>}
      </form>
    </main>
  );
}
