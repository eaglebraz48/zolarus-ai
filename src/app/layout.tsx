// src/app/layout.tsx
import './globals.css';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { cookies } from 'next/headers';
import ChatWidget from '@/components/ChatWidget';
import Header from '@/components/Header';
import PWARegister from './PWARegister';

type Lang = 'en' | 'pt' | 'es' | 'fr';
const LANGS: readonly Lang[] = ['en', 'pt', 'es', 'fr'] as const;

async function getLangFromCookies(): Promise<Lang> {
  const store = await cookies();
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

export default async function RootLayout({ children }: { children: ReactNode }) {
  const lang = await getLangFromCookies();

  return (
    <html lang={lang}>
      <body className="bg-slate-50 text-slate-900">
        {/* Registers next-pwa on the client in production */}
        <PWARegister />

        <Suspense fallback={null}>
          <Header lang={lang} />
          {children}
        </Suspense>
      </body>
    </html>
  );
}
