'use client';

type Lang = 'en' | 'pt' | 'es' | 'fr';

const TXT: Record<Lang, { open: string }> = {
  en: { open: 'Compare prices' },
  pt: { open: 'Comparar preços' },
  es: { open: 'Comparar precios' },
  fr: { open: 'Comparer les prix' },
};

function detectLang(): Lang {
  try {
    const url = new URL(window.location.href);
    const qp = (url.searchParams.get('lang') || '').toLowerCase();
    const cookie = document.cookie.match(/(?:^|;)\s*zola_lang=([^;]+)/)?.[1]?.toLowerCase() || '';
    const stored = localStorage.getItem('z_pref_lang')?.toLowerCase() || '';

    const v = (qp || cookie || stored || 'en') as Lang;
    return (['en', 'pt', 'es', 'fr'].includes(v) ? v : 'en') as Lang;
  } catch {
    return 'en';
  }
}

export default function ShopCTA({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const lang = typeof window !== 'undefined' ? detectLang() : 'en';

  const common: React.CSSProperties = {
    borderRadius: 8,
    textDecoration: 'none',
    display: 'inline-block',
    fontWeight: 700,
    cursor: 'pointer',
    padding: size === 'sm' ? '6px 10px' : '8px 12px',
    fontSize: size === 'sm' ? 13 : 14,
    background: '#059669',
    color: '#fff',
  };

  function go(e: React.MouseEvent) {
    e.preventDefault();
    window.location.href = `/compare?lang=${lang}`;
  }

  return (
    <a href="#" onClick={go} style={common}>
      {TXT[lang].open}
    </a>
  );
}
