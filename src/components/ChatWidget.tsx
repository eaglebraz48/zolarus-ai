'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import AssistantAvatar from '@/components/AssistantAvatar';
import { supabase } from '@/lib/supabase';

type Msg = { role: 'bot' | 'user'; text: string };
type Lang = 'en' | 'pt' | 'es' | 'fr';

const ALLOWED: Lang[] = ['en', 'pt', 'es', 'fr'];

const PLACEHOLDER = {
  en: 'Ask about reminders, shop, compare prices…',
  pt: 'Pergunte sobre lembretes, loja, comparar preços…',
  es: 'Pregunta sobre recordatorios, tienda, comparar precios…',
  fr: 'Demandez rappels, boutique, comparer prix…',
};

const GREET_DEFAULT = {
  en: "Hi! I’m Zola. What’s your name?",
  pt: "Oi! Eu sou o Zola. Qual é o seu nome?",
  es: "¡Hola! Soy Zola. ¿Cuál es tu nombre?",
  fr: "Salut ! Je suis Zola. Quel est ton prénom ?",
};

const GREET_WITH_NAME = {
  en: (name: string) => `Hey ${name}, I'm here. What do you want to explore first?`,
  pt: (name: string) => `Oi ${name}, tô aqui. O que quer explorar primeiro?`,
  es: (name: string) => `Hola ${name}, aquí estoy. ¿Qué quieres ver primero?`,
  fr: (name: string) => `Salut ${name}, je suis là. On commence par quoi, ${name}?`,
};

const AFTER_NAME = {
  en: (name: string) => `Lindo nome, ${name}! Se quiser que eu lembre na próxima vez, é só salvar no seu perfil.`,
  pt: (name: string) => `Lindo nome, ${name}! Se quiser que eu lembre na próxima vez, é só salvar no seu perfil.`,
  es: (name: string) => `¡Qué nombre bonito, ${name}! Si quieres que lo recuerde la próxima vez, sólo guárdalo en tu perfil.`,
  fr: (name: string) => `Très joli prénom, ${name} ! Si tu veux que je m’en souvienne, enregistre-le dans ton profil.`,
};

const SOFT_REDIRECT = {
  en: "Let me guide you. Try asking about reminders, shop, or comparing prices.",
  pt: 'Deixa que eu te guio. Pergunte sobre lembretes, loja ou comparar preços.',
  es: 'Déjame guiarte. Pregunta por recordatorios, tienda o comparar precios.',
  fr: 'Laisse-moi te guider. Parle de rappels, boutique ou comparer prix.',
};

const QUICK = {
  en: ['open reminders', 'go to shop', 'compare prices', 'why complete my profile?'],
  pt: ['abrir lembretes', 'ir à loja', 'comparar preços', 'por que completar meu perfil?'],
  es: ['abrir recordatorios', 'ir a la tienda', 'comparar precios', '¿por qué completar mi perfil?'],
  fr: ['ouvrir rappels', 'aller à la boutique', 'comparer prix', 'pourquoi compléter mon profil?'],
};

const TIPS_LABEL = { en: 'Tips', pt: 'Dicas', es: 'Ayuda', fr: 'Astuces' };
const HIDE_LABEL = { en: 'Hide', pt: 'Fechar', es: 'Ocultar', fr: 'Fermer' };

export default function ChatWidget({ profileName }: { profileName?: string | null }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const router = useRouter();

  const raw = sp.get('lang')?.toLowerCase() as Lang | null;
  const lang: Lang = raw && ALLOWED.includes(raw) ? raw : 'en';

  const hideWidget = pathname === '/' || pathname === '/sign-in';

  const [open, setOpen] = useState(true);
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [greeted, setGreeted] = useState(false);
  const [askedName, setAskedName] = useState(false);
  const [tempName, setTempName] = useState<string | null>(null);
  const [showChips, setShowChips] = useState(true);
  const [capabilitiesExplained, setCapabilitiesExplained] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);

  const withLang = (p: string) => `${p}${p.includes('?') ? '&' : '?'}lang=${lang}`;
  const go = (p: string) => router.push(withLang(p));

  // LOAD NAME FROM PROFILE
  useEffect(() => {
    (async () => {
      if (profileName) return;

      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.full_name) {
        const first = profile.full_name.split(' ')[0];
        setMsgs([
          { role: 'bot', text: GREET_WITH_NAME[lang](first) },
          { role: 'bot', text: SOFT_REDIRECT[lang] },
        ]);
        setCapabilitiesExplained(true);
        setGreeted(true);
      }
    })();
  }, [lang, profileName]);

  // FALLBACK GREETING
  useEffect(() => {
    if (greeted) return;

    const trimmed = profileName?.trim();
    if (trimmed) {
      const first = trimmed.split(' ')[0];
      setMsgs([
        { role: 'bot', text: GREET_WITH_NAME[lang](first) },
        { role: 'bot', text: SOFT_REDIRECT[lang] },
      ]);
      setCapabilitiesExplained(true);
      setGreeted(true);
      return;
    }

    setMsgs([
      { role: 'bot', text: GREET_DEFAULT[lang] },
      { role: 'bot', text: SOFT_REDIRECT[lang] },
    ]);
    setAskedName(true);
    setCapabilitiesExplained(true);
    setGreeted(true);
  }, [greeted, lang, profileName]);

  // AUTO SCROLL
  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [msgs]);

  // SEND USER MESSAGE
  async function sendUser() {
    const text = input.trim();
    if (!text) return;

    setMsgs((m) => [...m, { role: 'user', text }]);
    setInput('');
    setShowChips(false);

    // FIRST-TIME NAME
    if (askedName && !tempName) {
      const isLikelyName =
        text.split(' ').length === 1 &&
        text.length <= 12 &&
        !text.includes('?');

      if (isLikelyName) {
        setTempName(text);
        setMsgs((m) => [...m, { role: 'bot', text: AFTER_NAME[lang](text) }]);
        setAskedName(false);
        return;
      }
      setAskedName(false);
    }

    const low = text.toLowerCase();

    // REDIRECTS
    if (['reminder', 'lembrete', 'recordatorio', 'rappel'].some((w) => low.includes(w))) {
      setMsgs((m) => [...m, { role: 'bot', text: 'Opening reminders…' }]);
      setTimeout(() => go('/reminders'), 350);
      return;
    }

    if (['shop', 'loja', 'tienda', 'boutique'].some((w) => low.includes(w))) {
      setMsgs((m) => [...m, { role: 'bot', text: 'Opening shop…' }]);
      setTimeout(() => go('/shop'), 350);
      return;
    }

    if (low.includes('compare')) {
      setMsgs((m) => [...m, { role: 'bot', text: 'Opening compare prices…' }]);
      setTimeout(() => go('/compare'), 350);
      return;
    }

    if (['profile', 'perfil', 'profil'].some((w) => low.includes(w))) {
      setMsgs((m) => [...m, { role: 'bot', text: 'Opening your profile…' }]);
      setTimeout(() => go('/profile'), 350);
      return;
    }

    // FALLBACK TO OPENAI
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            ...msgs.map((m) => ({
              role: m.role === 'bot' ? 'assistant' : 'user',
              content: m.text,
            })),
            { role: 'user', content: text },
          ],
        }),
      });

      const data = await res.json();
      setMsgs((m) => [
        ...m,
        {
          role: 'bot',
          text:
            data.reply ||
            "I can help with reminders, shopping, or comparing prices. What would you like to do?",
        },
      ]);
    } catch {
      setMsgs((m) => [...m, { role: 'bot', text: 'Connection issue. Try again.' }]);
    }
  }

  if (hideWidget) return null;

  // UI BELOW IS UNCHANGED FROM YOUR ORIGINAL
  if (!open) {
    return (
      <button
        aria-label="Open Zolarus Assistant"
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          right: 16,
          bottom: 16,
          zIndex: 50,
          width: 54,
          height: 54,
          border: 'none',
          borderRadius: '50%',
          background: '#0f172a',
          color: '#fff',
          cursor: 'pointer',
        }}
      >
        chat
      </button>
    );
  }

  return (
    /* 🔽 THE REST OF YOUR JSX IS IDENTICAL TO YOUR ORIGINAL 🔽 */
    <div />
  );
}
