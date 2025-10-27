import './globals.css';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { cookies } from 'next/headers';

import Header from '@/components/Header';
import ChatWidget from '@/components/ChatWidget';   // client component (safe to import)
import PWARegister from './PWARegister';            // client component
import HashAuthBridge from '@/components/HashAuthBridge'; // ← handles #access_token magic links

type Lang = 'en' | 'pt' | 'es' | 'fr';
const LANGS: readonly Lang[] = ['en', 'pt', 'es', 'fr'] as const;

function getLangFromCookies(): Lang {
  const store = cookies();
  const v = store.get('zola_lang')?.value;
  return v && (LANGS as readonly string[]).includes(v) ? (v as Lang) : 'en';
}

export const metadata = {
  title: 'Zolarus',
  manifest: '/manifest.webmanifest',
};

export const viewport = {
  themeColor: '#0ea5e9',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const lang = getLangFromCookies();

  return (
    <html lang={lang}>
      <body className="bg-slate-50 text-slate-900">
        {/* Register PWA client-side in prod; safe to import from a server component */}
        <PWARegister />

        <Suspense fallback={null}>
          {/* Bridges hash-based magic links -> Supabase session, then cleans URL */}
          <HashAuthBridge />

          <Header lang={lang} />
          {children}
          {/* Global assistant (auto-hides on / and /sign-in inside ChatWidget) */}
          <ChatWidget />
        </Suspense>
      </body>
    </html>
  );
}
