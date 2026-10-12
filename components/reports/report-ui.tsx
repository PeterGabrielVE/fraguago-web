'use client';
import type { ComponentType, ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Download, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useT } from '@/components/I18nProvider';
import { activeIntlLocale } from '@/lib/i18n/client';
import { formatRange, percentChange, type DateRange, type Granularity } from '@/lib/reports';
import { cn } from '@/lib/utils';

// Variación frente al periodo anterior. Va siempre con flecha y texto: el
// color solo refuerza si el cambio es bueno o malo (en egresos, subir es malo).
function Delta({ current, previous, upIsGood }: { current: number; previous: number; upIsGood: boolean }) {
  const t = useT();
  const change = percentChange(current, previous);
  if (change === null) return <p className="mt-2 text-xs text-muted-foreground">{t('reports.noPrevious')}</p>;
  if (Math.abs(change) < 0.05) {
    return <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><Minus className="h-3.5 w-3.5" />{t('reports.noChange')}</p>;
  }
  const up = change > 0;
  const Arrow = up ? ArrowUpRight : ArrowDownRight;
  const percent = new Intl.NumberFormat(activeIntlLocale(), { style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' })
    .format(change / 100);
  return (
    <p className="mt-2 flex flex-wrap items-center gap-x-1 text-xs text-muted-foreground">
      <span className={cn('flex items-center gap-0.5 font-medium', up === upIsGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
        <Arrow className="h-3.5 w-3.5" />{percent}
      </span>
      {t('reports.vsPrevious')}
    </p>
  );
}

interface ReportKpiProps {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  // Texto fijo bajo la cifra; se ignora si se pasa `compare`.
  hint?: string;
  compare?: { current: number; previous: number; upIsGood?: boolean };
}

export function ReportKpi({ label, value, icon: Icon, hint, compare }: ReportKpiProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <span className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-4 w-4" /></span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight tabular-nums md:text-3xl">{value}</div>
        {compare
          ? <Delta current={compare.current} previous={compare.previous} upIsGood={compare.upIsGood ?? true} />
          : hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export function ReportKpiGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
}

export function ReportSection({
  title, description, className, children,
}: { title: string; description?: string; className?: string; children: ReactNode }) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// Cabecera de cada reporte: qué periodo y agrupación se están viendo, y la descarga.
export function ReportToolbar({ range, granularity, onExport }: { range: DateRange; granularity: Granularity; onExport: () => void }) {
  const t = useT();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{formatRange(range)}</span>
        {' · '}{granularity === 'month' ? t('reports.byMonth') : t('reports.byDay')}
      </p>
      <Button type="button" variant="outline" onClick={onExport}>
        <Download />
        {t('reports.exportCsv')}
      </Button>
    </div>
  );
}

export function NoData() {
  const t = useT();
  return (
    <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
      {t('reports.noData')}
    </p>
  );
}
