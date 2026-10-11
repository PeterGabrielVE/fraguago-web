'use client';
// Gráficos del dashboard: archivo aparte para cargar Recharts bajo demanda
// (next/dynamic en page.tsx).
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

type DaySeries = { date: string; value: number };

function weekdayShort(dateStr: string) {
  return new Intl.DateTimeFormat(activeIntlLocale(), { weekday: 'short' }).format(new Date(`${dateStr}T00:00:00`));
}

function dayNumber(dateStr: string) {
  return String(new Date(`${dateStr}T00:00:00`).getDate());
}

function fullDateLabel(dateStr: string) {
  return new Intl.DateTimeFormat(activeIntlLocale(), { day: 'numeric', month: 'short' }).format(new Date(`${dateStr}T00:00:00`));
}

export function AttendanceTrendChart({ series }: { series: DaySeries[] }) {
  const t = useT();
  const attendanceChartConfig = {
    value: { label: t('dashboard.attendanceSeries'), theme: { light: '#d97706', dark: '#f59e0b' } },
  } satisfies ChartConfig;
  return (
    <ChartContainer config={attendanceChartConfig} className="aspect-auto h-56 w-full">
      <AreaChart data={series} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={weekdayShort} />
        <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent indicator="line" labelFormatter={(v) => fullDateLabel(String(v))} />} />
        <Area
          dataKey="value"
          type="monotone"
          stroke="var(--color-value)"
          fill="var(--color-value)"
          fillOpacity={0.1}
          strokeWidth={2}
          dot={{ r: 3, fill: 'var(--color-value)', stroke: 'var(--color-background)', strokeWidth: 2 }}
        />
      </AreaChart>
    </ChartContainer>
  );
}

export function FinanceTrendChart({ series }: { series: { date: string; income: number; expense: number }[] }) {
  const t = useT();
  const financeChartConfig = {
    income: { label: t('dashboard.income'), theme: { light: '#059669', dark: '#059669' } },
    expense: { label: t('dashboard.expenses'), theme: { light: '#f43f5e', dark: '#f43f5e' } },
  } satisfies ChartConfig;
  return (
    <ChartContainer config={financeChartConfig} className="aspect-auto h-64 w-full">
      <LineChart data={series} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={dayNumber} minTickGap={20} />
        <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => `$${v}`} />
        <ChartTooltip content={<ChartTooltipContent indicator="line" labelFormatter={(v) => fullDateLabel(String(v))} />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Line dataKey="income" type="monotone" stroke="var(--color-income)" strokeWidth={2} dot={false} />
        <Line dataKey="expense" type="monotone" stroke="var(--color-expense)" strokeWidth={2} dot={false} />
      </LineChart>
    </ChartContainer>
  );
}
