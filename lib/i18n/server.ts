import { cookies, headers } from 'next/headers';
import { LOCALE_COOKIE, isLocale, negotiateLocale, type Locale } from './config';
import { createTranslator } from './translate';

// Idioma elegido por el usuario (cookie) o, si nunca eligió, el de su navegador.
export function getServerLocale(): Locale {
  const stored = cookies().get(LOCALE_COOKIE)?.value;
  if (isLocale(stored)) return stored;
  return negotiateLocale(headers().get('accept-language'));
}

export function getServerTranslator() {
  return createTranslator(getServerLocale());
}
