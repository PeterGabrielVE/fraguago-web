'use client';
// Gráficos de progreso (panel y portal del socio). Archivo aparte para que
// Recharts (~100 KB) se cargue bajo demanda con next/dynamic.
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Area, AreaChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { activeIntlLocale } from '@/lib/i18n/client';
import { useT } from '@/components/I18nProvider';

function shortDate(iso: string) {
  return new Intl.DateTimeFormat(activeIntlLocale(), { day: 'numeric', month: 'short' }).format(new Date(iso));
}

function fullDate(iso: string) {
  return new Intl.DateTimeFormat(activeIntlLocale(), { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-slate-300 px-4 text-center text-sm text-slate-500">
      {label}
    </div>
  );
}

export function WeightChart({ data }: { data: { date: string; weightKg: number }[] }) {
  const t = useT();
  const weightChartConfig = {
    weightKg: { label: t('progress.weightSeries'), theme: { light: '#d97706', dark: '#f59e0b' } },
  } satisfies ChartConfig;
  if (data.length < 2) return <EmptyChart label={t('progress.notEnoughWeight')} />;
  return (
    <ChartContainer config={weightChartConfig} className="aspect-auto h-56 w-full">
      <AreaChart data={data} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={shortDate} minTickGap={20} />
        <YAxis tickLine={false} axisLine={false} width={32} domain={['auto', 'auto']} />
        <ChartTooltip content={<ChartTooltipContent indicator="line" labelFormatter={(v) => fullDate(String(v))} />} />
        <Area
          dataKey="weightKg"
          type="monotone"
          stroke="var(--color-weightKg)"
          fill="var(--color-weightKg)"
          fillOpacity={0.1}
          strokeWidth={2}
          dot={{ r: 3, fill: 'var(--color-weightKg)', stroke: 'var(--color-background)', strokeWidth: 2 }}
        />
      </AreaChart>
    </ChartContainer>
  );
}

export function BodyFatChart({ data }: { data: { date: string; bodyFat: number }[] }) {
  const t = useT();
  const bodyFatChartConfig = {
    bodyFat: { label: t('progress.bodyFatSeries'), theme: { light: '#2a78d6', dark: '#3987e5' } },
  } satisfies ChartConfig;
  if (data.length < 2) return <EmptyChart label={t('progress.notEnoughBodyFat')} />;
  return (
    <ChartContainer config={bodyFatChartConfig} className="aspect-auto h-56 w-full">
      <AreaChart data={data} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={shortDate} minTickGap={20} />
        <YAxis tickLine={false} axisLine={false} width={32} domain={['auto', 'auto']} tickFormatter={(v: number) => `${v}%`} />
        <ChartTooltip content={<ChartTooltipContent indicator="line" labelFormatter={(v) => fullDate(String(v))} />} />
        <Area
          dataKey="bodyFat"
          type="monotone"
          stroke="var(--color-bodyFat)"
          fill="var(--color-bodyFat)"
          fillOpacity={0.1}
          strokeWidth={2}
          dot={{ r: 3, fill: 'var(--color-bodyFat)', stroke: 'var(--color-background)', strokeWidth: 2 }}
        />
      </AreaChart>
    </ChartContainer>
  );
}

export function BodyMeasurementsChart({ data }: { data: { date: string; chestCm?: number; waistCm?: number; armCm?: number }[] }) {
  const t = useT();
  const bodyMeasurementsChartConfig = {
    chestCm: { label: t('progress.chestSeries'), theme: { light: '#2a78d6', dark: '#3987e5' } },
    waistCm: { label: t('progress.waistSeries'), theme: { light: '#eb6834', dark: '#d95926' } },
    armCm: { label: t('progress.armSeries'), theme: { light: '#1baf7a', dark: '#199e70' } },
  } satisfies ChartConfig;
  if (data.length < 2) return <EmptyChart label={t('progress.notEnoughMeasurements')} />;
  return (
    <ChartContainer config={bodyMeasurementsChartConfig} className="aspect-auto h-56 w-full">
      <LineChart data={data} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={shortDate} minTickGap={20} />
        <YAxis tickLine={false} axisLine={false} width={32} domain={['auto', 'auto']} />
        <ChartTooltip content={<ChartTooltipContent indicator="line" labelFormatter={(v) => fullDate(String(v))} />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Line dataKey="chestCm" type="monotone" stroke="var(--color-chestCm)" strokeWidth={2} dot={false} connectNulls />
        <Line dataKey="waistCm" type="monotone" stroke="var(--color-waistCm)" strokeWidth={2} dot={false} connectNulls />
        <Line dataKey="armCm" type="monotone" stroke="var(--color-armCm)" strokeWidth={2} dot={false} connectNulls />
      </LineChart>
    </ChartContainer>
  );
}
