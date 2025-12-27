import "./globals.css";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { cookies } from "next/headers";

import Header from "@/components/Header";
import PWARegister from "./PWARegister";
import HashAuthBridge from "@/components/HashAuthBridge";
import ChatWidget from "@/components/ChatWidget";

import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type Lang = "en" | "pt" | "es" | "fr";
const LANGS: readonly Lang[] = ["en", "pt", "es", "fr"] as const;

async function getLangFromCookie(): Promise<Lang> {
  try {
    const jar = await cookies();
    const v = jar.get("zola_lang")?.value;
    if (v && (LANGS as readonly string[]).includes(v as Lang)) return v as Lang;
  } catch {}
  return "en";
}

export const metadata = {
  title: "Zolarus",
  description: "Gifting, reminders, and smart shopping in your language.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const lang = await getLangFromCookie();

  // ⭐ PEGAR USER TOKEN DO COOKIE
  const jar = await cookies();
  const accessToken = jar.get("sb-access-token")?.value || null;

  let profileName: string | null = null;

  if (accessToken) {
    // ⭐ CLIENTE SUPABASE PARA SERVER
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
      }
    );

    // ⭐ PEGAR USER
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // ⭐ PEGAR PERFIL
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      profileName = profile?.full_name || null;
    }
  }

  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <meta httpEquiv="Content-Language" content={lang} />
        <meta name="content-language" content={lang} />
        <meta name="google" content="notranslate" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
      </head>

      <body style={{ backgroundColor: "#0a0f1c", color: "#fff", minHeight: "100vh" }}>

        {/* ⭐ AUTOLOGIN PRIMEIRO, SEM SUSPENSE */}
        <HashAuthBridge />
      <Header lang={lang} />

        <PWARegister />

        <main>
          <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
            {children}
          </Suspense>
        </main>

        {/* ⭐ CHAT RECEBENDO O NOME */}
        <Suspense fallback={null}>
          <ChatWidget profileName={profileName} />
        </Suspense>

      </body>
    </html>
  );
}
