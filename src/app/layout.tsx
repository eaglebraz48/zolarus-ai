import "./globals.css";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { cookies } from "next/headers";

import Header from "@/components/Header";
import ChatWidget from "@/components/ChatWidget";
import PWARegister from "./PWARegister";
import HashAuthBridge from "@/components/HashAuthBridge";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type Lang = "en" | "pt" | "es" | "fr";
const LANGS: readonly Lang[] = ["en", "pt", "es", "fr"] as const;

async function getLangFromCookie(): Promise<Lang> {
  try {
    const jar = await cookies();
    const v = jar.get("zola_lang")?.value;
    if (v && LANGS.includes(v as Lang)) return v as Lang;
  } catch {}
  return "en";
}

export const metadata = {
  title: "Zolarus",
  description: "Gifting, reminders, and smart shopping in your language.",
  manifest: "/manifest.json",
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const lang = await getLangFromCookie();

  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <meta httpEquiv="Content-Language" content={lang} />
        <meta name="content-language" content={lang} />
        <meta name="google" content="notranslate" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
      </head>

      <body
        style={{
          backgroundColor: "#0a0f1c",
          color: "#fff",
          minHeight: "100vh",
        }}
      >
        <PWARegister />
        <HashAuthBridge />

        <div suppressHydrationWarning>
          <Header lang={lang} />
        </div>

        <main>
          <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
            {children}
          </Suspense>
        </main>

        <ChatWidget />
      </body>
    </html>
  );
}
