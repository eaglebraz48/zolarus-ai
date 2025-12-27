'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Lang = 'en' | 'pt' | 'es' | 'fr';
const LANGS: Lang[] = ['en', 'pt', 'es', 'fr'];

const T = {
  en: {
    dashboard: "Dashboard",
     welcomeFixed: "Welcome to Zolarus!",
    profileTitle: "Profile",
    profileDesc: "Basic info",
    profileBtn: "Set up profile",

    remindersTitle: "Reminders",
    remindersDesc: "Set reminders for special occasions and we'll notify you on time.",
    remindersBtn: "Open",

    shopTitle: "Shop",
    shopBtn: "Browse / Shop now",
    compareBtn: "Compare prices",
    compareDesc: "See prices from multiple stores to help you find better deals for gifts and everyday items.",

    refsTitle: "Referrals",
    refsDesc: "Share your link to help friends discover better gifts — maybe even one for *you*.",
    refsBtn: "Open",
  },

  pt: {
    dashboard: "Painel",
    welcomeFixed: "Bem-vindo ao Zolarus!",
    profileTitle: "Perfil",
    profileDesc: "Informações básicas",
    profileBtn: "Configurar perfil",

    remindersTitle: "Lembretes",
    remindersDesc: "Ative lembretes para datas especiais e enviaremos um email no momento certo.",
    remindersBtn: "Abrir",

    shopTitle: "Loja",
    shopBtn: "Navegar / Comprar",
    compareBtn: "Comparar preços",
    compareDesc: "Veja preços de várias lojas para encontrar melhores ofertas para presentes e compras do dia a dia.",

    refsTitle: "Indicações",
    refsDesc: "Compartilhe seu link e ajude amigos a encontrarem presentes melhores — quem sabe até um pra *você*.",
    refsBtn: "Abrir",
  },

  es: {
    dashboard: "Panel",
     welcomeFixed: "¡Bienvenido a Zolarus!",
    profileTitle: "Perfil",
    profileDesc: "Información básica",
    profileBtn: "Configurar perfil",

    remindersTitle: "Recordatorios",
    remindersDesc: "Configura recordatorios para ocasiones especiales y te enviaremos un email a tiempo.",
    remindersBtn: "Abrir",

    shopTitle: "Tienda",
    shopBtn: "Ver / Comprar",
    compareBtn: "Comparar precios",
    compareDesc: "Consulta precios en varias tiendas para encontrar mejores ofertas para regalos y artículos diarios.",

    refsTitle: "Referidos",
    refsDesc: "Comparte tu enlace y ayuda a tus amigos a encontrar mejores regalos — quizá hasta uno para *ti*.",
    refsBtn: "Abrir",
  },

  fr: {
    dashboard: "Tableau",
     welcomeFixed: "Bienvenue sur Zolarus !",
    profileTitle: "Profil",
    profileDesc: "Informations de base",
    profileBtn: "Configurer le profil",

    remindersTitle: "Rappels",
    remindersDesc: "Crée des rappels pour les dates importantes et nous t’enverrons un email à temps.",
    remindersBtn: "Ouvrir",

    shopTitle: "Boutique",
    shopBtn: "Voir / Acheter",
    compareBtn: "Comparer les prix",
    compareDesc: "Vois les prix de plusieurs magasins pour trouver de meilleures offres pour tes cadeaux et achats quotidiens.",

    refsTitle: "Parrainages",
    refsDesc: "Partage ton lien et aide tes amis à trouver de meilleurs cadeaux — peut-être même un pour *toi*.",
    refsBtn: "Ouvrir",
  }
};

export default function DashboardPage() {
  const sp = useSearchParams();
  const lang = (sp.get('lang') as Lang) || 'en';
  const L = T[lang];

  const [email, setEmail] = useState<string | null>(null);
  const shareUrl = `https://zolarus-ai.netlify.app/?ref=global&lang=${lang}`;

  useEffect(() => {
    supabase.auth.getUser().then((res) => {
      setEmail(res.data.user?.email ?? null);
    });
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-5 py-12 fade-in text-white">
      <h1 className="text-4xl font-bold mb-1">{L.dashboard}</h1>
      <p className="text-lg mb-10">
    {L.welcomeFixed} <span className="text-cyan-300 font-semibold">{email ?? ""}</span>


      </p>

      <div className="grid md:grid-cols-2 gap-8">

        {/* PROFILE */}
        <div className="card">
          <h2 className="text-xl font-bold mb-1">{L.profileTitle}</h2>
          <p className="text-sm opacity-70 mb-4">{L.profileDesc}</p>
          <Link href={`/profile?lang=${lang}`} className="btn-primary">
            {L.profileBtn}
          </Link>
        </div>

        {/* REMINDERS */}
        <div className="card">
          <h2 className="text-xl font-bold mb-1">{L.remindersTitle}</h2>
          <p className="text-sm opacity-70 mb-4">{L.remindersDesc}</p>
          <Link href={`/reminders?lang=${lang}`} className="btn-primary">
            {L.remindersBtn}
          </Link>
        </div>

        {/* SHOP */}
        <div className="card">
          <h2 className="text-xl font-bold mb-1">{L.shopTitle}</h2>
          <p className="text-sm opacity-70 mb-4">{L.compareDesc}</p>

          <div className="flex gap-2">
            <Link href={`/shop?lang=${lang}`} className="btn-primary">{L.shopBtn}</Link>
            <Link href={`/compare?lang=${lang}`} className="btn-secondary">{L.compareBtn}</Link>
          </div>
        </div>

        {/* REFERRALS — RESTORED WITH FUN MESSAGE */}
        <div className="card">
          <h2 className="text-xl font-bold mb-1">{L.refsTitle}</h2>
          <p
            className="text-sm opacity-70 mb-4"
            dangerouslySetInnerHTML={{ __html: L.refsDesc }}
          />

          <div className="flex flex-col gap-3">
            <input
              readOnly
              value={shareUrl}
              className="w-full rounded-xl px-3 py-2 text-black bg-white"
            />

            <div className="flex gap-2">
              <button
                className="btn-secondary"
                onClick={() => navigator.clipboard.writeText(shareUrl)}
              >
                Copy
              </button>

              <button
                className="btn-primary"
                onClick={() => navigator.share?.({ url: shareUrl }) || alert("Sharing not supported")}
              >
                Share
              </button>

              <Link href={`/referrals?lang=${lang}`} className="btn-secondary">
                {L.refsBtn}
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
