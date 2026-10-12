'use client';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { NoData } from '@/components/reports/report-ui';
import { formatBucket, formatCompact, type Granularity } from '@/lib/reports';

// Con pocos tramos las barras se leen mejor; con muchos quedan en hilos y pasa a línea/área.
const MAX_BAR_POINTS = 31;
const MAX_GROUPED_BAR_POINTS = 14;
const MARGIN = { left: 4, right: 12, top: 8, bottom: 0 };

// Fila del tooltip con el valor ya formateado (moneda, etc.).
function tooltipRow(config: ChartConfig, format: (value: number) => string) {
  return (value: unknown, name: unknown, item: { color?: string }) => (
    <>
      <span className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color }} />
      <span className="flex flex-1 items-center justify-between gap-4 leading-none">
        <span className="text-muted-foreground">{config[String(name)]?.label ?? String(name)}</span>
        <span className="font-mono font-medium text-foreground tabular-nums">{format(Number(value))}</span>
      </span>
    </>
  );
}

function buildAxes(granularity: Granularity, integer: boolean) {
  return {
    x: (
      <XAxis
        dataKey="date"
        tickLine={false}
        axisLine={false}
        tickMargin={8}
        minTickGap={24}
        tickFormatter={(key: string) => formatBucket(key, granularity, true)}
      />
    ),
    y: <YAxis tickLine={false} axisLine={false} width={44} allowDecimals={!integer} tickFormatter={formatCompact} />,
    label: (key: unknown) => formatBucket(String(key), granularity),
  };
}

interface SeriesChartProps {
  series: { date: string; value: number }[];
  granularity: Granularity;
  label: string;
  // Formato del valor en el tooltip; sin él se trata como un conteo entero.
  format?: (value: number) => string;
}

// Una sola magnitud en el tiempo (visitas, altas, ventas).
export function SeriesChart({ series, granularity, label, format }: SeriesChartProps) {
  const config = { value: { label, theme: { light: '#d97706', dark: '#f59e0b' } } } satisfies ChartConfig;
  const axes = buildAxes(granularity, !format);
  if (series.every((point) => point.value === 0)) return <NoData />;

  const tooltip = (
    <ChartTooltip
      content={
        <ChartTooltipContent
          labelFormatter={(_, payload) => axes.label(payload?.[0]?.payload?.date)}
          formatter={tooltipRow(config, format ?? ((v) => v.toLocaleString()))}
        />
      }
    />
  );

  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full">
      {series.length <= MAX_BAR_POINTS ? (
        <BarChart data={series} margin={MARGIN}>
          <CartesianGrid vertical={false} />
          {axes.x}
          {axes.y}
          {tooltip}
          <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      ) : (
        <AreaChart data={series} margin={MARGIN}>
          <CartesianGrid vertical={false} />
          {axes.x}
          {axes.y}
          {tooltip}
          <Area dataKey="value" type="monotone" stroke="var(--color-value)" fill="var(--color-value)" fillOpacity={0.1} strokeWidth={2} />
        </AreaChart>
      )}
    </ChartContainer>
  );
}

interface FinanceChartProps {
  series: { date: string; income: number; expense: number }[];
  granularity: Granularity;
  labels: { income: string; expense: string };
  format: (value: number) => string;
}

// Ingresos frente a egresos: mismos colores que la tendencia del dashboard.
export function FinanceChart({ series, granularity, labels, format }: FinanceChartProps) {
  const config = {
    income: { label: labels.income, theme: { light: '#059669', dark: '#059669' } },
    expense: { label: labels.expense, theme: { light: '#f43f5e', dark: '#f43f5e' } },
  } satisfies ChartConfig;
  const axes = buildAxes(granularity, false);
  if (series.every((point) => point.income === 0 && point.expense === 0)) return <NoData />;

  const tooltip = (
    <ChartTooltip
      content={
        <ChartTooltipContent
          labelFormatter={(_, payload) => axes.label(payload?.[0]?.payload?.date)}
          formatter={tooltipRow(config, format)}
        />
      }
    />
  );
  const legend = <ChartLegend content={<ChartLegendContent />} />;

  return (
    <ChartContainer config={config} className="aspect-auto h-72 w-full">
      {series.length <= MAX_GROUPED_BAR_POINTS ? (
        <BarChart data={series} margin={MARGIN} barGap={2}>
          <CartesianGrid vertical={false} />
          {axes.x}
          {axes.y}
          {tooltip}
          {legend}
          <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} maxBarSize={32} />
          <Bar dataKey="expense" fill="var(--color-expense)" radius={[4, 4, 0, 0]} maxBarSize={32} />
        </BarChart>
      ) : (
        <LineChart data={series} margin={MARGIN}>
          <CartesianGrid vertical={false} />
          {axes.x}
          {axes.y}
          {tooltip}
          {legend}
          <Line dataKey="income" type="monotone" stroke="var(--color-income)" strokeWidth={2} dot={false} />
          <Line dataKey="expense" type="monotone" stroke="var(--color-expense)" strokeWidth={2} dot={false} />
        </LineChart>
      )}
    </ChartContainer>
  );
}
