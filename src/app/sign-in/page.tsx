'use client';

import * as React from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type Lang = 'en' | 'pt' | 'es' | 'fr';
const LANGS: readonly Lang[] = ['en', 'pt', 'es', 'fr'] as const;
const isLang = (v: string | null): v is Lang =>
  !!v && (LANGS as readonly string[]).includes(v as Lang);

const L: Record<Lang, any> = {
  en: {
    title: 'Sign in',
    email: 'Email',
    send: 'Send magic link',
    back: '← Back to home',
    sent: 'Check your email for the login link!',
    password: 'Password',
    signinpw: 'Sign in with password',
  },
  pt: {
    title: 'Entrar',
    email: 'Email',
    send: 'Enviar link mágico',
    back: '← Voltar ao início',
    sent: 'Verifique seu email pelo link de login!',
    password: 'Senha',
    signinpw: 'Entrar com senha',
  },
  es: {
    title: 'Iniciar sesión',
    email: 'Correo',
    send: 'Enviar enlace mágico',
    back: '← Volver al inicio',
    sent: '¡Revisa tu correo para el enlace!',
    password: 'Contraseña',
    signinpw: 'Entrar con contraseña',
  },
  fr: {
    title: 'Se connecter',
    email: 'Email',
    send: 'Envoyer le lien magique',
    back: '← Retour à l’accueil',
    sent: 'Vérifiez votre email pour le lien!',
    password: 'Mot de passe',
    signinpw: 'Connexion avec mot de passe',
  },
};

function PageInner() {
  const sp = useSearchParams();
  const lang = isLang(sp.get('lang')) ? (sp.get('lang') as Lang) : 'en';
  const t = L[lang];

  // email starts empty
  const [email, setEmail] = React.useState<string>('');
  const [password, setPassword] = React.useState<string>(''); // ✅ NEW
  const [status, setStatus] = React.useState<'idle' | 'sent'>('idle');
  const [busy, setBusy] = React.useState(false);

  // MAGIC LINK (unchanged)
  async function send() {
    if (!email || !email.includes('@')) {
      alert('Please enter a valid email.');
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?redirect=/dashboard&lang=${lang}`,
        },
      });

      if (error) {
        alert(`Sign-in error: ${error.message || error}`);
      } else {
        setStatus('sent');
      }
    } catch (err: any) {
      alert(`Unexpected error: ${err?.message ?? String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  // ✅ NEW — PASSWORD LOGIN
  async function loginWithPassword() {
    if (!email || !password) {
      alert("Please enter email and password.");
      return;
    }
    setBusy(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        alert(`Login error: ${error.message}`);
      } else {
        window.location.href = `/dashboard?lang=${lang}`;
      }
    } catch (err: any) {
      alert(`Unexpected error: ${err?.message ?? String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 p-8">
      <h1>{t.title}</h1>

      {status === 'sent' ? (
        <p>{t.sent}</p>
      ) : (
        <>
          {/* Email field */}
          <input
            type="email"
            value={email}
            placeholder={t.email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="email"
            style={{
              width: 256,
              padding: '12px 14px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#000000',
              fontSize: 16,
              outline: 'none',
              boxSizing: 'border-box',
            }}
            className="border p-2 rounded w-64"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !busy) send();
            }}
            disabled={busy}
          />

          {/* Magic Link button */}
          <button
            onClick={send}
            className="px-4 py-2 rounded bg-blue-600 text-white"
            disabled={busy}
            style={{ opacity: busy ? 0.7 : 1 }}
          >
            {busy ? 'Sending…' : t.send}
          </button>

          {/* NEW — Password field */}
          <input
            type="password"
            value={password}
            placeholder={t.password}
            onChange={(e) => setPassword(e.target.value)}
            aria-label="password"
            style={{
              width: 256,
              padding: '12px 14px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#000000',
              fontSize: 16,
              outline: 'none',
              boxSizing: 'border-box',
            }}
            className="border p-2 rounded w-64"
            disabled={busy}
          />

          {/* NEW — Login with password button */}
          <button
            onClick={loginWithPassword}
            className="px-4 py-2 rounded bg-green-600 text-white"
            disabled={busy}
            style={{ opacity: busy ? 0.7 : 1 }}
          >
            {t.signinpw}
          </button>
        </>
      )}

      <Link href={`/?lang=${lang}`} className="opacity-60 text-sm">
        {t.back}
      </Link>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <PageInner />
    </Suspense>
  );
}
