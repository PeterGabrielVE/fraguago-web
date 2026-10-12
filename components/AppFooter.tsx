'use client';

import { useT } from '@/components/I18nProvider';
import { APP_VERSION } from '@/lib/version';
import { cn } from '@/lib/utils';

// Pie de página del panel y del portal: marca, derechos y versión.
export default function AppFooter({ className }: { className?: string }) {
  const t = useT();
  return (
    <footer className={cn('border-t border-border px-4 py-4 text-xs text-muted-foreground md:px-8', className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        {/* suppressHydrationWarning: el año se calcula en el navegador. */}
        <p suppressHydrationWarning>
          © {new Date().getFullYear()} FraguaGo. {t('common.rightsReserved')}
        </p>
        <p>v{APP_VERSION}</p>
      </div>
    </footer>
  );
}
