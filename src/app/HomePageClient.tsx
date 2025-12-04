'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

type Lang = 'en' | 'pt' | 'es' | 'fr';
const LANGS = ['en', 'pt', 'es', 'fr'] as const;

function safeLang(v: string | null): Lang {
  return (LANGS as readonly string[]).includes(v ?? '') ? (v as Lang) : 'en';
}

const COPY: Record<
  Lang,
  {
    welcome: string;
    tagline: string;
    signin: string;
    dashboard: string;
    guest: string;
    guestNote: string;
    langLabel: string;
  }
> = {
  en: {
    welcome: 'Welcome',
    tagline: 'Zolarus · English · Português (BR) · Español · Français',
    signin: 'Sign in',
    dashboard: 'Go to dashboard',
    guest: 'Explore without account',
    guestNote:
      'You can browse the shop freely. Create an account to unlock reminders, lists and full experience.',
    langLabel: 'Language:',
  },
  pt: {
    welcome: 'Bem-vindo',
    tagline: 'Zolarus · Inglês · Português (BR) · Espanhol · Francês',
    signin: 'Entrar',
    dashboard: 'Painel',
    guest: 'Explorar sem conta',
    guestNote:
      'Você pode navegar pela loja livremente. Crie uma conta para desbloquear lembretes, listas e a experiência completa.',
    langLabel: 'Idioma:',
  },
  es: {
    welcome: 'Bienvenido',
    tagline: 'Zolarus · Inglés · Portugués (BR) · Español · Francés',
    signin: 'Iniciar sesión',
    dashboard: 'Panel',
    guest: 'Explorar sin cuenta',
    guestNote:
      'Puedes navegar la tienda libremente. Crea una cuenta para desbloquear listas, recordatorios y toda la experiencia.',
    langLabel: 'Idioma:',
  },
  fr: {
    welcome: 'Bienvenue',
    tagline: 'Zolarus · Anglais · Portugais (BR) · Espagnol · Français',
    signin: 'Se connecter',
    dashboard: 'Tableau de bord',
    guest: 'Explorer sans compte',
    guestNote:
      'Vous pouvez parcourir la boutique librement. Créez un compte pour débloquer listes, rappels et l’expérience complète.',
    langLabel: 'Langue :',
  },
};

export default function HomePageClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const lang = safeLang(sp.get('lang'));
  const T = COPY[lang];

  // --------------------------
  // Guest search limiter
  // --------------------------
  const [guestCount, setGuestCount] = useState(0);

  useEffect(() => {
    try {
      const v = Number(localStorage.getItem('z_guest_searches') ?? '0');
      setGuestCount(v);
    } catch {}
  }, []);

  const handleGuestClick = () => {
    if (guestCount >= 3) return;

    const next = guestCount + 1;
    setGuestCount(next);
    try {
      localStorage.setItem('z_guest_searches', String(next));
    } catch {}

    router.push(`/shop?lang=${lang}&guest=1`);
  };

  const qp = new URLSearchParams();
  qp.set('lang', lang);

  const signInHref = `/sign-in?${qp.toString()}`;
  const dashHref = `/dashboard?${qp.toString()}`;

  const setLang = (next: Lang) => {
    const p = new URLSearchParams(Array.from(sp.entries()));
    p.set('lang', next);
    router.replace(`/?${p.toString()}`);
  };

  const guestLimitReached = guestCount >= 3;

  return (
    <main
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at 50% 20%, rgba(14,165,233,0.12) 0%, rgba(0,0,0,0) 70%) #0a0f1c',
        color: '#fff',
        display: 'grid',
        placeItems: 'center',
        textAlign: 'center',
        padding: '3rem 1rem 6rem',
      }}
    >
      <div
        style={{
          maxWidth: 520,
          width: '100%',
          background:
            'radial-gradient(circle at 50% 0%, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 70%) #0f172a',
          borderRadius: 16,
          boxShadow:
            '0 30px 80px rgba(0,0,0,0.8), 0 0 40px rgba(14,165,233,0.4) inset',
          border: '1px solid rgba(14,165,233,0.3)',
          padding: '2rem 1.5rem 1.5rem',
        }}
      >
        <img
          src="/horse-blue.png"
          alt="Zolarus emblem"
          style={{ display: 'block', width: '100%', height: 'auto', borderRadius: 24 }}
        />

        <h1
          style={{
            fontWeight: 800,
            fontSize: '1.75rem',
            marginTop: '0.25rem',
            marginBottom: '0.75rem',
            textShadow:
              '0 0 20px rgba(14,165,233,0.6), 0 2px 6px rgba(0,0,0,0.8)',
          }}
        >
          {T.welcome}
        </h1>

        <div
          style={{
            fontSize: '0.9rem',
            color: '#94a3b8',
            marginBottom: '1.5rem',
          }}
        >
          {T.tagline}
        </div>

        {/* Buttons */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {/* Guest mode */}
          <button
            onClick={handleGuestClick}
            disabled={guestLimitReached}
            style={{
              backgroundColor: guestLimitReached ? '#3f3f46' : '#0ea5e9',
              opacity: guestLimitReached ? 0.5 : 1,
              color: '#fff',
              padding: '10px 14px',
              borderRadius: 8,
              width: '100%',
              maxWidth: 260,
              fontWeight: 700,
              fontSize: 14,
              border: 'none',
              cursor: guestLimitReached ? 'not-allowed' : 'pointer',
            }}
          >
            {guestLimitReached ? 'Guest limit reached' : T.guest}
          </button>

          <div style={{ fontSize: 12, color: '#94a3b8', maxWidth: 260 }}>
            {T.guestNote}
          </div>

          {/* Sign-in */}
          <Link
            href={signInHref}
            style={{
              backgroundColor: '#111827',
              color: '#fff',
              borderRadius: 8,
              padding: '10px 14px',
              fontWeight: 700,
              fontSize: 14,
              textDecoration: 'none',
              width: '100%',
              maxWidth: 260,
              textAlign: 'center',
            }}
          >
            {T.signin}
          </Link>

          {/* Dashboard */}
          <Link
            href={dashHref}
            style={{
              backgroundColor: '#1e293b',
              color: '#fff',
              borderRadius: 8,
              padding: '10px 14px',
              fontWeight: 700,
              fontSize: 14,
              textDecoration: 'none',
              width: '100%',
              maxWidth: 260,
              textAlign: 'center',
              border: '1px solid rgba(148,163,184,0.4)',
            }}
          >
            {T.dashboard}
          </Link>
        </div>

        {/* Language selector */}
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
            {T.langLabel}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {(['en', 'pt', 'es', 'fr'] as Lang[]).map((code) => {
              const active = code === lang;
              return (
                <button
                  key={code}
                  onClick={() => setLang(code)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 10,
                    background: active
                      ? 'rgba(14,165,233,0.15)'
                      : 'rgba(255,255,255,0.06)',
                    border: active
                      ? '1px solid rgba(14,165,233,0.6)'
                      : '1px solid rgba(255,255,255,0.15)',
                    color: '#e5e7eb',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {code.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', fontSize: 10, color: '#64748b' }}>
          © 2025 Arison8™, LLC. All rights reserved.
        </div>
      </div>
    </main>
  );
}
