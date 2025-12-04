'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import BagIcon from '@/components/icons/Bag';
import { supabase } from '@/lib/supabase';

type Lang = 'en' | 'pt' | 'es' | 'fr';

const LABELS = {
  shop:       { en: 'Shop',       pt: 'Loja',        es: 'Tienda',          fr: 'Boutique' },
  dashboard:  { en: 'Dashboard',  pt: 'Painel',      es: 'Panel',           fr: 'Tableau de bord' },
  refs:       { en: 'Refs',       pt: 'Indicações',  es: 'Referidos',       fr: 'Parrainages' },
  reminders:  { en: 'Reminders',  pt: 'Lembretes',   es: 'Recordatorios',   fr: 'Rappels' },
  profile:    { en: 'Profile',    pt: 'Perfil',      es: 'Perfil',          fr: 'Profil' },
  signin:     { en: 'Sign in',    pt: 'Entrar',      es: 'Iniciar sesión',  fr: 'Se connecter' },
  signout:    { en: 'Sign out',   pt: 'Sair',        es: 'Cerrar sesión',   fr: 'Se déconnecter' },
} as const;

function setLangCookie(lang: Lang) {
  const oneYear = 365 * 24 * 60 * 60;
  document.cookie = `zola_lang=${lang}; path=/; max-age=${oneYear}`;
}

export default function Header({ lang }: { lang: Lang }) {
  const pathname = usePathname();
  const router = useRouter();

  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    let on = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (on) setAuthed(!!data.session);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setAuthed(!!s);
    });

    return () => {
      on = false;
      subscription?.unsubscribe();
    };
  }, []);

  const hideProtected = pathname === '/' || pathname?.startsWith('/sign-in');

  const withLang = (href: string) => {
    const url = new URL(href, 'http://x');
    if (!url.searchParams.get('lang')) url.searchParams.set('lang', lang);
    return url.pathname + (url.search || '');
  };

  const handleLangChange = (next: Lang) => {
    if (next === lang) return;
    setLangCookie(next);
    const cur = new URL(window.location.href);
    cur.searchParams.set('lang', next);
    window.location.href = cur.pathname + (cur.search || '');
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push(withLang('/'));
  };

  return (
    <header style={{ borderBottom: '1px solid #e5e7eb', background: '#ffffff' }}>
      <nav
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <Link href={withLang('/')} style={{ fontWeight: 800, fontSize: 22, color: '#2563eb', textDecoration: 'none' }}>
          Zolarus
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {!hideProtected && (
            <>
              <Link href={withLang('/dashboard')} style={navLink}>
                {LABELS.dashboard[lang]}
              </Link>

              <Link href={withLang('/shop')} style={{ ...navLink, display: 'flex', alignItems: 'center', gap: 6 }}>
                <BagIcon size={18} />
                <span>{LABELS.shop[lang]}</span>
              </Link>

              <Link href={withLang('/referrals')} style={navLink}>
                {LABELS.refs[lang]}
              </Link>

              <Link href={withLang('/reminders')} style={navLink}>
                {LABELS.reminders[lang]}
              </Link>

              <Link href={withLang('/profile')} style={navLink}>
                {LABELS.profile[lang]}
              </Link>
            </>
          )}

          {authed ? (
            <button onClick={signOut} style={signOutBtn}>
              {LABELS.signout[lang]}
            </button>
          ) : (
            <Link href={withLang('/sign-in')} style={signInBtn}>
              {LABELS.signin[lang]}
            </Link>
          )}

          {/* LANGUAGE SELECT (White box + black text) */}
          <select
            value={lang}
            onChange={(e) => handleLangChange(e.target.value as Lang)}
            style={selectLang}
          >
            <option value="en">English</option>
            <option value="pt">Português</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
          </select>
        </div>
      </nav>

      {/* Style to make dropdown options white */}
      <style jsx global>{`
        select option {
          background: #ffffff;
          color: #111111;
          font-weight: 600;
        }
      `}</style>
    </header>
  );
}

/* ---------- styles ---------- */

const navLink: React.CSSProperties = {
  color: '#1f2937',
  textDecoration: 'none',
  fontWeight: 500,
};

const signInBtn: React.CSSProperties = {
  marginLeft: 8,
  backgroundColor: '#111827',
  color: '#fff',
  borderRadius: 8,
  padding: '8px 14px',
  textDecoration: 'none',
  fontWeight: 700,
};

const signOutBtn: React.CSSProperties = {
  marginLeft: 8,
  backgroundColor: '#e63946',
  color: '#fff',
  borderRadius: 8,
  padding: '8px 14px',
  fontWeight: 700,
  border: 'none',
  cursor: 'pointer',
};

const selectLang: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: 8,
  background: '#ffffff',
  color: '#111111',
  border: '1px solid #d1d5db',
  cursor: 'pointer',
  fontWeight: 600,
};
