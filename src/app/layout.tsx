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
    const jar = await cookies();
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

const BUBBLE_TEXT: Record<Lang, { title: string; subtitle: string }> = {
  en: { title: 'Zolarus International', subtitle: 'coming soon' },
  pt: { title: 'Zolarus Brasil',        subtitle: 'em breve' },
  es: { title: 'Zolarus Internacional', subtitle: 'muy pronto' },
  fr: { title: 'Zolarus International', subtitle: 'bientôt' },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const lang = await getLangFromCookies();
  const t = BUBBLE_TEXT[lang];

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

        {/* Localized green bubble – fixed so it appears on iPhone too */}
        <div
          aria-hidden
          style={{
            position: 'fixed',
            // On phones we keep it clear of the home indicator and chat widget
            right: 16,
            bottom: 'calc(16px + env(safe-area-inset-bottom))',
            zIndex: 2147483647,
            width: 132,
            height: 132,
            borderRadius: 9999,
            background: '#10b981', // green
            boxShadow:
              '0 12px 36px rgba(16,185,129,0.45), 0 0 0 1px rgba(0,0,0,0.06)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            textAlign: 'center',
            lineHeight: 1.05,
            padding: 12,
            transform: 'translateZ(0)',
            // Don’t block taps on mobile UI underneath
            pointerEvents: 'none',
            // Slight glow ring
            filter: 'drop-shadow(0 0 28px rgba(16,185,129,0.45))',
          }}
        >
       
            {t.subtitle}
          </div>
        </div>
      </body>
    </html>
  );
}
