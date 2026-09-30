// Idiomas de la interfaz. Para añadir uno: agrégalo aquí y crea messages/<código>.ts.
export const LOCALES = ['es', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'es';
// Cookie (no localStorage) para que el servidor pinte ya en el idioma correcto, sin parpadeo.
export const LOCALE_COOKIE = 'fg_locale';
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

// Cada idioma se muestra en su propio nombre, como es habitual en los selectores de idioma.
export const LOCALE_NAMES: Record<Locale, string> = {
  es: 'Español',
  en: 'English',
};

// Etiqueta BCP 47 para Intl (fechas, números, monedas).
export const INTL_LOCALE: Record<Locale, string> = {
  es: 'es-VE',
  en: 'en-US',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

// Elige el idioma a partir de la cabecera Accept-Language del navegador ("en-US,en;q=0.9,es;q=0.8").
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const ranked = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params.find((param) => param.trim().startsWith('q='));
      return { base: tag.trim().toLowerCase().split('-')[0], q: q ? Number(q.trim().slice(2)) || 0 : 1 };
    })
    .sort((a, b) => b.q - a.q);
  return ranked.find((entry) => isLocale(entry.base))?.base as Locale | undefined ?? DEFAULT_LOCALE;
}
