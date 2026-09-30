import { es, type Messages } from './messages/es';
import { en } from './messages/en';
import { DEFAULT_LOCALE, INTL_LOCALE, type Locale } from './config';

export const MESSAGES: Record<Locale, Messages> = { es, en };

// Claves con puntos ("common.save") derivadas del diccionario base, para que t() esté tipado.
type Leaves<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Leaves<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

type AllKeys = Leaves<Messages>;
// Las claves plurales se escriben "x_one" / "x_other" y se piden como "x" con { count }.
type PluralBase<K> = K extends `${infer Base}_one` ? Base : never;
export type MessageKey = Exclude<AllKeys, `${string}_one` | `${string}_other`> | PluralBase<AllKeys>;

export type TranslateVars = Record<string, string | number | null | undefined>;
export type Translate = (key: MessageKey, vars?: TranslateVars) => string;

function lookup(messages: Messages, key: string): string | undefined {
  let node: unknown = messages;
  for (const part of key.split('.')) {
    if (node == null || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

function resolve(locale: Locale, key: string, count: unknown): string | undefined {
  const messages = MESSAGES[locale];
  if (typeof count === 'number') {
    const rule = new Intl.PluralRules(INTL_LOCALE[locale]).select(count) === 'one' ? 'one' : 'other';
    const plural = lookup(messages, `${key}_${rule}`);
    if (plural !== undefined) return plural;
  }
  return lookup(messages, key);
}

function interpolate(template: string, locale: Locale, vars?: TranslateVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name];
    if (value === undefined || value === null) return match;
    return typeof value === 'number' ? new Intl.NumberFormat(INTL_LOCALE[locale]).format(value) : value;
  });
}

// Si falta una traducción se usa el español, y si tampoco existe, la propia clave (visible en QA).
export function translate(locale: Locale, key: MessageKey, vars?: TranslateVars): string {
  const template = resolve(locale, key, vars?.count) ?? resolve(DEFAULT_LOCALE, key, vars?.count);
  if (template === undefined) {
    if (process.env.NODE_ENV !== 'production') console.warn(`[i18n] Falta la clave "${key}"`);
    return key;
  }
  return interpolate(template, locale, vars);
}

export function createTranslator(locale: Locale): Translate {
  return (key, vars) => translate(locale, key, vars);
}
