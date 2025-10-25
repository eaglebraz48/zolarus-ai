// src/components/ChatWidget.tsx
// Zolarus Assistant with memory read/write (Supabase) + shopping parser + branded avatar
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
  if (error) {
    console.error('getRecentMemories error', error);
    return [];
  }
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

  // Hide completely on Welcome/Sign-in
  if (isWelcomeOrSignin) return null;

  // listen for profile name events
  useEffect(() => {
    function onName(e: any) {
      setFullName(e?.detail?.fullName ?? null);
    }
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
        if (!cancelled) {
          setFullName(null);
          setUserId(null);
        }
        return;
      }
      setUserId(user.id);
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();
      if (!cancelled) {
        setFullName(data?.full_name ?? null);
        window.dispatchEvent(
          new CustomEvent('zolarus-profile-name', {
            detail: { fullName: data?.full_name ?? null },
          }),
        );
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      const id = s?.user?.id ?? null;
      setUserId(id);
      if (!id) setFullName(null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
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
        en: `Hi, ${firstName}! I can explain Zolarus and guide you through reminders. Ask me anything.`,
        pt: `Olá, ${firstName}! Posso explicar o Zolarus e orientar você com lembretes. Pergunte o que quiser.`,
        es: `¡Hola, ${firstName}! Puedo explicar Zolarus y guiarte con recordatorios. Pregúntame lo que quieras.`,
        fr: `Salut, ${firstName} ! Je peux expliquer Zolarus et vous guider avec des rappels. Posez-moi vos questions.`,
      })
    : pick({
        en: 'I can guide you through reminders, your profile, or the shop. Try asking “how do I create a reminder?” or “referrals” to learn how to earn Zola Credits.',
        pt: 'Posso ajudar com lembretes, seu perfil ou a loja. Experimente “como criar um lembrete?” ou “indicações” para saber como ganhar Créditos Zola.',
        es: 'Puedo ayudarte con recordatorios, tu perfil o la tienda. Prueba “¿cómo creo un recordatorio?” o “referidos” para ganar Créditos Zola.',
        fr: 'Je peux vous aider avec les rappels, votre profil ou la boutique. Essayez “comment créer un rappel ?” ou “parrainages” pour gagner des Crédits Zola.',
      });

  const placeholder = pick({
    en: 'Ask about reminders, schedules…',
    pt: 'Pergunte sobre lembretes, horários…',
    es: 'Pregunta sobre recordatorios, horarios…',
    fr: 'Demandez des rappels, des horaires…',
  });

  const allQs: Record<Lang, string[]> = {
    en: [
      'how do i create a reminder?',
      'why complete my profile?',
      'open reminders',
      'go to shop',
      'referrals',
      'back to dashboard',
    ],
    pt: [
      'como criar um lembrete?',
      'por que completar meu perfil?',
      'abrir lembretes',
      'ir à loja',
      'indicações',
      'voltar ao painel',
    ],
    es: [
      '¿cómo creo un recordatorio?',
      '¿por qué completar mi perfil?',
      'abrir recordatorios',
      'ir a la tienda',
      'referidos',
      'volver al panel',
    ],
    fr: [
      'comment créer un rappel ?',
      'pourquoi compléter mon profil ?',
      'ouvrir les rappels',
      'aller à la boutique',
      'parrainages',
      'retour au tableau de bord',
    ],
  };
  const qs = allQs[lang] ?? allQs.en;

  const [open, setOpen] = useState(true);
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>(() => [{ role: 'bot', text: hello }]);

  // refresh initial greeting when it changes
  useEffect(() => {
    setMsgs((m) =>
      m.length === 1 && m[0].role === 'bot' ? [{ role: 'bot', text: hello }] : m,
    );
  }, [hello]);

  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, open]);

  // language-preserving nav + open-or-refresh
  const withLang = (path: string) =>
    `${path}${path.includes('?') ? '&' : '?'}lang=${encodeURIComponent(lang)}`;

  const openOrRefresh = (path: string) => {
    const dest = withLang(path);
    if (nowPath.replace(/\/+$/, '') === path.replace(/\/+$/, '')) {
      // We’re already here — just refresh softly
      router.refresh();
    } else {
      router.push(dest);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────────
  // Shopping parser — detects gift intent, budgets (“under $50”, “between $50–100”), etc.
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

    // recipient
    const forMatch =
      q.match(
        /\bfor (my |the )?([a-z ]+?)(?:'s| on | for | with | under | over | above | more than | at | between | to | and |$)/,
      ) || q.match(/\bfor ([a-z]+)\b/);

    let recipientRaw = (forMatch?.[2] || forMatch?.[1])?.trim();
    const norm = (s?: string) => s?.replace(/\s+/g, ' ').trim();
    const recipientLex: Record<string, string> = {
      women: 'woman',
      woman: 'woman',
      ladies: 'woman',
      lady: 'woman',
      men: 'man',
      man: 'man',
      guys: 'man',
      guy: 'man',
      mom: 'mom',
      mother: 'mom',
      dad: 'dad',
      father: 'dad',
      sister: 'sister',
      brother: 'brother',
      wife: 'wife',
      husband: 'husband',
      girlfriend: 'girlfriend',
      boyfriend: 'boyfriend',
      kid: 'kid',
      kids: 'kid',
      child: 'kid',
      teen: 'teen',
    };
    if (recipientRaw) {
      const key = norm(recipientRaw || '');
      if (key && recipientLex[key]) recipientRaw = recipientLex[key];
    }

    // occasion
    const occasion =
      (/\bbirthday\b/.test(q) && 'birthday') ||
      (/\bchristmas|xmas|holiday\b/.test(q) && 'holiday') ||
      (/\banniversary\b/.test(q) && 'anniversary') ||
      (/\bhousewarming\b/.test(q) && 'housewarming') ||
      undefined;

    // budget
    let budget: string | undefined;

    const mBetween = q.match(
      /\b(between|from)\s*\$?(\d{1,4})\s*(and|-|to)\s*\$?(\d{1,4})\b/,
    );
    const mRange = q.match(/\$ ?(\d{1,4})\s*-\s*\$?(\d{1,4})/);
    const mUnder = q.match(/\bunder\s*\$?(\d{1,4})\b/);
    const mOver =
      q.match(/\bover\s*\$?(\d{1,4})\b/) ||
      q.match(/\bmore than\s*\$?(\d{1,4})\b/) ||
      q.match(/\babove\s*\$?(\d{1,4})\b/);

    if (mBetween) budget = `${mBetween[2]}-${mBetween[4]}`;
    else if (mRange) budget = `${mRange[1]}-${mRange[2]}`;
    else if (mUnder) budget = `0-${mUnder[1]}`;
    else if (mOver) budget = `${mOver[1]}-`;
    else {
      const mDollar = q.match(/\$ ?(\d{1,4})\b/);
      if (mDollar) budget = `0-${mDollar[1]}`;
    }

    // strip budget + verbs; extract keywords
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
      cleaned.match(/ideas? for (.*)/)?.[1] ||
      cleaned.match(/gift for (.*)/)?.[1] ||
      cleaned.match(/buy (.*)/)?.[1] ||
      cleaned;

    const keywords = kw?.replace(/\b(for|with|on|my|him|her|them|me)\b/gi, '').trim();
    const recipient = recipientRaw && recipientRaw.length <= 40 ? recipientRaw : undefined;

    if (!recipient && !budget && !keywords) return null;
    return { recipient, occasion, budget, keywords: keywords || undefined };
  }

  // soft prefs in localStorage (kept; useful if you want to reuse last budget/keywords later)
  function prefKey(id: string) {
    return `zolarus:prefs:${id}`;
  }
  type SoftPrefs = { lastBudget?: string; lastKeywords?: string };
  function loadPrefs(): SoftPrefs {
    if (!userId) return {};
    try {
      const raw = localStorage.getItem(prefKey(userId));
      return raw ? (JSON.parse(raw) as SoftPrefs) : {};
    } catch {
      return {};
    }
  }
  function savePrefs(p: SoftPrefs) {
    if (!userId) return;
    try {
      const curr = loadPrefs();
      localStorage.setItem(prefKey(userId), JSON.stringify({ ...curr, ...p }));
    } catch {}
  }

  function replyLine(s: string) {
    return s;
  }

  function answerFor(qRaw: string): { reply: string; nav?: string } {
    const q = qRaw.toLowerCase().trim();

    // 1) Natural language → Shop with params
    const parsed = parseShopping(qRaw);
    if (parsed) {
      const params = new URLSearchParams();
      if (parsed.recipient) params.set('for', parsed.recipient);
      if (parsed.occasion) params.set('occasion', parsed.occasion);
      if (parsed.budget) params.set('budget', parsed.budget);
      if (parsed.keywords) params.set('keywords', parsed.keywords);

      // Persist soft prefs
      if (parsed.budget) savePrefs({ lastBudget: parsed.budget });
      if (parsed.keywords) savePrefs({ lastKeywords: parsed.keywords });

      const base = `/shop?${params.toString()}`;

      // Localized helper line
      const line = pick({
        en: 'Opening the Shop so you can try the filters and compare prices.',
        pt: 'Abrindo a Loja para você testar os filtros e comparar preços.',
        es: 'Abriendo la Tienda para que pruebes los filtros y compares precios.',
        fr: 'Ouverture de la Boutique pour essayer les filtres et comparer les prix.',
      });

      return { reply: replyLine(line), nav: base };
    }

    // 2) Quick nav keywords (localized)
    if (
      /^(open|go to|take me to)\s+(reminder|reminders)\b/.test(q) ||
      /open reminders?/.test(q) ||
      /abrir lembretes?/.test(q) ||
      /abrir recordatorios?/.test(q) ||
      /ouvrir les rappels?/.test(q)
    ) {
      const line = pick({
        en: 'Opening Reminders…',
        pt: 'Abrindo Lembretes…',
        es: 'Abriendo Recordatorios…',
        fr: 'Ouverture des Rappels…',
      });
      return { reply: replyLine(line), nav: '/reminders' };
    }

    if (
      /referrals?|refs?|indica(ç|c)(õ|o)es?/.test(q) ||
      /referidos?/.test(q) ||
      /parrainages?/.test(q)
    ) {
      const line = pick({
        en: 'Referrals earn future Zola Credits — start sharing your link today. Opening Referrals…',
        pt: 'Indicações rendem futuros Créditos Zola — comece a compartilhar seu link hoje. Abrindo Indicações…',
        es: 'Los referidos ganan futuros Créditos Zola — empieza a compartir tu enlace hoy. Abriendo Referidos…',
        fr: 'Les parrainages donnent des Crédits Zola à l’avenir — commencez à partager votre lien dès aujourd’hui. Ouverture des Parrainages…',
      });
      return { reply: replyLine(line), nav: '/referrals' };
    }

    if (
      /back( to)? (home|dashboard)/.test(q) ||
      /^dashboard$/.test(q) ||
      /voltar ao painel/.test(q) ||
      /volver al panel/.test(q) ||
      /retour au tableau/.test(q)
    ) {
      return { reply: replyLine(pick({
        en: 'Heading back to your Dashboard…',
        pt: 'Voltando ao seu Painel…',
        es: 'Volviendo a tu Panel…',
        fr: 'Retour au Tableau de bord…',
      })), nav: '/dashboard' };
    }

    if (
      /open shop|go to shop|where.*shop/.test(q) ||
      /^shop$/.test(q) ||
      /ir à loja/.test(q) ||
      /ir a la tienda/.test(q) ||
      /aller à la boutique/.test(q)
    ) {
      const line = pick({
        en: 'Opening the Shop. Try filling the fields and click the results to see ideas.',
        pt: 'Abrindo a Loja. Preencha os campos e clique nos resultados para ver ideias.',
        es: 'Abriendo la Tienda. Completa los campos y haz clic en los resultados para ver ideas.',
        fr: 'Ouverture de la Boutique. Remplissez les champs et cliquez sur les résultats pour voir des idées.',
      });
      return { reply: replyLine(line), nav: '/shop' };
    }

    if (
      /open profile|edit profile|profile page/.test(q) ||
      /^profile$/.test(q) ||
      /perfil/.test(q)
    ) {
      const line = pick({
        en: 'Opening your Profile…',
        pt: 'Abrindo seu Perfil…',
        es: 'Abriendo tu Perfil…',
        fr: 'Ouverture de votre Profil…',
      });
      return { reply: replyLine(line), nav: '/profile' };
    }

    // 3) Context-aware help
    if (nowPath === '/referrals') {
      return {
        reply: replyLine(
          pick({
            en: 'This is your **Referrals** page. Copy your personal link and share it — future Zola Credits will apply toward gifts.',
            pt: 'Esta é a página de **Indicações**. Copie o seu link e compartilhe — futuros Créditos Zola serão aplicados em presentes.',
            es: 'Esta es tu página de **Referidos**. Copia tu enlace y compártelo — los futuros Créditos Zola se aplicarán a regalos.',
            fr: 'Voici votre page de **Parrainages**. Copiez votre lien et partagez-le — les futurs Crédits Zola s’appliqueront aux cadeaux.',
          }),
        ),
      };
    }

    if (nowPath === '/profile') {
      // “why complete my profile” → explain + open (we’re already here, so just explain)
      if (
        q.includes('why') ||
        q.includes('what for') ||
        q.includes('complete') ||
        /por que completar/.test(q) ||
        /¿por qué completar/.test(q) ||
        /pourquoi compléter/.test(q)
      ) {
        return {
          reply: replyLine(
            pick({
              en: 'Your profile helps us better connect with you and personalize things. Fill it today — the page is open.',
              pt: 'Seu perfil nos ajuda a nos conectar melhor com você e personalizar as coisas. Preencha hoje — a página já está aberta.',
              es: 'Tu perfil nos ayuda a conectar mejor contigo y personalizar. Complétalo hoy — la página ya está abierta.',
              fr: 'Votre profil nous aide à mieux vous connaître et à personnaliser. Remplissez-le dès aujourd’hui — la page est déjà ouverte.',
            }),
          ),
        };
      }
      return {
        reply: replyLine(
          pick({
            en: 'Update your **Full name** (and optional phone), then click **Save**.',
            pt: 'Atualize seu **Nome completo** (e telefone opcional) e clique em **Salvar**.',
            es: 'Actualiza tu **Nombre completo** (y teléfono opcional) y haz clic en **Guardar**.',
            fr: 'Mettez à jour votre **Nom complet** (et téléphone optionnel), puis cliquez sur **Enregistrer**.',
          }),
        ),
      };
    }

    if (nowPath === '/reminders') {
      // Stay on page; explain succinctly
      if (
        q.includes('how') ||
        q.includes('create') ||
        q.includes('make') ||
        q.includes('set') ||
        /criar/.test(q) ||
        /crear/.test(q) ||
        /créer/.test(q)
      ) {
        return {
          reply: replyLine(
            pick({
              en: 'Type a **Title** (e.g., “Mom’s birthday”), choose a date/time, then **Save reminder**. I’ll email you on time — you can come back here to buy a budget-friendly gift (price comparisons if you subscribe).',
              pt: 'Digite um **Título** (ex.: “Aniversário da mãe”), escolha data/horário e clique em **Salvar lembrete**. Vou enviar o email na hora certa — você pode voltar aqui para comprar um presente dentro do orçamento (compara preços se assinar).',
              es: 'Escribe un **Título** (p. ej., “Cumpleaños de mamá”), elige fecha/hora y **Guarda el recordatorio**. Te enviaré el correo a tiempo — puedes volver aquí para comprar un regalo ajustado al presupuesto (comparaciones si te suscribes).',
              fr: 'Saisissez un **Titre** (ex. « Anniversaire de maman »), choisissez une date/heure puis **Enregistrer le rappel**. Je vous enverrai l’email à temps — vous pourrez revenir ici pour un cadeau adapté au budget (comparaisons si vous vous abonnez).',
            }),
          ),
        };
      }
      return {
        reply: replyLine(
          pick({
            en: 'This page lists your upcoming reminders. Create a new one at the top.',
            pt: 'Esta página mostra seus próximos lembretes. Crie um novo no topo.',
            es: 'Esta página muestra tus próximos recordatorios. Crea uno nuevo arriba.',
            fr: 'Cette page liste vos rappels à venir. Créez-en un en haut.',
          }),
        ),
      };
    }

    if (nowPath === '/shop') {
      if (
        q.includes('how') ||
        q.includes('what') ||
        q.includes('explain') ||
        /por que|como|explicar/.test(q) ||
        /por qué|cómo|explicar/.test(q) ||
        /pourquoi|comment|expliquer/.test(q)
      ) {
        return {
          reply: replyLine(
            pick({
              en: 'Try filling **for / occasion / keywords / budget**, then click **Get ideas**. We’ll open results so you can compare.',
              pt: 'Preencha **para quem / ocasião / palavras-chave / orçamento** e clique em **Ver ideias**. Abriremos os resultados para você comparar.',
              es: 'Completa **para quién / ocasión / palabras clave / presupuesto** y haz clic en **Ver ideas**. Abriremos resultados para comparar.',
              fr: 'Renseignez **pour / occasion / mots-clés / budget**, puis cliquez sur **Voir des idées**. Nous ouvrirons des résultats à comparer.',
            }),
          ),
        };
      }
      return {
        reply: replyLine(
          pick({
            en: 'Use the fields to narrow ideas, then click **Get ideas**.',
            pt: 'Use os campos para filtrar as ideias e clique em **Ver ideias**.',
            es: 'Usa los campos para acotar ideas y haz clic en **Ver ideas**.',
            fr: 'Utilisez les champs pour affiner les idées puis cliquez sur **Voir des idées**.',
          }),
        ),
      };
    }

    // 4) Fallback
    return {
      reply: replyLine(
        pick({
          en: 'I can navigate (e.g., “open reminders”, “referrals”, “go to shop”) or explain this page. Try “gift ideas under $50 for mom”.',
          pt: 'Posso navegar (ex.: “abrir lembretes”, “indicações”, “ir à loja”) ou explicar esta página. Tente “ideias de presente até $50 para mãe”.',
          es: 'Puedo navegar (p. ej., “abrir recordatorios”, “referidos”, “ir a la tienda”) o explicar esta página. Prueba “ideas de regalo por menos de $50 para mamá”.',
          fr: 'Je peux naviguer (ex. « ouvrir les rappels », « parrainages », « aller à la boutique ») ou expliquer cette page. Essayez « idées cadeau à moins de 50 $ pour maman ».'
        }),
      ),
    };
  }

  // optional “resume” nudge
  useEffect(() => {
    let done = false;
    (async () => {
      const recent = await getRecentMemories(5);
      if (done) return;
      setMemCount(recent?.length || 0);
      const ls = recent?.find((r: any) => r.intent === 'shopping' && r.meta);
      if (ls?.meta) setLastShop(ls.meta);
    })();
    return () => {
      done = true;
    };
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
      meta: { pathname, query: sp ? Object.fromEntries(sp.entries()) : null },
    });

    const { reply, nav } = answerFor(text);

    setMsgs((m) => [...m, { role: 'bot', text: reply }]);

    saveMemory({ role: 'bot', text: reply, lang, intent: 'reply', meta: { pathname } });

    if (nav) setTimeout(() => openOrRefresh(nav), 350);
  }

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
          {debug && (
            <span style={{ fontSize: 11, color: '#64748b' }}>
              mem {memCount}
              {lastShop ? ' · resume' : ''}
            </span>
          )}
        </div>
        <button
          aria-label="Close"
          onClick={() => setOpen(false)}
          style={{
            border: 'none',
            background: 'transparent',
            fontSize: 18,
            lineHeight: 1,
            cursor: 'pointer',
            color: '#0f172a',
          }}
        >
          ×
        </button>
      </div>

      {/* messages */}
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
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

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
          placeholder={placeholder}
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

