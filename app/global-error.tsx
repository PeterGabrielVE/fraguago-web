'use client';

import { useEffect } from 'react';
import { reportError } from '@/lib/errorReporter';
import { getCookieLocale } from '@/lib/i18n/client';
import { createTranslator } from '@/lib/i18n/translate';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError({ type: 'global-error', error, digest: error.digest });
  }, [error]);

  // Este componente reemplaza al layout raíz, así que no hay I18nProvider disponible.
  const locale = getCookieLocale();
  const t = createTranslator(locale);
  return (
    <html lang={locale}>
      <body className="flex min-h-screen flex-col items-center justify-center gap-4">
        <h2 className="text-lg font-semibold">{t('errors.global.title')}</h2>
        <button onClick={reset} className="rounded-md border px-4 py-2">
          {t('common.reload')}
        </button>
      </body>
    </html>
  );
}