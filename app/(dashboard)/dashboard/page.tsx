'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarCheck2,
  Clock,
  CreditCard,
  ShoppingBag,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';

type DaySeries = { date: string; value: number };

type DashboardData = {
  summary: {
    activeMembers: number;
    activeMemberships: number;
    attendanceToday: number;
    month: { income: number; expense: number; balance: number };
  };
  members: {
    total: number;
    byStatus: { ACTIVE: number; INACTIVE: number; SUSPENDED: number };
    newThisMonth: number;
  };
  attendance: { total: number; today: number; series: DaySeries[] };
  revenue: { total: number; count: number; series: DaySeries[] };
  expenses: { total: number; count: number; series: DaySeries[] };
  memberships: {
    active: number;
    expired: number;
    expiringSoon: number;
    byPlan: { planId: string; plan: string; count: number }[];
  };
  sales: {
    totalRevenue: number;
    unitsSold: number;
    saleCount: number;
    topProducts: { productId: string; product: string; revenue: number; units: number }[];
  };
};

function money(v: number) {
  return `$${v.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function weekdayShort(dateStr: string) {
  return new Intl.DateTimeFormat('es-MX', { weekday: 'short' }).format(new Date(`${dateStr}T00:00:00`));
}

function dayNumber(dateStr: string) {
  return String(new Date(`${dateStr}T00:00:00`).getDate());
}

function fullDateLabel(dateStr: string) {
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(new Date(`${dateStr}T00:00:00`));
}

// Ranking de una sola magnitud (plan más usado, producto más vendido): un solo
// hue secuencial, nunca un color por fila (eso gastaría el canal de identidad
// en algo que el largo de la barra ya muestra).
function RankedBarList({
  items, valueLabel, emptyLabel,
}: { items: { label: string; value: number; caption?: string }[]; valueLabel: (v: number) => string; emptyLabel: string }) {
  if (items.length === 0) {
    return <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium text-foreground">{item.label}</span>
            <span className="shrink-0 font-mono text-muted-foreground tabular-nums">{valueLabel(item.value)}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-amber-500/10">
            <div
              className="h-full rounded-full bg-amber-600 dark:bg-amber-500"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
          {item.caption && <p className="mt-1 text-xs text-muted-foreground">{item.caption}</p>}
        </div>
      ))}
    </div>
  );
}

// Reparto de socios por estado: es un campo de estado, no identidad libre, así
// que usa la paleta reservada (bueno / neutro / crítico) siempre con ícono +
// etiqueta, nunca solo color.
function MemberStatusBar({ byStatus, total }: { byStatus: DashboardData['members']['byStatus']; total: number }) {
  const segments = [
    { key: 'ACTIVE', label: 'Activos', value: byStatus.ACTIVE, className: 'bg-emerald-600' },
    { key: 'INACTIVE', label: 'Inactivos', value: byStatus.INACTIVE, className: 'bg-slate-500' },
    { key: 'SUSPENDED', label: 'Suspendidos', value: byStatus.SUSPENDED, className: 'bg-rose-500' },
  ] as const;
  const safeTotal = Math.max(1, total);

  return (
    <div>
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-muted">
        {segments.filter((s) => s.value > 0).map((s) => (
          <div key={s.key} className={s.className} style={{ width: `${(s.value / safeTotal) * 100}%` }} />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.className}`} />
            <div>
              <p className="font-semibold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const attendanceChartConfig = {
  value: { label: 'Asistencias', theme: { light: '#d97706', dark: '#f59e0b' } },
} satisfies ChartConfig;

function AttendanceTrendChart({ series }: { series: DaySeries[] }) {
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

const financeChartConfig = {
  income: { label: 'Ingresos', theme: { light: '#059669', dark: '#059669' } },
  expense: { label: 'Egresos', theme: { light: '#f43f5e', dark: '#f43f5e' } },
} satisfies ChartConfig;

function FinanceTrendChart({ series }: { series: { date: string; income: number; expense: number }[] }) {
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

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/dashboard')
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const financeSeries = useMemo(() => {
    const incomeMap = new Map((data?.revenue.series ?? []).map((s) => [s.date, s.value]));
    const expenseMap = new Map((data?.expenses.series ?? []).map((s) => [s.date, s.value]));
    const dates = [...new Set([...incomeMap.keys(), ...expenseMap.keys()])].sort();
    return dates.map((date) => ({ date, income: incomeMap.get(date) ?? 0, expense: expenseMap.get(date) ?? 0 }));
  }, [data]);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <p className="text-muted-foreground">Cargando resumen...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 md:p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'No se pudo cargar el resumen.'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const { income, expense, balance } = data.summary.month;

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-1 text-sm font-medium text-primary">Panel de control</p>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Hola, bienvenido a FraguaGo</h1>
          <p className="mt-2 text-muted-foreground">Aquí tienes el pulso de tu gimnasio hoy.</p>
        </div>
        <div className="rounded-lg bg-card px-4 py-2 text-sm text-muted-foreground ring-1 ring-foreground/10">
          {new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(new Date())}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Socios activos</CardTitle>
            <span className="rounded-lg bg-primary/10 p-2 text-primary"><Users className="h-5 w-5" /></span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{data.summary.activeMembers}</div>
            <p className="mt-2 flex items-center gap-1 text-xs text-emerald-600"><ArrowUpRight className="h-3.5 w-3.5" /> Comunidad activa</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-cyan-500">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Membresías activas</CardTitle>
            <span className="rounded-lg bg-cyan-500/10 p-2 text-cyan-500"><CreditCard className="h-5 w-5" /></span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{data.summary.activeMemberships}</div>
            <p className="mt-2 flex items-center gap-1 text-xs text-cyan-600"><ArrowUpRight className="h-3.5 w-3.5" /> Planes vigentes</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Asistencia hoy</CardTitle>
            <span className="rounded-lg bg-amber-500/10 p-2 text-amber-500"><CalendarCheck2 className="h-5 w-5" /></span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{data.summary.attendanceToday}</div>
            <p className="mt-2 text-xs text-muted-foreground">Registros del día</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Balance del mes</CardTitle>
            <span className="rounded-lg bg-emerald-500/10 p-2 text-emerald-500"><Wallet className="h-5 w-5" /></span>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold tracking-tight ${balance >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
              {money(balance)}
            </div>
            <p className={`mt-2 flex items-center gap-1 text-xs ${balance >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
              {balance >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />} Resultado acumulado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="bg-emerald-500/[0.07]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-emerald-700 dark:text-emerald-400">Ingresos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">{money(income)}</div>
            <p className="mt-1 text-xs text-emerald-700/70 dark:text-emerald-400/70">Membresías y ventas</p>
          </CardContent>
        </Card>

        <Card className="bg-rose-500/[0.07]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-rose-700 dark:text-rose-400">Egresos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-rose-700 dark:text-rose-400">{money(expense)}</div>
            <p className="mt-1 text-xs text-rose-700/70 dark:text-rose-400/70">Gastos operacionales</p>
          </CardContent>
        </Card>

        <Card className={balance >= 0 ? 'bg-indigo-500/[0.07]' : 'bg-amber-500/[0.07]'}>
          <CardHeader className="pb-2">
            <CardTitle className={`text-sm ${balance >= 0 ? 'text-indigo-700 dark:text-indigo-400' : 'text-amber-700 dark:text-amber-400'}`}>Utilidad neta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${balance >= 0 ? 'text-indigo-700 dark:text-indigo-400' : 'text-amber-700 dark:text-amber-400'}`}>
              {money(balance)}
            </div>
            <p className={`mt-1 text-xs ${balance >= 0 ? 'text-indigo-700/70 dark:text-indigo-400/70' : 'text-amber-600'}`}>
              {balance >= 0 ? '✓ Ganancia' : '⚠ Pérdida'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tendencias */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4 text-amber-600" />Asistencia — últimos 7 días</CardTitle>
          </CardHeader>
          <CardContent>
            <AttendanceTrendChart series={data.attendance.series} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Ingresos vs. egresos — este mes</CardTitle>
          </CardHeader>
          <CardContent>
            <FinanceTrendChart series={financeSeries} />
          </CardContent>
        </Card>
      </div>

      {/* Socios y membresías */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Socios por estado</CardTitle>
            <span className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              <UserPlus className="h-3.5 w-3.5" />{data.members.newThisMonth} nuevos este mes
            </span>
          </CardHeader>
          <CardContent>
            <MemberStatusBar byStatus={data.members.byStatus} total={data.members.total} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Membresías</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-emerald-500/[0.07] py-3">
                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{data.memberships.active}</p>
                <p className="text-xs text-muted-foreground">Vigentes</p>
              </div>
              <div className="rounded-lg bg-amber-500/[0.07] py-3">
                <p className="flex items-center justify-center gap-1 text-xl font-bold text-amber-700 dark:text-amber-400"><Clock className="h-4 w-4" />{data.memberships.expiringSoon}</p>
                <p className="text-xs text-muted-foreground">Por vencer (7d)</p>
              </div>
              <div className="rounded-lg bg-rose-500/[0.07] py-3">
                <p className="text-xl font-bold text-rose-700 dark:text-rose-400">{data.memberships.expired}</p>
                <p className="text-xs text-muted-foreground">Vencidas</p>
              </div>
            </div>
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Planes con más socios activos</p>
              <RankedBarList
                items={data.memberships.byPlan.map((p) => ({ label: p.plan, value: p.count }))}
                valueLabel={(v) => `${v} socio${v === 1 ? '' : 's'}`}
                emptyLabel="Aún no hay membresías activas."
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ventas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><ShoppingBag className="h-4 w-4 text-amber-600" />Ventas del mes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="grid grid-cols-3 gap-3 text-center lg:col-span-1 lg:grid-cols-1 lg:content-start">
              <div className="rounded-lg bg-muted/50 py-3">
                <p className="text-xl font-bold text-foreground">{money(data.sales.totalRevenue)}</p>
                <p className="text-xs text-muted-foreground">Facturado</p>
              </div>
              <div className="rounded-lg bg-muted/50 py-3">
                <p className="text-xl font-bold text-foreground">{data.sales.unitsSold}</p>
                <p className="text-xs text-muted-foreground">Unidades vendidas</p>
              </div>
              <div className="rounded-lg bg-muted/50 py-3">
                <p className="text-xl font-bold text-foreground">{data.sales.saleCount}</p>
                <p className="text-xs text-muted-foreground">Tickets</p>
              </div>
            </div>
            <div className="lg:col-span-2">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Top 5 productos por facturación</p>
              <RankedBarList
                items={data.sales.topProducts.map((p) => ({ label: p.product, value: p.revenue, caption: `${p.units} unidad${p.units === 1 ? '' : 'es'}` }))}
                valueLabel={money}
                emptyLabel="Aún no hay ventas registradas este mes."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <a href="/members" className="rounded-lg border border-border p-4 transition hover:border-primary/40 hover:bg-primary/[0.04]">
              <p className="font-semibold">Registrar socio</p>
              <p className="text-xs text-muted-foreground">Nuevo miembro</p>
            </a>
            <a href="/attendance" className="rounded-lg border border-border p-4 transition hover:border-primary/40 hover:bg-primary/[0.04]">
              <p className="font-semibold">Check-in</p>
              <p className="text-xs text-muted-foreground">Registrar entrada</p>
            </a>
            <a href="/finances" className="rounded-lg border border-border p-4 transition hover:border-primary/40 hover:bg-primary/[0.04]">
              <p className="font-semibold">Finanzas</p>
              <p className="text-xs text-muted-foreground">Ver movimientos</p>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
