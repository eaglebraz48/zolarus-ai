import './globals.css';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { cookies } from 'next/headers';

import Header from '@/components/Header';
import ChatWidget from '@/components/ChatWidget';
import PWARegister from './PWARegister';
import HashAuthBridge from '@/components/HashAuthBridge';

type Lang = 'en' | 'pt' | 'es' | 'fr';
const LANGS: readonly Lang[] = ['en', 'pt', 'es', 'fr'] as const;

async function getLangFromCookies(): Promise<Lang> {
  try {
    const jar = await cookies();                // cookies() is async in your build
    const v = jar.get('zola_lang')?.value;
    return v && (LANGS as readonly string[]).includes(v as Lang) ? (v as Lang) : 'en';
  } catch {
    return 'en';
  }
}

export const metadata = {
  title: 'Zolarus',
  manifest: '/manifest.webmanifest',
};

export const viewport = {
  themeColor: '#0ea5e9',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const lang = await getLangFromCookies();

  return (
    <html lang={lang}>
      <body className="bg-slate-50 text-slate-900">
        <PWARegister />
        <Suspense fallback={null}>
          <HashAuthBridge />
          <Header lang={lang} />
          {children}
          <ChatWidget />
        </Suspense>
      </body>
    </html>
  );
}
