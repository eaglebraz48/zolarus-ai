'use client';

import Link from 'next/link';
import { buildCompareLinks } from '@/lib/compareLinks';

type Lang = 'en' | 'pt' | 'es' | 'fr';

const labels: Record<Lang, { g: string; b: string; p: string }> = {
  en: {
    g: 'Compare on Google Shopping',
    b: 'Compare on Bing Shopping',
    p: 'Compare on PriceGrabber',
  },
  pt: {
    g: 'Comparar no Google Shopping',
    b: 'Comparar no Bing Shopping',
    p: 'Comparar no PriceGrabber',
  },
  es: {
    g: 'Comparar en Google Shopping',
    b: 'Comparar en Bing Shopping',
    p: 'Comparar en PriceGrabber',
  },
  fr: {
    g: 'Comparer sur Google Shopping',
    b: 'Comparer sur Bing Shopping',
    p: 'Comparer sur PriceGrabber',
  },
};

export default function CompareLinks({
  query,
  lang = 'en',
}: {
  query: string;
  lang?: Lang;
}) {
  const t = labels[lang] || labels.en;
  const links = buildCompareLinks(query || '');

  const Btn = ({ label, href }: { label: string; href: string }) => (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm opacity-90 hover:opacity-100 bg-white"
    >
      {label}
    </Link>
  );

  return (
    <div className="flex flex-wrap gap-2">
      <Btn label={t.g} href={links.googleShopping} />
      <Btn label={t.b} href={links.bingShopping} />
      <Btn label={t.p} href={links.priceGrabber} />
    </div>
  );
}
