// components/ShopForm.tsx
'use client';

import * as React from 'react';

type Lang = 'en' | 'pt' | 'es' | 'fr';

const L: Record<Lang, {
  title: string;
  person: string;
  occasion: string;
  description: string;
  getIdeas: string;
  liveSearch: string;
}> = {
  en: { title: 'Shop ideas', person: 'Person (e.g., boyfriend, mother)', occasion: 'Occasion', description: 'Describe the gift vibe', getIdeas: 'Get ideas', liveSearch: 'Live update' },
  pt: { title: 'Ideias de presentes', person: 'Pessoa (ex.: namorado, mãe)', occasion: 'Ocasião', description: 'Descreva o estilo do presente', getIdeas: 'Buscar ideias', liveSearch: 'Atualização ao digitar' },
  es: { title: 'Ideas de regalos', person: 'Persona (p. ej., novio, madre)', occasion: 'Ocasión', description: 'Describe el estilo del regalo', getIdeas: 'Obtener ideas', liveSearch: 'Actualizar en vivo' },
  fr: { title: 'Idées de cadeaux', person: 'Personne (ex. petit ami, mère)', occasion: 'Occasion', description: 'Décrivez le style du cadeau', getIdeas: 'Trouver des idées', liveSearch: 'Mise à jour en direct' },
};

export type ShopFormValues = {
  person: string;
  occasion: string;
  description: string;
};

export default function ShopForm({
  lang = 'en',
  initial = { person: '', occasion: '', description: '' },
  liveEnabledDefault = false,
  onGenerate, // async (values) => { ...fetch/populate links... }
}: {
  lang?: Lang;
  initial?: ShopFormValues;
  liveEnabledDefault?: boolean;
  onGenerate: (values: ShopFormValues) => Promise<void> | void;
}) {
  const t = L[lang];

  // Draft state the user types into (no network calls)
  const [draft, setDraft] = React.useState<ShopFormValues>(initial);

  // Optional “live” mode with debounce (off by default)
  const [live, setLive] = React.useState<boolean>(liveEnabledDefault);
  const [isComposing, setIsComposing] = React.useState<boolean>(false);
  const debounceRef = React.useRef<number | null>(null);

  // Call this when you actually want to refresh the links
  const runGenerate = React.useCallback(async (values: ShopFormValues) => {
    await onGenerate(values);
  }, [onGenerate]);

  // Debounced live update (only if user enables it)
  React.useEffect(() => {
    if (!live) return;
    if (isComposing) return; // don’t fire during iOS composition/prediction

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      runGenerate(draft);
    }, 500); // mild debounce
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [draft.person, draft.occasion, draft.description, live, isComposing, runGenerate]);

  function handleChange<K extends keyof ShopFormValues>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setDraft(prev => ({ ...prev, [key]: e.target.value }));
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await runGenerate(draft);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold">{t.title}</h2>

      <div className="grid gap-3">
        <label className="block">
          <span className="text-sm">{t.person}</span>
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2"
            value={draft.person}
            onChange={handleChange('person')}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            autoCapitalize="sentences"
            autoCorrect="on"
            inputMode="text"
            enterKeyHint="done"
            autoComplete="on"
          />
        </label>

        <label className="block">
          <span className="text-sm">{t.occasion}</span>
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2"
            value={draft.occasion}
            onChange={handleChange('occasion')}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            autoCapitalize="sentences"
            autoCorrect="on"
            inputMode="text"
            enterKeyHint="done"
            autoComplete="on"
          />
        </label>

        <label className="block">
          <span className="text-sm">{t.description}</span>
          <textarea
            className="mt-1 w-full rounded-xl border px-3 py-2"
            rows={3}
            value={draft.description}
            onChange={handleChange('description')}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            autoCapitalize="sentences"
            autoCorrect="on"
            inputMode="text"
            autoComplete="on"
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-2xl px-4 py-2 shadow border"
        >
          {t.getIdeas}
        </button>

        <label className="flex items-center gap-2 text-sm select-none">
          <input
            type="checkbox"
            checked={live}
            onChange={(e) => setLive(e.target.checked)}
          />
          {t.liveSearch}
        </label>
      </div>
    </form>
  );
}
