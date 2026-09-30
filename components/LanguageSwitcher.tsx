'use client';
import { Check, Languages } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useI18n } from '@/components/I18nProvider';
import { toast } from '@/components/ui/toast';
import { LOCALES, LOCALE_NAMES, type Locale } from '@/lib/i18n/config';
import { translate } from '@/lib/i18n/translate';
import { cn } from '@/lib/utils';

export default function LanguageSwitcher({ className, tone = 'default' }: { className?: string; tone?: 'default' | 'onDark' }) {
  const { locale, setLocale, t } = useI18n();

  function choose(next: Locale) {
    if (next === locale) return;
    setLocale(next);
    // Se anuncia en el idioma nuevo, que es el que el usuario acaba de elegir.
    toast.add({ title: translate(next, 'language.changed'), type: 'success' });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${t('language.change')} (${LOCALE_NAMES[locale]})`}
        title={t('language.change')}
        className={cn(
          'inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          tone === 'onDark'
            ? 'text-slate-300 hover:bg-white/10 hover:text-white'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground data-popup-open:bg-muted',
          className,
        )}
      >
        <Languages className="h-4 w-4" />
        <span className="uppercase">{locale}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t('language.label')}</DropdownMenuLabel>
          {LOCALES.map((option) => (
            <DropdownMenuItem key={option} onClick={() => choose(option)} className="justify-between gap-4">
              <span lang={option}>{LOCALE_NAMES[option]}</span>
              {option === locale && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
