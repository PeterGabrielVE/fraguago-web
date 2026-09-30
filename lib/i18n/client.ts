import { DEFAULT_LOCALE, INTL_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from './config';
import { translate, type MessageKey, type TranslateVars } from './translate';

// Idioma guardado en la cookie; sirve donde no hay <html lang> fiable (p. ej. global-error).
export function getCookieLocale(): Locale {
  if (typeof document === 'undefined') return DEFAULT_LOCALE;
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]+)`));
  return isLocale(match?.[1]) ? match![1] as Locale : getActiveLocale();
}

// Para código fuera de React (cliente HTTP, utilidades): el idioma activo vive en <html lang>.
export function getActiveLocale(): Locale {
  if (typeof document === 'undefined') return DEFAULT_LOCALE;
  const lang = document.documentElement.lang.split('-')[0];
  return isLocale(lang) ? lang : DEFAULT_LOCALE;
}

export function tActive(key: MessageKey, vars?: TranslateVars): string {
  return translate(getActiveLocale(), key, vars);
}

// Mapa de etiquetas que se traduce al leerlo: LABELS[valor] devuelve el texto en el idioma activo.
// Mantiene la forma Record<clave, string> de los mapas que ya usaban las pantallas.
// Solo cliente: en el servidor devuelve el idioma por defecto.
export function localizedRecord<K extends string>(keys: Record<K, MessageKey>): Record<K, string> {
  return new Proxy(keys as Record<string, MessageKey>, {
    get(target, prop) {
      const key = typeof prop === 'string' ? target[prop] : undefined;
      return key === undefined ? undefined : tActive(key);
    },
  }) as unknown as Record<K, string>;
}

// Formato de números/fechas con el idioma activo (para helpers fuera de React).
export function activeIntlLocale(): string {
  return INTL_LOCALE[getActiveLocale()];
}

// Lista de opciones { value, label } para <select> que se traduce en cada uso (se comporta como un array).
export function localizedOptions<K extends string>(keys: Record<K, MessageKey>): Array<{ value: K; label: string }> {
  const build = () => (Object.keys(keys) as K[]).map((value) => ({ value, label: tActive(keys[value]) }));
  return new Proxy([] as Array<{ value: K; label: string }>, {
    get(_target, prop) {
      const fresh = build();
      const value = Reflect.get(fresh, prop);
      return typeof value === 'function' ? value.bind(fresh) : value;
    },
    has: (_target, prop) => Reflect.has(build(), prop),
    ownKeys: () => Reflect.ownKeys(build()),
    getOwnPropertyDescriptor: (_target, prop) => Reflect.getOwnPropertyDescriptor(build(), prop),
  });
}
