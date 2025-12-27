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

  // --- FIX FINAL DO IDIOMA ---
  const raw = sp.get("lang")?.toLowerCase() as Lang | null;
  const lang: Lang = raw && ALLOWED.includes(raw) ? raw : "en";
  // ---------------------------

  const hideWidget = pathname === '/' || pathname === '/sign-in';

  const [open, setOpen] = useState(true);
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [greeted, setGreeted] = useState(false);
  const [askedName, setAskedName] = useState(false);
  const [tempName, setTempName] = useState<string | null>(null);
  const [showChips, setShowChips] = useState(true);

  const listRef = useRef<HTMLDivElement>(null);


  // LOAD NAME FROM PROFILE
  useEffect(() => {
    (async () => {
      if (profileName) return;

      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.full_name && profile.full_name.trim() !== "") {
        const first = profile.full_name.split(" ")[0];
        setMsgs([{ role: "bot", text: GREET_WITH_NAME[lang](first) }]);
        setGreeted(true);
      }
    })();
  }, [lang, profileName]);

  // FALLBACK GREETING
  useEffect(() => {
    if (greeted) return;

    const trimmed = profileName?.trim() || "";
    if (trimmed) {
      const first = trimmed.split(" ")[0];
      setMsgs([{ role: "bot", text: GREET_WITH_NAME[lang](first) }]);
      setGreeted(true);
      return;
    }

    setMsgs([{ role: "bot", text: GREET_DEFAULT[lang] }]);
    setAskedName(true);
    setGreeted(true);
  }, [greeted, lang, profileName]);

  // AUTO SCROLL
  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [msgs]);

  const withLang = (p: string) => `${p}${p.includes('?') ? '&' : '?'}lang=${lang}`;
  const go = (p: string) => router.push(withLang(p));

  // SEND USER MESSAGE
  async function sendUser() {
    const text = input.trim();
    if (!text) return;

    setMsgs((m) => [...m, { role: 'user', text }]);
    setInput('');
    setShowChips(false);

  // FIRST-TIME NAME (non-intrusive)
if (askedName && !tempName) {
  const possible = text.trim();

  const isLikelyName =
    possible.split(" ").length === 1 &&   // só 1 palavra
    possible.length <= 12 &&              // nomes curtos
    !possible.includes("?");              // não é pergunta

  if (isLikelyName) {
    setTempName(possible);
    setMsgs((m) => [...m, { role: "bot", text: AFTER_NAME[lang](possible) }]);
    setAskedName(false);
    return;
  }

  // ❗ NÃO É NOME → segue o fluxo normal sem insistir
  setAskedName(false);
}

const low = text.toLowerCase();


    // REDIRECTS
    if (['reminder', 'lembrete', 'recordatorio', 'rappel'].some((w) => low.includes(w))) {
      setMsgs((m) => [...m, { role: 'bot', text: SOFT_REDIRECT[lang] }]);
      setTimeout(() => go('/reminders'), 350);
      return;
    }

    if (['shop', 'loja', 'tienda', 'boutique'].some((w) => low.includes(w))) {
      setMsgs((m) => [...m, { role: 'bot', text: SOFT_REDIRECT[lang] }]);
      setTimeout(() => go('/shop'), 350);
      return;
    }

    if (low.includes('compare')) {
      setMsgs((m) => [...m, { role: 'bot', text: 'Opening compare prices…' }]);
      setTimeout(() => go('/compare'), 350);
      return;
    }

    if (['profile', 'perfil', 'profil'].some((w) => low.includes(w))) {
      setMsgs((m) => [...m, { role: 'bot', text: SOFT_REDIRECT[lang] }]);
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
      const reply = data.reply || SOFT_REDIRECT[lang];

      setMsgs((m) => [...m, { role: 'bot', text: reply }]);
        } catch {
      setMsgs((m) => [...m, { role: 'bot', text: 'Connection issue. Try again.' }]);
    }
  } // <-- fecha sendUser

  // RENDER
  if (hideWidget) return null;

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
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
        boxShadow: '0 16px 40px rgba(2,6,23,.18)',
      }}
    >
      {/* HEADER */}
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
  onClick={() => setOpen(false)}
  style={{
    border: 'none',
    background: 'transparent',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',        // 👈 PRETO VISÍVEL
    cursor: 'pointer',    // 👈 Deixa mais profissional
  }}
>
  ×
</button>
</div>

      {/* MESSAGES */}
      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {msgs.map((m, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              gap: 8,
            }}
          >
            {m.role === 'bot' && <AssistantAvatar size={24} />}

            <div
              style={{
                background: m.role === 'user' ? '#0f172a' : '#e9eef5',
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

      {/* CHIPS */}
      {showChips ? (
        <div
          style={{
            borderTop: '1px solid #e2e8f0',
            padding: '8px 12px',
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
          }}
        >
          {QUICK[lang].map((s) => (
            <button
              key={s}
              onClick={() => {
                setInput(s);
                setTimeout(sendUser, 0);
              }}
              style={{
                border: '1px solid #cbd5e1',
                background: '#fff',
                borderRadius: 20,
                padding: '6px 12px',
                fontSize: 12,
                cursor: 'pointer',
                color: '#0f172a',
                whiteSpace: 'nowrap',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}
            >
              {s}
            </button>
          ))}

          <button
            onClick={() => setShowChips(false)}
            style={{
              marginLeft: 'auto',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              borderRadius: 20,
              padding: '6px 12px',
              fontSize: 12,
              color: '#0f172a',
              whiteSpace: 'nowrap',
            }}
          >
            {HIDE_LABEL[lang]}
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
          <button
            onClick={() => setShowChips(true)}
            style={{
              border: 'none',
              background: '#16a34a',
              color: '#fff',
              borderRadius: 20,
              padding: '8px 14px',
              fontSize: 12,
              boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
              whiteSpace: 'nowrap',
            }}
          >
            {TIPS_LABEL[lang]}
          </button>
        </div>
      )}

      {/* INPUT BAR */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendUser();
        }}
        style={{
          display: 'flex',
          gap: 8,
          padding: 12,
          borderTop: '1px solid #e2e8f0',
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={PLACEHOLDER[lang]}
          aria-label="Ask Zolarus Assistant"
          style={{
            background: '#fff',
            color: '#0f172a',
            flex: 1,
            border: '1px solid #cbd5e1',
            borderRadius: 10,
            padding: '10px 12px',
          }}
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
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
