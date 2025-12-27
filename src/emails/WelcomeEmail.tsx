// src/emails/WelcomeEmail.tsx
import * as React from "react";

type Props = {
  email: string;
  lang: "en" | "pt" | "es" | "fr";
};

const T = {
  en: {
    title: "Welcome to Zolarus 🎁",
    lead: "We’re excited to have you here.",
    body:
      "You can start discovering meaningful gifts and referrals right away. " +
      "If you ever need help, just reply to this email.",
    cta: "Open Zolarus",
  },
  pt: {
    title: "Bem-vindo ao Zolarus 🎁",
    lead: "Estamos felizes por ter você aqui.",
    body:
      "Você já pode começar a descobrir presentes e indicações. " +
      "Se precisar de ajuda, basta responder a este e-mail.",
    cta: "Abrir Zolarus",
  },
  es: {
    title: "¡Bienvenido a Zolarus 🎁!",
    lead: "Nos entusiasma tenerte aquí.",
    body:
      "Ya puedes empezar a descubrir regalos e invitaciones significativas. " +
      "Si necesitas ayuda, responde a este correo.",
    cta: "Abrir Zolarus",
  },
  fr: {
    title: "Bienvenue sur Zolarus 🎁",
    lead: "Nous sommes ravis de vous accueillir.",
    body:
      "Vous pouvez commencer à découvrir des cadeaux et des recommandations. " +
      "Si vous avez besoin d’aide, répondez simplement à cet e-mail.",
    cta: "Ouvrir Zolarus",
  },
};

export default function WelcomeEmail({ email, lang }: Props) {
  const t = T[lang] ?? T.en;

  const container: React.CSSProperties = {
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    background: "#f7f7f8",
    padding: "32px",
  };
  const card: React.CSSProperties = {
    maxWidth: 560,
    margin: "0 auto",
    background: "#ffffff",
    borderRadius: 12,
    padding: 24,
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  };
  const btn: React.CSSProperties = {
    display: "inline-block",
    marginTop: 16,
    padding: "12px 18px",
    borderRadius: 10,
    background: "#6d4aff",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 600,
  };

  const appUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://zolarus-ai.vercel.app";

  return (
    <div style={container}>
      <div style={card}>
        <h1 style={{ marginTop: 0 }}>{t.title}</h1>
        <p style={{ fontSize: 16, margin: "8px 0" }}>{t.lead}</p>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "#2b2f36" }}>{t.body}</p>
        <a href={appUrl} style={btn} target="_blank" rel="noreferrer">
          {t.cta}
        </a>
        <hr style={{ margin: "24px 0", border: 0, borderTop: "1px solid #eee" }} />
        <p style={{ fontSize: 12, color: "#666" }}>
          Sent to <b>{email}</b> • Zolarus · arison8.com
        </p>
      </div>
    </div>
  );
}
