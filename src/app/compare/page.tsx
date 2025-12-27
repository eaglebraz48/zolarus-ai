'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { buildAffiliateSearchUrl } from '@/lib/amazon';

type Lang = 'en' | 'pt' | 'es' | 'fr';
const LANGS: Lang[] = ['en', 'pt', 'es', 'fr'];
const isLang = (v: string | null): v is Lang => !!v && LANGS.includes(v as Lang);

const T: Record<
  Lang,
  {
    title: string;
    blurb: string;
    primary: string;
    alt1: string;
    alt2: string;
    alt3: string;
    alt4: string;
    alt5: string;
    alt6: string;
    alt7: string;
    moreTitle: string;
    back: string;
    note: string;
    query: string;
  }
> = {
  en: {
    title: 'Price comparison',
    blurb: 'We’ll open retailer pages with your filters. Pick one below and compare current prices.',
    primary: 'Find on Amazon',
    alt1: 'Try Target',
    alt2: 'Try Walmart',
    alt3: 'Try Wayfair',
    alt4: 'Try Best Buy',
    alt5: 'Try Home Depot',
    alt6: 'View on Shein',
    alt7: 'View on Temu',
    moreTitle: 'More stores',
    back: 'Back to Shop',
    note: 'Results are based on your keywords; prices and availability can change.',
    query: 'Query:',
  },
  pt: {
    title: 'Comparador de preços',
    blurb: 'Abriremos as páginas das lojas com sua busca preenchida. Escolha uma loja para comparar preços.',
    primary: 'Ver na Amazon',
    alt1: 'Tentar na Target',
    alt2: 'Tentar na Walmart',
    alt3: 'Tentar na Wayfair',
    alt4: 'Tentar na Best Buy',
    alt5: 'Tentar na Home Depot',
    alt6: 'Ver na Shein',
    alt7: 'Ver na Temu',
    moreTitle: 'Mais lojas',
    back: 'Voltar ao Shop',
    note: 'Os resultados usam suas palavras-chave; preços e estoque podem mudar.',
    query: 'Busca:',
  },
  es: {
    title: 'Comparación de precios',
    blurb: 'Abriremos páginas de tiendas con tu búsqueda. Elige una tienda para comparar precios.',
    primary: 'Ver en Amazon',
    alt1: 'Probar en Target',
    alt2: 'Probar en Walmart',
    alt3: 'Probar en Wayfair',
    alt4: 'Probar en Best Buy',
    alt5: 'Probar en Home Depot',
    alt6: 'Ver en Shein',
    alt7: 'Ver en Temu',
    moreTitle: 'Más tiendas',
    back: 'Volver a Shop',
    note: 'Los resultados usan tus palabras clave; los precios pueden cambiar.',
    query: 'Consulta:',
  },
  fr: {
    title: 'Comparateur de prix',
    blurb: 'Nous ouvrons les pages des boutiques avec votre recherche. Choisissez une boutique pour comparer.',
    primary: 'Voir sur Amazon',
    alt1: 'Essayer Target',
    alt2: 'Essayer Walmart',
    alt3: 'Essayer Wayfair',
    alt4: 'Essayer Best Buy',
    alt5: 'Essayer Home Depot',
    alt6: 'Voir sur Shein',
    alt7: 'Voir sur Temu',
    moreTitle: 'Plus de boutiques',
    back: 'Retour à Shop',
    note: 'Résultats basés sur vos mots-clés ; prix et stocks évoluent.',
    query: 'Requête :',
  }
};

// ---------- Query parser ----------
function buildQueryParts(sp: URLSearchParams) {
  return {
    who: (sp.get('for') || '').trim(),
    occ: (sp.get('occasion') || '').trim(),
    kw: (sp.get('keywords') || '').trim(),
    min: (sp.get('min') || '').trim(),
    max: (sp.get('max') || '').trim(),
  };
}

// ---------- Retailer URL builders ----------
const targetUrl = (q: string) => `https://www.target.com/s?searchTerm=${encodeURIComponent(q)}`;
const walmartUrl = (q: string) => `https://www.walmart.com/search?q=${encodeURIComponent(q)}`;
const wayfairUrl = (q: string) => `https://www.wayfair.com/keyword.php?keyword=${encodeURIComponent(q)}`;
const bestBuyUrl = (q: string) => `https://www.bestbuy.com/site/searchpage.jsp?st=${encodeURIComponent(q)}`;
const homeDepotUrl = (q: string) => `https://www.homedepot.com/s/${encodeURIComponent(q)}`;
const sheinUrl = (q: string) => `https://us.shein.com/pse/?src_query=${encodeURIComponent(q)}`;
const temuUrl = (q: string) => `https://www.temu.com/search_result.html?keyword=${encodeURIComponent(q)}`;

// ---------- Component ----------
export default function ComparePage() {
  const sp = useSearchParams();
  const lang = isLang(sp.get('lang')) ? (sp.get('lang') as Lang) : 'en';
  const t = T[lang];

  const { who, occ, kw, min, max } = buildQueryParts(sp);

  // Build final query string
  const qParts: string[] = [];
  if (kw) qParts.push(kw);
  if (who) qParts.push(who);
  if (occ) qParts.push(occ);
  if (min && max) qParts.push(`price:${min}-${max}`);
  if (min && !max) qParts.push(`price:${min}-`);
  if (!min && max) qParts.push(`under ${max}`);

  const qEn = qParts.join(' ').trim();

  const capsule: React.CSSProperties = {
    display: 'inline-block',
    padding: '12px 16px',
    borderRadius: 10,
    fontWeight: 800,
    textDecoration: 'none',
    textAlign: 'center',
    width: '100%',
    maxWidth: 560,
    border: '2px solid #111827',
  };

  return (
    <div style={{ maxWidth: 900, margin: '24px auto', padding: '0 16px' }}>
      
      {/* Back */}
      <div style={{ marginBottom: 12 }}>
  <Link
    href={`/shop?lang=${lang}`}
    className="rounded-lg bg-gray-700 px-5 py-3 font-medium text-white hover:bg-gray-600 inline-block"
    style={{ display: 'inline-block' }}
  >
    ← {t.back}
  </Link>
</div>


      <h1 style={{ fontWeight: 900, fontSize: 28 }}>{t.title}</h1>
      <p style={{ color: '#374151' }}>{t.blurb}</p>

      {qEn && (
        <div
          style={{
            background: '#F3F4F6',
            border: '1px solid #E5E7EB',
            padding: '10px 12px',
            borderRadius: 8,
            margin: '12px 0',
          }}
        >
          <span style={{ fontWeight: 700, marginRight: 6 }}>{t.query}</span>
          {qEn}
        </div>
      )}

      {/* PRIMARY STORES */}
      <div style={{ display: 'grid', gap: 12 }}>

        {/* AMAZON AFFILIATE */}
        <a
          href={`https://www.amazon.com/s?k=${encodeURIComponent(qEn)}&tag=mateussousa-20`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            ...capsule,
            background: '#FF9900',
            color: '#000',
            borderColor: '#FF9900',
          }}
        >
          {t.primary} 🟧
        </a>

        <a href={targetUrl(qEn)} target="_blank" rel="noopener noreferrer"
          style={{ ...capsule, background: '#CC0000', color: '#fff', borderColor: '#CC0000' }}>
          {t.alt1} 🎯
        </a>

        <a href={walmartUrl(qEn)} target="_blank" rel="noopener noreferrer"
          style={{ ...capsule, background: '#0071CE', color: '#fff', borderColor: '#0071CE' }}>
          {t.alt2} 🔵
        </a>

        <a href={wayfairUrl(qEn)} target="_blank" rel="noopener noreferrer"
          style={{ ...capsule, background: '#6B2A87', color: '#fff', borderColor: '#6B2A87' }}>
          {t.alt3} 🟪
        </a>

        <a href={bestBuyUrl(qEn)} target="_blank" rel="noopener noreferrer"
          style={{ ...capsule, background: '#0046BE', color: '#fff', borderColor: '#0046BE' }}>
          {t.alt4} 💙
        </a>

        <a href={homeDepotUrl(qEn)} target="_blank" rel="noopener noreferrer"
          style={{ ...capsule, background: '#F96302', color: '#fff', borderColor: '#F96302' }}>
          {t.alt5} 🧡
        </a>
      </div>

      <h3 style={{ fontWeight: 800, marginTop: 18 }}>{t.moreTitle}</h3>

      {/* MORE STORES */}
      <div style={{ display: 'grid', gap: 12 }}>

        <a href={sheinUrl(qEn)} target="_blank" rel="noopener noreferrer"
          style={{ ...capsule, background: '#8E2DE2', color: '#fff', borderColor: '#8E2DE2' }}>
          {t.alt6}
        </a>

        <a href={temuUrl(qEn)} target="_blank" rel="noopener noreferrer"
          style={{ ...capsule, background: '#15C55B', color: '#fff', borderColor: '#15C55B' }}>
          {t.alt7}
        </a>

      </div>

      <p style={{ color: '#6B7280', fontSize: 13, marginTop: 16 }}>{t.note}</p>
    </div>
  );
}
