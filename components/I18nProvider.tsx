'use client';
import { Fragment, createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { es as esDateLocale, enUS as enDateLocale, type Locale as DateFnsLocale } from 'date-fns/locale';
import { INTL_LOCALE, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, type Locale } from '@/lib/i18n/config';
import { createTranslator, type Translate } from '@/lib/i18n/translate';
import { track } from '@/lib/analytics';

const DATE_FNS_LOCALES: Record<Locale, DateFnsLocale> = { es: esDateLocale, en: enDateLocale };

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translate;
  /** Para date-fns (format, formatDistance...). */
  dateLocale: DateFnsLocale;
  /** Etiqueta BCP 47 para Intl.NumberFormat / toLocaleDateString. */
  intlLocale: string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ initialLocale, children }: { initialLocale: Locale; children: React.ReactNode }) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((next: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
    document.documentElement.lang = next;
    setLocaleState(next);
    track('language_changed', { locale: next });
    // Vuelve a pintar los componentes de servidor (páginas 401/403, metadatos) en el nuevo idioma.
    router.refresh();
  }, [router]);

  const value = useMemo<I18nContextValue>(() => {
    const intlLocale = INTL_LOCALE[locale];
    return {
      locale,
      setLocale,
      t: createTranslator(locale),
      dateLocale: DATE_FNS_LOCALES[locale],
      intlLocale,
      formatNumber: (value, options) => new Intl.NumberFormat(intlLocale, options).format(value),
      formatDate: (value, options) => new Date(value).toLocaleDateString(intlLocale, options),
    };
  }, [locale, setLocale]);

  // key={locale}: al cambiar de idioma se vuelve a montar el contenido, así también se
  // actualizan los helpers de lib/ (etiquetas, formatos de fecha y dinero) que no usan el contexto.
  return (
    <I18nContext.Provider value={value}>
      <Fragment key={locale}>{children}</Fragment>
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n debe usarse dentro de <I18nProvider>');
  return context;
}

export function useT(): Translate {
  return useI18n().t;
}

// Inserta nodos de React en una traducción: richText(t('x'), { label: <strong>…</strong> }).
// t() deja intactos los {marcadores} sin valor, así que cada idioma decide dónde va el nodo.
export function richText(template: string, nodes: Record<string, React.ReactNode>): React.ReactNode {
  return template.split(/(\{\w+\})/g).map((part, index) => {
    const name = /^\{(\w+)\}$/.exec(part)?.[1];
    return name && name in nodes ? <Fragment key={index}>{nodes[name]}</Fragment> : part;
  });
}
