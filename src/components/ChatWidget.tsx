// src/components/ChatWidget.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import AssistantAvatar from '@/components/AssistantAvatar';

type Msg = { role: 'bot' | 'user'; text: string };
type Lang = 'en' | 'pt' | 'es' | 'fr';

export default function ChatWidget({ email }: { email?: string | null }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const router = useRouter();

  const langRaw = (sp.get('lang') || 'en').toLowerCase();
  const allowed: Lang[] = ['en', 'pt', 'es', 'fr'];
  const lang: Lang = (allowed as string[]).includes(langRaw) ? (langRaw as Lang) : 'en';
  const nowPath = useMemo(() => pathname || '/', [pathname]);

  const [open, setOpen] = useState(true);
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>(() => [
    { role: 'bot', text: 'Hi! I can help you explore Zolarus. Ask me anything.' },
  ]);
  const [showChips, setShowChips] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs]);

  if (nowPath === '/' || nowPath === '/sign-in') return null;

  const withLang = (path: string) => `${path}${path.includes('?') ? '&' : '?'}lang=${lang}`;
  const go = (path: string) => router.push(withLang(path));

  const replies = {
    explainProfileWhy: {
      en: 'Profiles help us connect with you—using your name and (soon) tailoring reminders. Fill it out today and click **Save**.',
      pt: 'O perfil nos ajuda a nos conectar com você—usando seu nome e (em breve) personalizando lembretes. Preencha hoje e clique em **Salvar**.',
      es: 'El perfil nos ayuda a conectar contigo—usando tu nombre y (pronto) personalizando recordatorios. Complétalo hoy y pulsa **Guardar**.',
      fr: 'Le profil nous aide à mieux vous connaître—utiliser votre nom et (bientôt) adapter les rappels. Remplissez-le aujourd’hui puis cliquez sur **Enregistrer**.',
    },
    explainRefs: {
      en: 'Share your link on the **Referrals** page. Soon, Zolarus will apply **Zola Credits**—start sharing today so they count when credits launch.',
      pt: 'Compartilhe seu link na página de **Indicações**. Em breve, a Zolarus aplicará **Créditos Zola**—comece a compartilhar hoje para que contem quando os créditos forem lançados.',
      es: 'Comparte tu enlace en la página de **Referencias**. Pronto, Zolarus aplicará **Créditos Zola**—empieza a compartir hoy para que cuenten cuando se activen los créditos.',
      fr: 'Partagez votre lien sur la page **Parrainages**. Bientôt, Zolarus appliquera des **Crédits Zola**—commencez à partager dès maintenant pour qu’ils comptent.',
    },
    explainShop: {
      en: 'The Shop opens with your filters. Fill **for/occasion/keywords/budget** and click **Get ideas**.',
      pt: 'A Loja abre com seus filtros. Preencha **para/ocasião/palavras-chave/orçamento** e clique em **Ver ideias**.',
      es: 'La Tienda se abre con tus filtros. Completa **para/ocasión/palabras clave/presupuesto** y pulsa **Ver ideas**.',
      fr: 'La Boutique s’ouvre avec vos filtres. Renseignez **pour/occasion/mots-clés/budget** puis cliquez sur **Trouver des idées**.',
    },
    explainReminder: {
      en: 'Type a **Title**, pick a date/time, then **Save reminder**. We’ll email you on time.',
      pt: 'Digite um **Título**, escolha data/hora e clique em **Salvar lembrete**. Vamos te avisar na hora certa.',
      es: 'Escribe un **Título**, elige fecha/hora y **Guarda el recordatorio**. Te avisaremos a tiempo.',
      fr: 'Saisissez un **Titre**, choisissez une date/heure puis **Enregistrez le rappel**. Nous vous préviendrons à temps.',
    },
  };

  function answerFor(qRaw: string) {
    const q = qRaw.toLowerCase().trim();

    if (/why.*profile|por que.*perfil|¿por.*perfil|pourquoi.*profil/.test(q)) {
      return { reply: replies.explainProfileWhy[lang], nav: '/profile' };
    }

    if (/why.*referr|por que.*indica|¿por.*referenc|pourquoi.*parrain/.test(q)) {
      return { reply: replies.explainRefs[lang], nav: '/referrals' };
    }

    if (/reminder|lembrete|recordatorio|rappel/.test(q)) return { reply: replies.explainReminder[lang], nav: '/reminders' };
    if (/profile|perfil|profil/.test(q)) return { reply: replies.explainProfileWhy[lang], nav: '/profile' };
    if (/shop|loja|tienda|boutique/.test(q)) return { reply: replies.explainShop[lang], nav: '/shop' };
    if (/referr|indica|referenc|parrain/.test(q)) return { reply: replies.explainRefs[lang], nav: '/referrals' };
    if (/dashboard|home|painel|panel|tableau/.test(q)) return { reply: 'Back to Dashboard…', nav: '/dashboard' };

    return { reply: 'Try asking “why complete my profile?”, “why referrals?”, or “open reminders”.' };
  }

  const quickQs: Record<Lang, string[]> = {
    en: ['why complete my profile?', 'why referrals?', 'open reminders', 'go to shop', 'back to dashboard'],
    pt: ['por que completar meu perfil?', 'por que indicações?', 'abrir lembretes', 'ir à loja', 'voltar ao painel'],
    es: ['¿por qué completar mi perfil?', '¿por qué referencias?', 'abrir recordatorios', 'ir a la tienda', 'volver al panel'],
    fr: ['pourquoi compléter mon profil ?', 'pourquoi parrainages ?', 'ouvrir les rappels', 'aller à la boutique', 'retour au tableau de bord'],
  };
  const qs = quickQs[lang];

  // localized labels
  const tipLabel = { en: 'Tips', pt: 'Dicas', es: 'Ayuda', fr: 'Astuces' }[lang];
  const hideLabel = { en: 'Hide', pt: 'Fechar', es: 'Ocultar', fr: 'Fermer' }[lang];

  function sendUser() {
    const text = input.trim();
    if (!text) return;
    setMsgs((m) => [...m, { role: 'user', text }]);
    setInput('');
    setShowChips(false);

    const { reply, nav } = answerFor(text);
    setMsgs((m) => [...m, { role: 'bot', text: reply }]);
    if (nav) setTimeout(() => go(nav), 400);
  }

  if (!open)
    return (
      <button
        aria-label="Open Zolarus Assistant"
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          right: 16,
          bottom: 16,
          zIndex: 50,
          borderRadius: '9999px',
          width: 54,
          height: 54,
          border: 'none',
          background: '#0f172a',
          color: '#fff',
          boxShadow: '0 10px 25px rgba(2,6,23,.25)',
          cursor: 'pointer',
        }}
      >
        💬
      </button>
    );

  return (
    <div
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        width: 360,
        maxWidth: 'calc(100vw - 32px)',
        height: 420,
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        boxShadow: '0 16px 40px rgba(2,6,23,.18), 0 0 22px rgba(0, 220, 255, 0.24)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
      }}
    >
      {/* header */}
      <div
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontWeight: 700,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AssistantAvatar size={40} />
          <span>Zolarus Assistant</span>
        </div>
        <button
          aria-label="Close"
          onClick={() => setOpen(false)}
          style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer' }}
        >
          ×
        </button>
      </div>

      {/* messages */}
      <div
        ref={listRef}
        style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        {msgs.map((m, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              alignSelf: m.role === 'user' ? 'flex-end' : 'stretch',
              justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            {m.role === 'bot' && <AssistantAvatar size={24} />}
            <div
              style={{
                background: m.role === 'user' ? '#0f172a' : '#f8fafc',
                color: m.role === 'user' ? '#fff' : '#0f172a',
                borderRadius: 10,
                padding: '8px 10px',
                maxWidth: '85%',
                whiteSpace: 'pre-wrap',
              }}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      {/* quick suggestions */}
      {showChips ? (
        <div
          style={{
            borderTop: '1px solid #e2e8f0',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            overflowX: 'auto',
            whiteSpace: 'nowrap',
          }}
        >
          {qs.map((s) => (
            <button
              key={s}
              onClick={() => {
                setInput(s);
                setTimeout(sendUser, 0);
              }}
              style={{
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                borderRadius: 999,
                padding: '6px 10px',
                fontSize: 12,
                cursor: 'pointer',
                flex: '0 0 auto',
              }}
            >
              {s}
            </button>
          ))}
          <button
            onClick={() => setShowChips(false)}
            style={{
              marginLeft: 'auto',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              borderRadius: 999,
              padding: '6px 10px',
              fontSize: 12,
              cursor: 'pointer',
              flex: '0 0 auto',
            }}
          >
            {hideLabel}
          </button>
        </div>
      ) : (
        <div
          style={{
            borderTop: '1px solid #e2e8f0',
            padding: '6px 12px',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          {/* Tips button — emerald green to stand out */}
          <button
            onClick={() => setShowChips(true)}
            style={{
              border: 'none',
              background: 'linear-gradient(180deg, #34d399 0%, #10b981 100%)', // emerald 400 → 500
              color: '#ffffff',
              borderRadius: 999,
              padding: '8px 14px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 6px 16px rgba(16, 185, 129, 0.35)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
            aria-label={tipLabel}
            title={tipLabel}
          >
            <span aria-hidden>💡</span>
            {tipLabel}
          </button>
        </div>
      )}

      {/* input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendUser();
        }}
        style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid #e2e8f0' }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about reminders, shop, or referrals..."
          aria-label="Ask Zolarus Assistant"
          style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px' }}
        />
        <button
          type="submit"
          style={{
            background: '#0f172a',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            padding: '10px 14px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}



