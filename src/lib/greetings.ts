// Single source of truth for Zola's greeting lines.
//
// The chat widget renders these, and /api/speak validates against them so the
// speech endpoint can only ever voice a greeting the app itself displays.
// Nothing here is a prompt; it is the same literal text the widget shows.

export type Lang = 'en' | 'pt' | 'es' | 'fr';

export const GREET_LANGS: readonly Lang[] = ['en', 'pt', 'es', 'fr'] as const;

export const GREET_DEFAULT: Record<Lang, string> = {
  en: "Hi! I’m Zola. What’s your name?",
  pt: "Oi! Eu sou o Zola. Qual é o seu nome?",
  es: "¡Hola! Soy Zola. ¿Cuál es tu nombre?",
  fr: "Salut ! Je suis Zola. Quel est ton prénom ?",
};

export const GREET_WITH_NAME: Record<Lang, (name: string) => string> = {
  en: (name: string) => `Hey ${name}, I'm here. What do you want to explore first?`,
  pt: (name: string) => `Oi ${name}, tô aqui. O que quer explorar primeiro?`,
  es: (name: string) => `Hola ${name}, aquí estoy. ¿Qué quieres ver primero?`,
  fr: (name: string) => `Salut ${name}, je suis là. On commence par quoi, ${name}?`,
};

// The widget only ever interpolates a single first name (full_name.split(" ")[0]),
// so the slot is one word: no spaces, digits or punctuation to hide text in.
const NAME_PATTERN = "[\\p{L}\\p{M}'’-]{1,40}";
const SENTINEL = '@@NAME@@'; // no greeting contains '@'

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Rebuilds each template as an anchored pattern. Where a template uses the name
// more than once (fr), later slots become a backreference so both must match.
function namedGreetingPattern(build: (name: string) => string): RegExp {
  const parts = build(SENTINEL).split(SENTINEL).map(escapeRegExp);
  let body = parts[0];
  for (let i = 1; i < parts.length; i++) {
    body += (i === 1 ? `(${NAME_PATTERN})` : '\\1') + parts[i];
  }
  return new RegExp(`^${body}$`, 'u');
}

const NAMED_PATTERNS = GREET_LANGS.map((lang) => namedGreetingPattern(GREET_WITH_NAME[lang]));

/** True only for a greeting the widget can actually display, in any language. */
export function isGreeting(text: string): boolean {
  const value = text.trim();
  if (!value) return false;
  if (GREET_LANGS.some((lang) => GREET_DEFAULT[lang] === value)) return true;
  return NAMED_PATTERNS.some((pattern) => pattern.test(value));
}
