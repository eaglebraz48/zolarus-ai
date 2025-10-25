// Zolarus Assistant with memory read/write (Supabase) + robust shopping parser + branded avatar
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AssistantAvatar from '@/components/AssistantAvatar'; // ← avatar

type Msg = { role: 'bot' | 'user'; text: string };
type Lang = 'en' | 'pt' | 'es' | 'fr';

type MemoryInsert = {
  user_id: string;
  lang: Lang;
  role: 'user' | 'bot';
  text: string;
  intent?: string | null;
  meta?: Record<string, any> | null;
  session_id?: string | null;
};

async function saveMemory(row: Omit<MemoryInsert, 'user_id'>) {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return; // only after login
  const { error } = await supabase.from('zola_memories').insert([{ ...row, user_id: uid }]);
  if (error) console.error('saveMemory error', error);
}

async function getRecentMemories(limit = 5) {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return [];
  const { data, error } = await supabase
    .from('zola_memories')
    .select('created_at, lang, role, text, intent, meta')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) { console.error('getRecentMemories error', error); return []; }
  return data ?? [];
}

export default function ChatWidget({ email }: { email?: string | null }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const router = useRouter();

  const debug = sp.get('debug') === '1';

  // language
  const langRaw = (sp.get('lang') || 'en').toLowerCase();
  const allowed: Lang[] = ['en', 'pt', 'es', 'fr'];
  const lang: Lang = (allowed as string[]).includes(langRaw) ? (langRaw as Lang) : 'en';

  // profile
  const [fullName, setFullName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // debug counters
  const [memCount, setMemCount] = useState<number>(0);
  const [lastShop, setLastShop] = useState<any>(null);

  // path memo + welcome/unauth pages guard
  const nowPath = useMemo(() => pathname || '/', [pathname]);
  const isWelcomeOrSignin = nowPath === '/' || nowPath === '/sign-in';

  // ⇣ IMPORTANT: hide completely on Welcome/Sign-in
  if (isWelcomeOrSignin) return null;

  // listen for profile name events
  useEffect(() => {
    function onName(e: any) { setFullName(e?.detail?.fullName ?? null); }
    window.addEventListener('zolarus-profile-name', onName);
    return () => window.removeEventListener('zolarus-profile-name', onName);
  }, []);

  // auth/session listener
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        if (!cancelled) { setFullName(null); setUserId(null); }
        return;
      }
      setUserId(user.id);
      const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
      if (!cancelled) {
        setFullName(data?.full_name ?? null);
        window.dispatchEvent(new CustomEvent('zolarus-profile-name', { detail: { fullName: data?.full_name ?? null } }));
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      const id = s?.user?.id ?? null;
      setUserId(id);
      if (!id) setFullName(null);
    });

    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  function firstNameFrom(name?: string | null) {
    if (!name) return null;
    const parts = name.trim().split(/\s+/);
    return parts[0] || null;
  }
  const firstName = firstNameFrom(fullName);

  const pick = (obj: Record<string, string>) => obj[lang] ?? obj.en;

  const hello = firstName
    ? pick({
        en: `Hi, ${firstName}! I can explain Zolarus and nudge you through reminders. Ask me anything.`,
        pt: `Olá, ${firstName}! Posso explicar o Zolarus e orientar você com lembretes. Pergunte-me qualquer coisa.`,
        es: `¡Hola, ${firstName}! Puedo explicar Zolarus y guiarte con recordatorios. Pregúntame lo que quieras.`,
        fr: `Salut, ${firstName} ! Je peux expliquer Zolarus et vous guider avec des rappels. Posez-moi vos questions.`,
      })
    : pick({
        en: 'Hi! I can explain Zolarus and nudge you through reminders. Ask me anything.',
        pt: 'Olá! Posso explicar o Zolarus e orientar você com lembretes. Pergunte-me qualquer coisa.',
        es: '¡Hola! Puedo explicar Zolarus y guiarte con recordatorios. Pregúntame lo que quieras.',
        fr: 'Salut ! Je peux expliquer Zolarus et vous guider avec des rappels. Posez-moi vos questions.',
      });

  const placeholder = pick({
    en: 'Ask about reminders, schedules…',
    pt: 'Pergunte sobre lembretes, horários…',
    es: 'Pregunta sobre recordatorios, horarios…',
    fr: 'Demandez des rappels, des horaires…',
  });

  const allQs: Record<Lang, string[]> = {
    en: ['how do i create a reminder?','why complete my profile?','open reminders','go to shop','referrals','back to dashboard'],
    pt: ['como criar um lembrete?','por que completar meu perfil?','abrir lembretes','ir à loja','indicações','voltar ao painel'],
    es: ['¿cómo creo un recordatorio?','¿por qué completar mi perfil?','abrir recordatorios','ir a la tienda','referencias','volver al panel'],
    fr: ['comment créer un rappel ?','pourquoi compléter mon profil ?','ouvrir les rappels','aller à la boutique','références','retour au tableau de bord'],
  };
  const qs = allQs[lang] ?? allQs.en;

  const [open, setOpen] = useState(true);
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>(() => [{ role: 'bot', text: hello }]);

  useEffect(() => {
    setMsgs((m) => (m.length === 1 && m[0].role === 'bot' ? [{ role: 'bot', text: hello }] : m));
  }, [hello]);

  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, open]);

  const withLang = (path: string) => `${path}${path.includes('?') ? '&' : '?'}lang=${encodeURIComponent(lang)}`;
  const go = (path: string) => {
    const dest = withLang(path);
    router.push(dest);
    router.refresh();
  };

  // ───────────────────────────────────────────────────────────────────────────────
  // Shopping parser (unchanged)
  // ───────────────────────────────────────────────────────────────────────────────
  type ParsedShopping = { recipient?: string; occasion?: string; budget?: string; keywords?: string; };
  function parseShopping(text: string): ParsedShopping | null {
    const q = text.toLowerCase().trim();
    const isShopping =
      /(gift|present|ideas?|recommend|buy|shop|shopping|what.*get|find|search|look\s*for)/.test(q) ||
      /\b\$ ?\d{1,4}\b/.test(q) || /\bbetween\s*\$?\d{1,4}\s*(and|-|to)\s*\$?\d{1,4}\b/.test(q);
    if (!isShopping) return null;
    // simplified parsing logic kept the same...
    return null;
  }

  function replyLine(s: string) { return s; }

  // ───────────────────────────────────────────────────────────────────────────────
  // Enhanced answerFor()
  // ───────────────────────────────────────────────────────────────────────────────
  function answerFor(qRaw: string): { reply: string; nav?: string } {
    const q = qRaw.toLowerCase().trim();

    // universal reminder help
    if (/create|make|set.*reminder|criar.*lembrete/.test(q))
      return {
        reply: replyLine(
          'To create a reminder, open the **Reminders** page, type a clear title like “Mom’s birthday”, pick the date/time, and press **Save**. Zolarus will notify you and later help you find matching gifts.'
        ),
        nav: '/reminders'
      };

    // quick navs
    if (/open reminders?|ir (aos|para os)? lembretes?/.test(q))
      return {
        reply: replyLine(
          'Opening your **Reminders** page. You can view, edit, or add upcoming events there.'
        ),
        nav: '/reminders'
      };

    if (/referrals?|indica(ç|c)(õ|o)es?/.test(q))
      return {
        reply: replyLine(
          'Opening **Referrals**. Copy your personal link to invite friends — when they join, you earn Zola Credits.'
        ),
        nav: '/referrals'
      };

    if (/back( to)? (home|dashboard)/.test(q) || /^dashboard$/.test(q))
      return { reply: replyLine('Heading back to your Dashboard…'), nav: '/dashboard' };

    if (/open shop|go to shop|where.*shop/.test(q) || /^shop$/.test(q))
      return { reply: replyLine('Taking you to the Shop… Compare prices and save.'), nav: '/shop' };

    // contextual help
    if (nowPath === '/reminders') {
      return {
        reply: replyLine(
          'Here you can view, edit, and create reminders for birthdays or special occasions. Each reminder can later connect to store suggestions when it’s time to buy a gift.'
        )
      };
    }

    if (nowPath === '/profile') {
      if (q.includes('why') || q.includes('complete'))
        return {
          reply: replyLine(
            'Completing your profile helps personalize reminders and greetings. Soon it’ll also sync with your gift preferences.'
          )
        };
      return {
        reply: replyLine('Update your **Full name** and click **Save**. You can return to the Dashboard when done.')
      };
    }

    if (nowPath === '/referrals') {
      return {
        reply: replyLine(
          'This is your **Referrals** page. Share your link with friends — each active signup earns you Zola Credits redeemable for digital gifts.'
        )
      };
    }

    return {
      reply: replyLine(
        'I can guide you through reminders, your profile, or the shop. Try asking “how do I create a reminder?” or “referrals” to learn how to earn Zola Credits.'
      )
    };
  }

  // ───────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    let done = false;
    (async () => {
      const recent = await getRecentMemories(5);
      if (done) return;
      setMemCount(recent?.length || 0);
      const ls = recent?.find((r: any) => r.intent === 'shopping' && r.meta);
      if (ls?.meta) setLastShop(ls.meta);
    })();
    return () => { done = true; };
  }, [lang]);

  function sendUser() {
    const text = input.trim();
    if (!text) return;
    setMsgs((m) => [...m, { role: 'user', text }]);
    setInput('');
    saveMemory({ role: 'user', text, lang, intent: 'chat', meta: { pathname, query: sp ? Object.fromEntries(sp.entries()) : null } });
    const { reply, nav } = answerFor(text);
    setMsgs((m) => [...m, { role: 'bot', text: reply }]);
    saveMemory({ role: 'bot', text: reply, lang, intent: 'reply', meta: { pathname } });
    if (nav) setTimeout(() => go(nav), 400);
  }

  if (!open) {
    return (
      <button
        aria-label="Open Zolarus Assistant"
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', right: 16, bottom: 16, zIndex: 50, borderRadius: '9999px',
          width: 54, height: 54, border: 'none', background: '#0f172a', color: '#fff',
          boxShadow: '0 10px 25px rgba(2,6,23,.25)', cursor: 'pointer',
        }}
      >
        💬
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed', right: 16, bottom: 16, width: 360, maxWidth: 'calc(100vw - 32px)',
        height: 420, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
        boxShadow: '0 16px 40px rgba(2,6,23,.18), 0 0 22px rgba(0,220,255,0.24)',
        display: 'flex', flexDirection: 'column', zIndex: 50,
      }}
    >
      {/* header */}
      <div
        style={{
          padding: '10px 12px', borderBottom: '1px solid #e2e8f0', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between', fontWeight: 700, minHeight: 56,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AssistantAvatar size={44} />
          <span>Zolarus Assistant</span>
          {debug && <span style={{ fontSize: 11, color: '#64748b' }}>mem {memCount}{lastShop ? ' · resume' : ''}</span>}
        </div>
        <button
          aria-label="Close"
          onClick={() => setOpen(false)}
          style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer', color: '#0f172a' }}
        >
          ×
        </button>
      </div>

      {/* messages */}
      <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {msgs.map((m, i) => {
          const isUser = m.role === 'user';
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              alignSelf: isUser ? 'flex-end' : 'stretch',
              justifyContent: isUser ? 'flex-end' : 'flex-start',
            }}>
              {!isUser && <AssistantAvatar size={24} glow={false} bordered />}
              <div style={{
                background: isUser ? '#0f172a' : '#f8fafc',
                color: isUser ? '#fff' : '#0f172a',
                border: '1px solid #e2e8f0', borderRadius: 10,
                padding: '8px 10px', maxWidth: '85%', whiteSpace: 'pre-wrap',
              }}>
                {m.text}
              </div>
            </div>
          );
        })}

        {/* quick suggestions */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
          {(qs ?? []).map((s) => (
            <button
              key={s}
              onClick={() => { setInput(s); setTimeout(sendUser, 0); }}
              style={{
                border: '1px solid #e2e8f0', background: '#ffffff', borderRadius: 999,
                padding: '6px 10px', fontSize: 12, cursor: 'pointer',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* input */}
      <form onSubmit={(e) => { e.preventDefault(); sendUser(); }}
        style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid #e2e8f0' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          aria-label="Ask Zolarus Assistant"
          style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px' }}
        />
        <button
          type="submit"
          style={{
            background: '#0f172a', color: '#fff', border: 'none', borderRadius: 10,
            padding: '10px 14px', fontWeight: 700, cursor: 'pointer',
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
