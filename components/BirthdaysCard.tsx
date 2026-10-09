'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cake, Phone } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useT } from '@/components/I18nProvider';
import { activeIntlLocale } from '@/lib/i18n/client';
import { formatBirthDate, type BirthdayRow } from '@/lib/birthdays';
import { cn } from '@/lib/utils';

// Cumpleañeros del mes en curso (GET /members/birthdays sin parámetros).
export default function BirthdaysCard() {
  const t = useT();
  const [rows, setRows] = useState<BirthdayRow[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.get('/members/birthdays')
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setError(true));
  }, []);

  const monthLabel = new Intl.DateTimeFormat(activeIntlLocale(), { month: 'long' }).format(new Date());
  const today = new Date().getDate();

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Cake className="h-4 w-4 text-pink-500" />{t('birthdays.card.title')}
          <span className="font-normal capitalize text-muted-foreground">· {monthLabel}</span>
        </CardTitle>
        {rows && rows.length > 0 && <span className="rounded-full bg-pink-500/10 px-2.5 py-0.5 text-xs font-semibold text-pink-600 dark:text-pink-400">{rows.length}</span>}
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-muted-foreground">{t('birthdays.card.loadError')}</p>
        ) : rows === null ? (
          <div className="space-y-2">
            {[0, 1, 2].map((key) => <div key={key} className="h-12 animate-pulse rounded-lg bg-muted" />)}
          </div>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t('birthdays.card.empty')}</p>
        ) : (
          <ul className="fraguago-scrollbar max-h-80 space-y-1.5 overflow-y-auto pr-1">
            {rows.map((row) => {
              const isToday = row.day === today;
              const past = row.day < today;
              return (
                <li key={row.memberId}>
                  <Link
                    href={`/members?id=${row.memberId}&q=${encodeURIComponent(row.name)}`}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border px-3 py-2 transition hover:bg-muted/60',
                      isToday ? 'border-pink-300 bg-pink-500/[0.07] dark:border-pink-500/40' : 'border-border',
                      past && 'opacity-60',
                    )}
                  >
                    <span className={cn('flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg text-center leading-none', isToday ? 'bg-pink-500 text-white' : 'bg-muted text-foreground')}>
                      <span className="text-base font-bold">{row.day}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{row.name}</span>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatBirthDate(row.birthDate, activeIntlLocale())}</span>
                        {row.phone && <span className="hidden items-center gap-1 sm:inline-flex"><Phone className="h-3 w-3" />{row.phone}</span>}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-xs">
                      <span className={cn('block font-semibold', isToday ? 'text-pink-600 dark:text-pink-400' : 'text-foreground')}>
                        {isToday ? t('birthdays.card.today') : past ? t('birthdays.card.past') : t('birthdays.card.inDays', { count: row.daysUntil })}
                      </span>
                      {/* En los ya pasados "turns" es la edad del año que viene: se muestra la que cumplió. */}
                      <span className="text-muted-foreground">{t('birthdays.card.turns', { count: past ? row.turns - 1 : row.turns })}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
