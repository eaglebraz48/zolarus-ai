// src/components/ChatWidget.tsx
// Zolarus Assistant with memory read/write (Supabase) + robust shopping parser + branded avatar
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AssistantAvatar from '@/components/AssistantAvatar';

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
  if (!uid) return;
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

  // profile state (first name in greeting)
  const [fullName, setFullName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // debug counters
  const [memCount, setMemCount] = useState<number>(0);
  const [lastShop, setLastShop] = useState<any>(null);

  // path memo + welcome/unauth pages guard
  const nowPath = useMemo(() => pathname || '/', [pathname]);
  const isWelcomeOrSignin = nowPath === '/' || nowPath === '/sign-in';
  if (isWelcomeOrSignin) return null;

  // profile name events
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

  // i18n helpers
  const pick = (obj: Record<string, string>) => obj[lang] ?? obj.en;

  const hello = firstName
    ? pick({
        en: `Hi, ${firstName}! I can explain Zolarus and guide you through reminders. Ask me anything.`,
        pt: `Olá, ${firstName}! Posso explicar o Zolarus e orientar você com lembretes. Pergunte-me qualquer coisa.`,
        es: `¡Hola, ${firstName}! Puedo explicar Zolarus y guiarte con recordatorios. Pregúntame lo que quieras.`,
        fr: `Salut, ${firstName} ! Je peux expliquer Zolarus et vous guider avec des rappels. Posez-moi vos questions.`,
      })
    : pick({
        en: 'Hi! I can explain Zolarus and guide you through reminders. Ask me anything.',
        pt: 'Olá! Posso explicar o Zolarus e orientar você com lembretes. Pergunte-me qualquer coisa.',
        es: '¡Hola! Puedo explicar Zolarus y guiarte con recordatorios. Pregúntame lo que quieras.',
        fr: 'Salut ! Je peux expliquer Zolarus et vous guider avec des rappels. Posez-moi vos questions.',
      });

  const placeholder = pick({
    en: 'Ask about reminders, shop, or referrals…',
    pt: 'Pergunte sobre lembretes, loja ou indicações…',
    es: 'Pregunta sobre recordatorios, tienda o referencias…',
    fr: 'Demandez des rappels, la boutique ou les parrainages…',
  });

  const allQs: Record<Lang, string[]> = {
    en: ['how do i create a reminder?', 'why complete my profile?', 'open reminders', 'go to shop', 'referrals', 'back to dashboard'],
    pt: ['como criar um lembrete?', 'por que completar meu perfil?', 'abrir lembretes', 'ir à loja', 'indicações', 'voltar ao painel'],
    es: ['¿cómo creo un recordatorio?', '¿por qué completar mi perfil?', 'abrir recordatorios', 'ir a la tienda', 'referencias', 'volver al panel'],
    fr: ['comment créer un rappel ?', 'pourquoi compléter mon profil ?', 'ouvrir les rappels', 'aller à la boutique', 'parrainages', 'retour au tableau de bord'],
  };
  const qs = allQs[lang] ?? allQs.en;

  // UI state
  const [open, setOpen] = useState(true);
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>(() => [{ role: 'bot', text: hello }]);

  // refresh initial greeting when it changes
  useEffect(() => {
    setMsgs((m) => (m.length === 1 && m[0].role === 'bot' ? [{ role: 'bot', text: hello }] : m));
  }, [hello]);

  // autoscroll
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, open]);

  // language-preserving nav + optional refresh
  const withLang = (path: string) => `${path}${path.includes('?') ? '&' : '?'}lang=${encodeURIComponent(lang)}`;
  const go = (path: string, refresh = false) => {
    const dest = withLang(path);
    router.push(dest);
    if (refresh) router.refresh();
  };

  // ───────────────────────────────────────────────────────────────────────────────
  // Shopping parser (expanded triggers + ranges)
  // ───────────────────────────────────────────────────────────────────────────────
  type ParsedShopping = {
    recipient?: string;
    occasion?: string;
    budget?: string; // "0-50", "50-100", "100-"
    keywords?: string;
  };

  function parseShopping(text: string): ParsedShopping | null {
    const q = text.toLowerCase().trim();

    const isShopping =
      /(gift|present|ideas?|recommend|buy|shop|shopping|what.*get|find|search|look\s*for)/.test(q) ||
      /\b\$ ?\d{1,4}\b/.test(q) ||
      /\bbetween\s*\$?\d{1,4}\s*(and|-|to)\s*\$?\d{1,4}\b/.test(q);
    if (!isShopping) return null;

    const forMatch =
      q.match(/\bfor (my |the )?([a-z ]+?)(?:'s| on | for | with | under | over | above | more than | at | between | to | and |$)/) ||
      q.match(/\bfor ([a-z]+)\b/);

    let recipientRaw = (forMatch?.[2] || forMatch?.[1])?.trim();
    const norm = (s?: string) => s?.replace(/\s+/g, ' ').trim();
    const recipientLex: Record<string, string> = {
      women: 'woman', woman: 'woman', ladies: 'woman', lady: 'woman',
      men: 'man', man: 'man', guys: 'man', guy: 'man',
      mom: 'mom', mother: 'mom', dad: 'dad', father: 'dad',
      sister: 'sister', brother: 'brother', wife: 'wife', husband: 'husband',
      girlfriend: 'girlfriend', boyfriend: 'boyfriend', kid: 'kid', kids: 'kid', child: 'kid', teen: 'teen',
    };
    if (recipientRaw) {
      const key = norm(recipientRaw || '');
      if (key && recipientLex[key]) recipientRaw = recipientLex[key];
    }

    const occasion =
      (/\bbirthday\b/.test(q) && 'birthday') ||
      (/\bchristmas|xmas|holiday\b/.test(q) && 'holiday') ||
      (/\banniversary\b/.test(q) && 'anniversary') ||
      (/\bhousewarming\b/.test(q) && 'housewarming') ||
      undefined;

    let budget: string | undefined;
    const mBetween = q.match(/\b(between|from)\s*\$?(\d{1,4})\s*(and|-|to)\s*\$?(\d{1,4})\b/);
    const mRange = q.match(/\$ ?(\d{1,4})\s*-\s*\$?(\d{1,4})/);
    const mUnder = q.match(/\bunder\s*\$?(\d{1,4})\b/);
    const mOver = q.match(/\bover\s*\$?(\d{1,4})\b/) || q.match(/\bmore than\s*\$?(\d{1,4})\b/) || q.match(/\babove\s*\$?(\d{1,4})\b/);

    if (mBetween) budget = `${mBetween[2]}-${mBetween[4]}`;
    else if (mRange) budget = `${mRange[1]}-${mRange[2]}`;
    else if (mUnder) budget = `0-${mUnder[1]}`;
    else if (mOver) budget = `${mOver[1]}-`;
    else {
      const mDollar = q.match(/\$ ?(\d{1,4})\b/);
      if (mDollar) budget = `0-${mDollar[1]}`;
    }

    let cleaned = q
      .replace(/\b(between|from)\s*\$?\d{1,4}\s*(and|-|to)\s*\$?\d{1,4}\b/g, ' ')
      .replace(/\$ ?\d{1,4}\s*-\s*\$?\d{1,4}/g, ' ')
      .replace(/\bunder\s*\$?\d{1,4}\b/g, ' ')
      .replace(/\bover\s*\$?\d{1,4}\b/g, ' ')
      .replace(/\bmore than\s*\$?\d{1,4}\b/g, ' ')
      .replace(/\babove\s*\$?\d{1,4}\b/g, ' ')
      .replace(/\$ ?\d{1,4}\b/g, ' ')
      .replace(/\b(find|search|look\s*for|buy|shop|shopping|gift|gifts?|ideas?|recommend)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const kw =
      (cleaned.match(/ideas? for (.*)/)?.[1] ||
        cleaned.match(/gift for (.*)/)?.[1] ||
        cleaned.match(/buy (.*)/)?.[1] ||
        cleaned);

    const keywords = kw?.replace(/\b(for|with|on|my|him|her|them|me)\b/gi, '').trim();
    const recipient = recipientRaw && recipientRaw.length <= 40 ? recipientRaw : undefined;

    if (!recipient && !budget && !keywords) return null;
    return { recipient, occasion, budget, keywords: keywords || undefined };
  }

  // local soft prefs (remember last budget/keywords)
  function prefKey(id: string) { return `zolarus:prefs:${id}`; }
  type SoftPrefs = { lastBudget?: string; lastKeywords?: string };
  function loadPrefs(): SoftPrefs {
    if (!userId) return {};
    try { const raw = localStorage.getItem(prefKey(userId)); return raw ? JSON.parse(raw) as SoftPrefs : {}; }
    catch { return {}; }
  }
  function savePrefs(p: SoftPrefs) {
    if (!userId) return;
    try {
      const curr = loadPrefs();
      localStorage.setItem(prefKey(userId), JSON.stringify({ ...curr, ...p }));
    } catch {}
  }

  // small i18n replies
  const R = {
    openingReminders: pick({
      en: 'Opening Reminders…',
      pt: 'Abrindo Lembretes…',
      es: 'Abriendo Recordatorios…',
      fr: 'Ouverture des Rappels…',
    }),
    openingProfile: pick({
      en: 'Opening your Profile…',
      pt: 'Abrindo seu Perfil…',
      es: 'Abriendo tu Perfil…',
      fr: 'Ouverture de votre Profil…',
    }),
    openingShop: pick({
      en: 'Taking you to the Shop…',
      pt: 'Indo para a Loja…',
      es: 'Llevándote a la Tienda…',
      fr: 'Direction la Boutique…',
    }),
    openingRefs: pick({
      en: 'Opening Referrals…',
      pt: 'Abrindo Indicações…',
      es: 'Abriendo Referencias…',
      fr: 'Ouverture des Parrainages…',
    }),
    backDash: pick({
      en: 'Heading back to your Dashboard…',
      pt: 'Voltando ao seu Painel…',
      es: 'Volviendo a tu Panel…',
      fr: 'Retour à votre Tableau de bord…',
    }),
    explainCreateReminder: pick({
      en: 'Type a **Title** (e.g., “Mom’s birthday”), pick a date/time, then **Save reminder**. We’ll email you on time. Use it for birthdays, holidays, and other occasions—and you can hop back here to shop a budget-friendly gift, especially if you subscribe for store comparisons.',
      pt: 'Digite um **Título** (ex.: “aniversário da mãe”), escolha data/horário e clique em **Salvar lembrete**. Vamos enviar o email na hora certa. Use para aniversários, datas especiais e outras ocasiões—depois você pode voltar aqui para comprar um presente dentro do seu orçamento, especialmente se assinar a comparação de lojas.',
      es: 'Escribe un **Título** (p. ej., “cumpleaños de mamá”), elige fecha/hora y **Guardar recordatorio**. Te enviaremos un correo a tiempo. Úsalo para cumpleaños, fechas especiales y otras ocasiones—y podrás volver aquí para comprar un regalo ajustado a tu presupuesto, sobre todo si te suscribes a la comparación de tiendas.',
      fr: 'Saisissez un **Titre** (p. ex. « Anniversaire de maman »), choisissez une date/heure puis **Enregistrer le rappel**. Nous vous enverrons un e-mail à l’heure. Idéal pour anniversaires et autres occasions—vous pourrez revenir ici pour trouver un cadeau au bon budget, surtout si vous vous abonnez à la comparaison de boutiques.',
    }),
    explainProfileWhy: pick({
      en: 'Profiles help us connect with you—using your name and (soon) tailoring reminders. Fill it out today and click **Save**.',
      pt: 'O perfil nos ajuda a nos conectar com você—usando seu nome e (em breve) personalizando lembretes. Preencha hoje e clique em **Salvar**.',
      es: 'El perfil nos ayuda a conectar contigo—usando tu nombre y (pronto) personalizando recordatorios. Complétalo hoy y pulsa **Guardar**.',
      fr: 'Le profil nous aide à mieux vous connaître—utiliser votre nom et (bientôt) adapter les rappels. Remplissez-le aujourd’hui puis cliquez sur **Enregistrer**.',
    }),
    explainRefs: pick({
      en: 'Share your personal link on the **Referrals** page to invite friends. In the future, Zolarus will apply **Zola Credits** to your account—start sharing today so they count once credits launch.',
      pt: 'Compartilhe seu link pessoal na página de **Indicações** para convidar amigos. No futuro, a Zolarus aplicará **Créditos Zola** na sua conta—comece a compartilhar hoje para que contem quando os créditos forem lançados.',
      es: 'Comparte tu enlace personal en la página de **Referencias** para invitar amigos. En el futuro, Zolarus aplicará **Créditos Zola** a tu cuenta—empieza a compartir hoy para que cuenten cuando se activen los créditos.',
      fr: 'Partagez votre lien personnel sur la page **Parrainages** pour inviter vos amis. À l’avenir, Zolarus appliquera des **Crédits Zola** sur votre compte—commencez à partager dès maintenant pour qu’ils comptent au lancement.',
    }),
    explainShop: pick({
      en: 'The Shop opens with your filters. Fill **for/occasion/keywords/budget** and click **Get ideas**. Try it now.',
      pt: 'A Loja abre com seus filtros. Preencha **para/ocasião/palavras-chave/orçamento** e clique em **Ver ideias**. Experimente agora.',
      es: 'La Tienda se abre con tus filtros. Completa **para/ocasión/palabras clave/presupuesto** y pulsa **Ver ideas**. Pruébalo ahora.',
      fr: 'La Boutique s’ouvre avec vos filtres. Renseignez **pour/occasion/mots-clés/budget** puis cliquez sur **Trouver des idées**. Essayez maintenant.',
    }),
  };

  function replyLine(s: string) { return s; }

  // Intent router
  function answerFor(qRaw: string): { reply: string; nav?: string; refresh?: boolean } {
    const q = qRaw.toLowerCase().trim();

    // 1) Natural language shopping → /shop with params
    const parsed = parseShopping(qRaw);
    if (parsed) {
      const defaults = loadPrefs();
      const budget = parsed.budget ?? defaults.lastBudget;
      const keywords = parsed.keywords ?? (parsed.recipient ? undefined : defaults.lastKeywords);

      if (parsed.budget) savePrefs({ lastBudget: parsed.budget });
      if (parsed.keywords) savePrefs({ lastKeywords: parsed.keywords });

      const params = new URLSearchParams();
      if (parsed.recipient) params.set('for', parsed.recipient);
      if (parsed.occasion) params.set('occasion', parsed.occasion);
      if (budget) params.set('budget', budget);
      if (keywords) params.set('keywords', keywords);

      return { reply: R.openingShop, nav: `/shop?${params.toString()}` };
    }

    // 2) Simple intents (handle across pages)
    const wantReminders = /^(open|go to|take me to)\s+(reminder|reminders)\b/.test(q) || /open reminders?/.test(q) || /lembretes|recordatorios|rappels/.test(q);
    const wantProfile   = /open profile|edit profile|profile page/.test(q) || /perfil|profil/.test(q);
    const wantShop      = /open shop|go to shop|where.*shop/.test(q) || /^shop$/.test(q) || /\bloja\b|\btienda\b|\bboutique\b/.test(q);
    const wantRefs      = /referrals?|refs?|indica(ç|c)(õ|o)es?|referencias|parrainages?/.test(q);

    if (wantReminders) return { reply: R.openingReminders, nav: '/reminders' };
    if (wantProfile)   return { reply: R.openingProfile,   nav: '/profile' };
    if (wantShop)      return { reply: R.openingShop,      nav: '/shop' };
    if (wantRefs)      return { reply: R.openingRefs,      nav: '/referrals' };

    // 3) Contextual help by current page, but allow cross-topic Q&A:
    if (nowPath === '/reminders') {
      // If they ask about profile while on reminders
      if (/profile|perfil|profil/.test(q)) return { reply: R.explainProfileWhy, nav: '/profile' };
      // How to create reminder (language variants)
      if (/(how.*create|make|set|criar|crear|créer).*(reminder|lembrete|recordatorio|rappel)/.test(q) || /como criar um lembrete/.test(q))
        return { reply: R.explainCreateReminder };
      // Stay on page if asking general help
      return { reply: replyLine(pick({
        en: 'This page lists your upcoming reminders. Create a new one at the top.',
        pt: 'Esta página lista seus lembretes. Crie um novo no topo.',
        es: 'Esta página muestra tus próximos recordatorios. Crea uno nuevo arriba.',
        fr: 'Cette page affiche vos rappels à venir. Créez-en un en haut.',
      })) };
    }

    if (nowPath === '/profile') {
      // If they ask about reminders while on profile
      if (/reminder|lembrete|recordatorio|rappel/.test(q)) return { reply: R.openingReminders, nav: '/reminders' };
      // Why complete profile (even if already here, explain and stay)
      if (/why.*profile|por que.*perfil|¿por.*perfil|pourquoi.*profil|complete.*profile/.test(q))
        return { reply: R.explainProfileWhy, nav: '/profile', refresh: false };
      return { reply: R.explainProfileWhy, nav: '/profile', refresh: false };
    }

    if (nowPath === '/referrals' || nowPath === '/refs') {
      // Normalize to /referrals
      return { reply: R.explainRefs, nav: '/referrals', refresh: nowPath !== '/referrals' };
    }

    if (nowPath === '/shop') {
      if (/how|what|explain|por que|porqué|pourquoi|why/.test(q)) {
        return { reply: R.explainShop, nav: '/shop', refresh: false };
      }
      return { reply: R.explainShop, nav: '/shop', refresh: false };
    }

    // Dashboard / anywhere else
    if (/back( to)? (home|dashboard)/.test(q) || /^dashboard$/.test(q)) {
      return { reply: R.backDash, nav: '/dashboard' };
    }

    // Default helpful nudge
    return {
      reply: replyLine(pick({
        en: 'I can navigate (e.g., “open reminders”, “referrals”, “go to shop”) or explain a page. Try “how do I create a reminder?” or “gift ideas under $50 for mom”.',
        pt: 'Posso navegar (ex.: “abrir lembretes”, “indicações”, “ir à loja”) ou explicar a página. Tente “como criar um lembrete?” ou “ideias de presente até $50 para mãe”.',
        es: 'Puedo navegar (p. ej., “abrir recordatorios”, “referencias”, “ir a la tienda”) o explicar la página. Prueba “¿cómo creo un recordatorio?” o “ideas de regalos por menos de $50 para mamá”.',
        fr: 'Je peux naviguer (p. ex. « ouvrir les rappels », « parrainages », « aller à la boutique ») ou expliquer la page. Essayez « comment créer un rappel ? » ou « idées de cadeaux à moins de 50 $ pour maman ».',
      }))
    };
  }

  // optional: recent memories for debug
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

    saveMemory({
      role: 'user',
      text,
      lang,
      intent: 'chat',
      meta: { pathname: nowPath, query: sp ? Object.fromEntries(sp.entries()) : null },
    });

    const { reply, nav, refresh } = answerFor(text);

    setMsgs((m) => [...m, { role: 'bot', text: reply }]);
    saveMemory({ role: 'bot', text: reply, lang, intent: 'reply', meta: { pathname: nowPath } });

    if (nav) setTimeout(() => go(nav, !!refresh), 400);
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
          minHeight: 56,
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
          style={{ border: 'none', background: 'transparent', fontSize: 18, lineHeight: 1, cursor: 'pointer', color: '#0f172a' }}
        >
          ×
        </button>
      </div>

      {/* messages */}
      <div
        ref={listRef}
        style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        {msgs.map((m, i) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                alignSelf: isUser ? 'flex-end' : 'stretch',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
              }}
            >
              {!isUser && <AssistantAvatar size={24} glow={false} bordered />}

              <div
                style={{
                  background: isUser ? '#0f172a' : '#f8fafc',
                  color: isUser ? '#fff' : '#0f172a',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '8px 10px',
                  maxWidth: '85%',
                  whiteSpace: 'pre-wrap',
                }}
              >
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
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                borderRadius: 999,
                padding: '6px 10px',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* input */}
      <form
        onSubmit={(e) => { e.preventDefault(); sendUser(); }}
        style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid #e2e8f0' }}
      >
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

