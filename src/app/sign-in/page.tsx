'use client';

import * as React from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

type Lang = 'en' | 'pt' | 'es' | 'fr';
const LANGS: readonly Lang[] = ['en', 'pt', 'es', 'fr'] as const;
const isLang = (v: string | null): v is Lang =>
  !!v && (LANGS as readonly string[]).includes(v as Lang);

const L: Record<Lang, any> = {
  en: {
    title: 'Sign in',
    email: 'Email',
    send: 'Email me a sign-in link',
    back: '← Back to home',
    sent: 'Check your email for the login link!',
    password: 'Password (reviewers only)',
    signinpw: 'Sign in with password',
    guest: 'Continue as guest',
  },
  pt: {
    title: 'Entrar',
    email: 'Email',
    send: 'Envie-me um link de acesso por email',
    back: '← Voltar ao início',
    sent: 'Verifique seu email pelo link!',
    password: 'Senha (somente revisores)',
    signinpw: 'Entrar com senha',
    guest: 'Entrar como convidado',
  },
  es: {
    title: 'Iniciar sesión',
    email: 'Correo',
    send: 'Envíame un enlace de acceso por correo',
    back: '← Volver al inicio',
    sent: '¡Revisa tu correo para el enlace!',
    password: 'Contraseña (solo revisores)',
    signinpw: 'Entrar con contraseña',
    guest: 'Entrar como invitado',
  },
  fr: {
    title: 'Se connecter',
    email: 'Email',
    send: 'Envoyez-moi un lien de connexion par e-mail',
    back: '← Retour à l’accueil',
    sent: 'Vérifiez votre email pour le lien!',
    password: 'Mot de passe (examinateurs)',
    signinpw: 'Connexion avec mot de passe',
    guest: 'Continuer en tant qu’invité',
  },
};

function PageInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const lang = isLang(sp.get('lang')) ? (sp.get('lang') as Lang) : 'en';
  const t = L[lang];

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [status, setStatus] = React.useState<'idle' | 'sent'>('idle');
  const [busy, setBusy] = React.useState(false);

  async function sendMagicLink() {
    if (!email || !email.includes('@')) {
      alert('Please enter a valid email.');
      return;
    }

    setBusy(true);
    try {
      const redirectTarget = encodeURIComponent(`/dashboard?lang=${lang}`);

      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          redirectTo: `${window.location.origin}/auth/callback?redirect=${redirectTarget}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStatus('sent');
    } catch (err: any) {
      alert(err?.message ?? 'Unexpected error.');
    } finally {
      setBusy(false);
    }
  }

  async function reviewerLogin() {
    if (!email || !password) {
      alert('Enter email + password.');
      return;
    }

    setBusy(true);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) alert(error.message);
      else router.push(`/dashboard?lang=${lang}`);
    } finally {
      setBusy(false);
    }
  }

  function guestLogin() {
    localStorage.setItem('zolarus_guest', '1');
    router.push(`/dashboard?lang=${lang}`);
  }

  return (
    <div className="flex flex-col items-center gap-6 p-8">
      <h1>{t.title}</h1>

      {status === 'sent' ? (
        <p>{t.sent}</p>
      ) : (
        <>
          <input
            type="email"
            value={email}
            placeholder={t.email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
            style={{
              width: 256,
              padding: '12px 14px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#000',
              fontSize: 16,
            }}
          />

          <button type="button" onClick={sendMagicLink} disabled={busy}>
            {t.send}
          </button>

          <input
            type="password"
            value={password}
            placeholder={t.password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
          />

          <button type="button" onClick={reviewerLogin} disabled={busy}>
            {t.signinpw}
          </button>

          <button type="button" onClick={guestLogin} disabled={busy}>
            {t.guest}
          </button>
        </>
      )}

      <Link href={`/?lang=${lang}`}>{t.back}</Link>
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
