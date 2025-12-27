'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import ShopCTA from '@/components/ShopCTA';

type Lang = 'en' | 'pt' | 'es' | 'fr';
const pick = (lang: Lang, obj: Record<string, string>) => obj[lang] ?? obj.en;

// ===============================
//  NORMALIZE USER INPUT TO ENGLISH
// ===============================
function normalizeToEnglish(input?: string, lang?: Lang): string {
  if (!input) return '';

  let s = input
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');

  const phraseMaps: Record<Lang, Record<string, string>> = {
    en: {},
    pt: {
      'roupa de frio': 'winter clothes',
      'roupas de frio': 'winter clothes',
      'dia dos namorados': 'valentine',
    },
    es: {
      'ropa de invierno': 'winter clothes',
      'san valentin': 'valentine',
    },
    fr: {
      'vetements dhiver': 'winter clothes',
      'vêtements d’hiver': 'winter clothes',
      'saint-valentin': 'valentine',
    },
  };

  const wordMaps: Record<Lang, Record<string, string>> = {
    en: {},
    pt: {
      namorado: 'boyfriend',
      namorada: 'girlfriend',
      marido: 'husband',
      esposa: 'wife',
      mae: 'mom',
      pai: 'dad',
      amigo: 'friend',
      amiga: 'friend',
      filho: 'son',
      filha: 'daughter',
      aniversario: 'birthday',
      casamento: 'wedding',
      formatura: 'graduation',
      natal: 'christmas',
      academia: 'gym',
      roupa: 'clothes',
      roupas: 'clothes',
      sapato: 'shoes',
      sapatos: 'shoes',
      bolsa: 'bag',
      joias: 'jewelry',
      relogio: 'watch',
      casaco: 'jacket',
    },
    es: {
      novio: 'boyfriend',
      novia: 'girlfriend',
      esposo: 'husband',
      esposa: 'wife',
      mama: 'mom',
      papa: 'dad',
      amigo: 'friend',
      amiga: 'friend',
      hijo: 'son',
      hija: 'daughter',
      cumpleanos: 'birthday',
      boda: 'wedding',
      graduacion: 'graduation',
      navidad: 'christmas',
      gimnasio: 'gym',
      ropa: 'clothes',
      zapatos: 'shoes',
      bolso: 'bag',
      joyeria: 'jewelry',
      reloj: 'watch',
      chaqueta: 'jacket',
    },
    fr: {
      mari: 'husband',
      epouse: 'wife',
      mere: 'mother',
      maman: 'mom',
      papa: 'dad',
      ami: 'friend',
      amie: 'friend',
      fils: 'son',
      fille: 'daughter',
      anniversaire: 'birthday',
      mariage: 'wedding',
      diplomes: 'graduation',
      noel: 'christmas',
      gymnase: 'gym',
      vetement: 'clothes',
      vetements: 'clothes',
      chaussures: 'shoes',
      sac: 'bag',
      bijoux: 'jewelry',
      montre: 'watch',
      veste: 'jacket',
    },
  };

  const pmap = phraseMaps[lang ?? 'en'];
  for (const [k, v] of Object.entries(pmap)) {
    const re = new RegExp(`\\b${escapeRegExp(k)}\\b`, 'g');
    s = s.replace(re, v);
  }

  const wmap = wordMaps[lang ?? 'en'];
  const tokens = s.split(/\s+/).map((t) => wmap[t] || t);
  return tokens.join(' ').replace(/\s+/g, ' ').trim();
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// AMAZON URL
function buildAmazonUrl(args: {
  forWhom?: string;
  occasion?: string;
  keywords?: string;
  min?: string;
  max?: string;
}) {
  const tag = 'mateussousa-20';
  const parts: string[] = [];
  if (args.forWhom) parts.push(`for ${args.forWhom}`);
  if (args.occasion) parts.push(args.occasion);
  if (args.keywords) parts.push(args.keywords);
  if (args.min && args.max) parts.push(`price:${args.min}-${args.max}`);
  else if (args.min && !args.max) parts.push(`price:${args.min}-`);
  else if (!args.min && args.max) parts.push(`under ${args.max}`);

  const q = encodeURIComponent(parts.join(' ').trim());
  return `https://www.amazon.com/s?k=${q}&tag=${encodeURIComponent(tag)}`;
}

export default function ShopPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const lang = ((sp.get('lang') || 'en').toLowerCase() as Lang) ?? 'en';
  const withLang = (path: string) => `${path}${path.includes('?') ? '&' : '?'}lang=${lang}`;

  // TEXTS
  const txt = {
    title: pick(lang, { en: 'Zolarus', pt: 'Zolarus', es: 'Zolarus', fr: 'Zolarus' }),
    h2: pick(lang, {
      en: "Let's get some ideas and shop now at Amazon!",
      pt: 'Vamos buscar ideias e comprar agora na Amazon!',
      es: '¡Busquemos ideas y compremos ahora en Amazon!',
      fr: 'Trouvons des idées et achetons maintenant sur Amazon !',
    }),
    sub: pick(lang, {
      en: 'Open Amazon with your selected ideas below.',
      pt: 'Abra a Amazon com as ideias que você selecionar abaixo.',
      es: 'Abre Amazon con las ideas que selecciones abajo.',
      fr: 'Ouvrez Amazon avec les idées sélectionnées ci-dessous.',
    }),
    compare: pick(lang, {
      en: 'Find gift ideas and compare prices instantly — Amazon + other stores',
      pt: 'Encontre ideias de presentes e compare preços instantaneamente — Amazon + outras lojas',
      es: 'Encuentra ideas de regalos y compara precios al instante — Amazon + otras tiendas',
      fr: 'Trouvez des idées de cadeaux et comparez les prix instantanément — Amazon + autres boutiques',
    }),
    phFor: pick(lang, {
      en: 'for whom (e.g., boyfriend, girlfriend, husband, wife, mom)',
      pt: 'para quem (ex.: namorado, namorada, marido, esposa, mãe)',
      es: 'para quién (p. ej., novio, novia, esposo, esposa, mamá)',
      fr: 'pour qui (ex. : petit ami, conjointe, mari, épouse, maman)',
    }),
    phOccasion: pick(lang, {
      en: 'occasion (e.g., birthday, anniversary, wedding)',
      pt: 'ocasião (ex.: aniversário, casamento)',
      es: 'ocasión (p. ej., cumpleaños, aniversario)',
      fr: 'occasion (ex. : anniversaire, mariage)',
    }),
    phKeywords: pick(lang, {
      en: 'keywords (e.g., gym, perfume, watch)',
      pt: 'palavras-chave (ex.: academia, perfume, relógio)',
      es: 'palabras clave (p. ej., gimnasio, perfume, reloj)',
      fr: 'mots-clés (ex. : sport, parfum, montre)',
    }),
    phMin: pick(lang, { en: 'min', pt: 'mín', es: 'mín', fr: 'min' }),
    phMax: pick(lang, { en: 'max', pt: 'máx', es: 'máx', fr: 'max' }),
    btnIdeas: pick(lang, { en: 'Get ideas', pt: 'Ver ideias', es: 'Ver ideas', fr: 'Voir des idées' }),
    btnTry: pick(lang, { en: 'Try new ideas', pt: 'Tentar novas ideias', es: 'Probar nuevas ideas', fr: 'Essayer d’autres idées' }),
    note: pick(lang, {
      en: "Don't see this page in your language on Amazon? Right-click → Translate.",
      pt: 'Não vê esta página no seu idioma na Amazon? Clique direito → Traduzir.',
      es: '¿No ves esta página en tu idioma en Amazon? Clic derecho → Traducir.',
      fr: 'Vous ne voyez pas cette page en français ? Clic droit → Traduire.',
    }),

    smart: pick(lang, {
      en: "Not sure what to search? Ask the chat — tell Zola who the person is, what they like, and it will suggest gift ideas.",
      pt: 'Não sabe o que buscar? Pergunte ao chat — diga à Zola quem é a pessoa, o que ela gosta, e ela sugere ideias de presentes.',
      es: '¿No sabes qué buscar? Pregunta al chat — dile a Zola quién es la persona y qué le gusta, y te sugerirá ideas de regalos.',
      fr: "Vous ne savez pas quoi chercher ? Demandez au chat — dites à Zola qui est la personne et ce qu'elle aime, et elle proposera des idées de cadeaux.",
    }),

    disclaimer: pick(lang, {
      en: 'Suggestions may vary.',
      pt: 'Sugestões podem variar.',
      es: 'Las sugerencias pueden variar.',
      fr: 'Les suggestions peuvent varier.',
    }),
  };

  // STATES
  const [forWhom, setForWhom] = useState('');
  const [occasion, setOccasion] = useState('');
  const [keywords, setKeywords] = useState('');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');

  const hasFilters = useMemo(
    () => Boolean(forWhom || occasion || keywords || min || max),
    [forWhom, occasion, keywords, min, max]
  );

  const amazonUrl = useMemo(() => {
    if (!hasFilters) return '#';
    return buildAmazonUrl({
      forWhom: normalizeToEnglish(forWhom, lang),
      occasion: normalizeToEnglish(occasion, lang),
      keywords: normalizeToEnglish(keywords, lang),
      min: min || undefined,
      max: max || undefined,
    });
  }, [hasFilters, forWhom, occasion, keywords, min, max, lang]);

  function refreshIdeas() {
    router.push(withLang('/shop?fresh=1'));
  }

  return (
    <main className="max-w-5xl mx-auto px-4 md:px-6 py-8">
      
      {/* HERO */}
      <section className="mb-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-gradient-to-b from-cyan-50 to-white px-3 py-2">
        <Image src="/horse-blue.png" width={34} height={34} alt="" />
        <div className="font-extrabold text-slate-900">Find great gifts faster</div>
      </section>

      <h2 className="text-xl md:text-2xl font-bold text-amber-600">{txt.h2}</h2>

      {/* Compare */}
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <p className="text-slate-200 font-medium">{txt.compare}</p>
        <ShopCTA size="sm" />
      </div>

      <p className="mt-1 text-slate-300">{txt.sub}</p>

      {/* FILTERS */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.2fr_1.2fr_2.2fr_100px_100px_auto] gap-2">
        <input value={forWhom} onChange={(e) => setForWhom(e.target.value)} placeholder={txt.phFor}
          className="input" />
        <input value={occasion} onChange={(e) => setOccasion(e.target.value)} placeholder={txt.phOccasion}
          className="input" />
        <input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder={txt.phKeywords}
          className="input" />
        <input value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ''))} placeholder={txt.phMin}
          className="input" />
        <input value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ''))} placeholder={txt.phMax}
          className="input" />

        <div className="flex gap-2">
          <a href={hasFilters ? amazonUrl : '#'} target="_blank"
            className={`rounded-xl px-4 py-2 font-semibold ${
              hasFilters ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-slate-200 text-slate-400 pointer-events-none'
            }`}>
            {txt.btnIdeas}
          </a>

          <button onClick={refreshIdeas}
            className="rounded-xl px-4 py-2 font-semibold bg-slate-900 text-white hover:bg-slate-800">
            {txt.btnTry}
          </button>
        </div>
      </div>

      {/* NOTE */}
      <p className="mt-3 text-slate-300">{txt.note}</p>

      {/* SMART BLOCK */}
      <div className="mt-10 flex flex-col items-center gap-2">
        
        <a href={withLang('/dashboard')}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 transition">
          ← {pick(lang, {
            en: 'Back to Dashboard',
            pt: 'Voltar ao painel',
            es: 'Volver al panel',
            fr: 'Retour au tableau de bord',
          })}
        </a>

        <p className="text-center text-slate-400 text-sm max-w-xs">
          {txt.smart}
        </p>

        <p className="text-center text-slate-500 text-xs opacity-70">
          {txt.disclaimer}
        </p>
      </div>

    </main>
  );
}
