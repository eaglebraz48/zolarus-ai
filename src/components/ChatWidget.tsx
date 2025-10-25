'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AssistantAvatar from '@/components/AssistantAvatar';

type Msg = { role: 'bot' | 'user'; text: string };
type Lang = 'en' | 'pt' | 'es' | 'fr';

export default function ChatWidget({ email }: { email?: string | null }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const router = useRouter();

  const [fullName, setFullName] = useState<string | null>(null);
  const [open, setOpen] = useState(true);
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);

  const langRaw = (sp.get('lang') || 'en').toLowerCase();
  const langs: Lang[] = ['en', 'pt', 'es', 'fr'];
  const lang: Lang = langs.includes(langRaw as Lang) ? (langRaw as Lang) : 'en';

  const nowPath = pathname || '/';
  const hide = nowPath === '/' || nowPath === '/sign-in';
  if (hide) return null;

  // helper
  const pick = (obj: Record<Lang, string>) => obj[lang] ?? obj.en;

  const hello = pick({
    en: 'Hi! I can explain Zolarus and guide you through reminders. Ask me anything.',
    pt: 'Olá! Posso explicar o Zolarus e orientar você com lembretes e compras. Pergunte-me qualquer coisa.',
    es: '¡Hola! Puedo explicar Zolarus y ayudarte con recordatorios y compras. Pregúntame lo que quieras.',
    fr: 'Salut ! Je peux expliquer Zolarus et vous guider avec les rappels et les achats. Posez-moi vos questions.'
  });

  const qs = pick({
    en: ['how do I create a reminder?', 'why complete my profile?', 'open reminders', 'go to shop', 'referrals', 'back to dashboard'],
    pt: ['como criar um lembrete?', 'por que completar meu perfil?', 'abrir lembretes', 'ir à loja', 'indicações', 'voltar ao painel'],
    es: ['¿cómo crear un recordatorio?', '¿por qué completar mi perfil?', 'abrir recordatorios', 'ir a la tienda', 'referencias', 'volver al panel'],
    fr: ['comment créer un rappel ?', 'pourquoi compléter mon profil ?', 'ouvrir rappels', 'aller à la boutique', 'parrainages', 'retour au tableau de bord']
  });

  useEffect(() => setMsgs([{ role: 'bot', text: hello }]), [hello]);

  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, open]);

  const withLang = (path: string) => `${path}${path.includes('?') ? '&' : '?'}lang=${encodeURIComponent(lang)}`;
  const go = (path: string) => router.push(withLang(path));

  function translateAnswer(q: string): { reply: string; nav?: string } {
    const lower = q.toLowerCase().trim();

    // ---- Navigation intents ----
    if (/(open|abrir).*(lembrete|reminder)/.test(lower)) return { reply: pick({
      en: 'Opening Reminders…', pt: 'Abrindo Lembretes…', es: 'Abriendo Recordatorios…', fr: 'Ouverture des rappels…'
    }), nav: '/reminders' };

    if (/(shop|loja|boutique)/.test(lower)) return { reply: pick({
      en: 'Opening the Shop…', pt: 'Abrindo a Loja…', es: 'Abriendo la Tienda…', fr: 'Ouverture de la boutique…'
    }), nav: '/shop' };

    if (/(dashboard|painel|panel)/.test(lower)) return { reply: pick({
      en: 'Back to your Dashboard…', pt: 'Voltando ao Painel…', es: 'Volviendo al Panel…', fr: 'Retour au tableau de bord…'
    }), nav: '/dashboard' };

    if (/(referral|indica|referencia|parrainage)/.test(lower)) return { reply: pick({
      en: 'Referrals help you earn Zola Credits! Share your unique link under **Referrals** (purple circle on your dashboard). Soon every new signup you bring will count toward your credits.',
      pt: 'As indicações ajudam você a ganhar Créditos Zola! Compartilhe o link em **Indicações** (o círculo roxo no painel). Em breve, cada novo usuário que você indicar começará a contar para seus créditos.',
      es: '¡Las referencias te ayudan a ganar Créditos Zola! Comparte tu enlace en **Referencias** (el círculo morado en el panel). Pronto cada nuevo usuario que traigas contará para tus créditos.',
      fr: 'Les parrainages vous font gagner des Crédits Zola ! Partagez le lien sous **Parrainages** (le cercle violet sur le tableau). Bientôt, chaque nouvel inscrit comptera pour vos crédits.'
    }), nav: '/refs' };

    // ---- Page-specific ----
    if (nowPath === '/profile') {
      if (/por que|why|pourquoi|por qué/.test(lower)) return { reply: pick({
        en: 'Completing your profile adds your name and optional phone so reminders and greetings feel personal. It’s quick and helps Zolarus tailor messages for you.',
        pt: 'Completar seu perfil adiciona seu nome e telefone opcional para que lembretes e mensagens fiquem mais pessoais. É rápido e ajuda o Zolarus a personalizar a experiência.',
        es: 'Completar tu perfil agrega tu nombre y teléfono opcional para que los recordatorios sean más personales. Es rápido y ayuda a Zolarus a personalizar tu experiencia.',
        fr: 'Compléter votre profil ajoute votre nom et téléphone optionnel afin que les rappels soient plus personnels. C’est rapide et aide Zolarus à personnaliser votre expérience.'
      }) };
    }

    if (nowPath === '/reminders') {
      if (/como|how|comment|cómo/.test(lower)) return { reply: pick({
        en: 'To create a reminder, fill in **Title** (like “Mom’s birthday”), choose a **date and time**, then click **Save reminder**. You’ll get an email at the right time. It’s great for birthdays, anniversaries, or other special occasions — and you can return here to find a budget-friendly gift from the shop.',
        pt: 'Para criar um lembrete, preencha o **Título** (por exemplo, “Aniversário da mãe”), escolha a **data e hora** e clique em **Salvar lembrete**. Você receberá um e-mail no momento certo. É ideal para aniversários, ocasiões especiais ou datas importantes — e você pode voltar aqui para comprar um presente dentro do seu orçamento.',
        es: 'Para crear un recordatorio, completa el **Título** (por ejemplo “Cumpleaños de mamá”), elige la **fecha y hora**, y haz clic en **Guardar recordatorio**. Recibirás un correo a tiempo. Perfecto para cumpleaños y ocasiones especiales, y puedes volver aquí para comprar un regalo ajustado a tu presupuesto.',
        fr: 'Pour créer un rappel, remplissez le **Titre** (ex. “Anniversaire de maman”), choisissez la **date et l’heure**, puis cliquez sur **Enregistrer le rappel**. Vous recevrez un e-mail au bon moment. Idéal pour les anniversaires ou occasions spéciales, et vous pouvez revenir ici pour trouver un cadeau adapté à votre budget.'
      }) };
    }

    if (nowPath === '/shop') {
      return { reply: pick({
        en: 'Here you can compare prices across stores for gifts and everyday items. Type who it’s for and your budget, and I’ll surface the best deals — especially useful if you’re subscribed to see price changes.',
        pt: 'Aqui você pode comparar preços entre lojas para presentes e compras do dia a dia. Digite para quem é e o seu orçamento, e eu mostrarei as melhores opções — especialmente útil se você for assinante para acompanhar variações de preço.',
        es: 'Aquí puedes comparar precios entre tiendas para regalos y compras cotidianas. Escribe para quién es y tu presupuesto, y te mostraré las mejores opciones — aún mejor si estás suscrito para seguir las variaciones de precios.',
        fr: 'Ici, vous pouvez comparer les prix entre boutiques pour des cadeaux et achats quotidiens. Indiquez pour qui et votre budget, et je vous montrerai les meilleures offres — encore mieux si vous êtes abonné pour suivre les variations de prix.'
      }) };
    }

    return { reply: pick({
      en: 'I can guide you through reminders, your profile, or the shop. Try asking “how do I create a reminder?” or “referrals” to learn how to earn Zola Credits.',
      pt: 'Posso orientar você sobre lembretes, perfil ou loja. Tente perguntar “como criar um lembrete?” ou “indicações” para saber como ganhar Créditos Zola.',
      es: 'Puedo guiarte sobre recordatorios, perfil o tienda. Prueba “¿cómo crear un recordatorio?” o “referencias” para aprender cómo ganar Créditos Zola.',
      fr: 'Je peux vous guider sur les rappels, le profil ou la boutique. Essayez “comment créer un rappel ?” ou “parrainages” pour apprendre à gagner des Crédits Zola.'
    }) };
  }

  function sendMessage() {
    const text = input.trim();
    if (!text) return;
    setMsgs((m) => [...m, { role: 'user', text }]);
    setInput('');
    const { reply, nav } = translateAnswer(text);
    setMsgs((m) => [...m, { role: 'bot', text: reply }]);
    if (nav) setTimeout(() => go(nav), 400);
  }

  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', right: 16, bottom: 16, width: 54, height: 54,
          borderRadius: '50%', border: 'none', background: '#0f172a',
          color: '#fff', boxShadow: '0 10px 25px rgba(2,6,23,.25)', cursor: 'pointer', zIndex: 50
        }}
      >
        💬
      </button>
    );

  return (
    <div
      style={{
        position: 'fixed', right: 16, bottom: 16, width: 360, maxWidth: 'calc(100vw - 32px)',
        height: 420, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
        boxShadow: '0 16px 40px rgba(2,6,23,.18)', display: 'flex', flexDirection: 'column', zIndex: 50
      }}
    >
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AssistantAvatar size={44} />
          <span>Zolarus Assistant</span>
        </div>
        <button onClick={() => setOpen(false)} style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer' }}>×</button>
      </div>

      <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 8 }}>
            {m.role === 'bot' && <AssistantAvatar size={24} glow={false} bordered />}
            <div
              style={{
                background: m.role === 'user' ? '#0f172a' : '#f8fafc',
                color: m.role === 'user' ? '#fff' : '#0f172a',
                borderRadius: 10, padding: '8px 10px', maxWidth: '85%',
                border: '1px solid #e2e8f0', whiteSpace: 'pre-wrap'
              }}
            >
              {m.text}
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
          {qs.map((q) => (
            <button key={q} onClick={() => { setInput(q); setTimeout(sendMessage, 0); }}
              style={{ border: '1px solid #e2e8f0', background: '#fff', borderRadius: 999, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>
              {q}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
        style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid #e2e8f0' }}>
        <input value={input} onChange={(e) => setInput(e.target.value)}
          placeholder={pick({
            en: 'Ask about reminders, shop, or referrals…',
            pt: 'Pergunte sobre lembretes, loja ou indicações…',
            es: 'Pregunta sobre recordatorios, tienda o referencias…',
            fr: 'Demandez des rappels, la boutique ou les parrainages…'
          })}
          style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px' }} />
        <button type="submit"
          style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 14px', fontWeight: 700, cursor: 'pointer' }}>
          Send
        </button>
      </form>
    </div>
  );
}
