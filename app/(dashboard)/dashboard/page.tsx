'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowDownRight, ArrowUpRight, CalendarCheck2, CreditCard, Users, Wallet } from 'lucide-react';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/reports/dashboard')
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

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

  if (error) {
    return (
      <div className="p-4 md:p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const income = data?.month?.income || 0;
  const expense = data?.month?.expense || 0;
  const balance = income - expense;

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
            <div className="text-3xl font-bold tracking-tight">{data?.activeMembers || 0}</div>
            <p className="mt-2 flex items-center gap-1 text-xs text-emerald-600"><ArrowUpRight className="h-3.5 w-3.5" /> Comunidad activa</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-cyan-500">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Membresías activas</CardTitle>
            <span className="rounded-lg bg-cyan-500/10 p-2 text-cyan-500"><CreditCard className="h-5 w-5" /></span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{data?.activeMemberships || 0}</div>
            <p className="mt-2 flex items-center gap-1 text-xs text-cyan-600"><ArrowUpRight className="h-3.5 w-3.5" /> Planes vigentes</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Asistencia hoy</CardTitle>
            <span className="rounded-lg bg-amber-500/10 p-2 text-amber-500"><CalendarCheck2 className="h-5 w-5" /></span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{data?.attendanceToday || 0}</div>
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
              ${balance.toFixed(2)}
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
            <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">${income.toFixed(2)}</div>
            <p className="mt-1 text-xs text-emerald-700/70 dark:text-emerald-400/70">Membresías y ventas</p>
          </CardContent>
        </Card>

        <Card className="bg-rose-500/[0.07]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-rose-700 dark:text-rose-400">Egresos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-rose-700 dark:text-rose-400">${expense.toFixed(2)}</div>
            <p className="mt-1 text-xs text-rose-700/70 dark:text-rose-400/70">Gastos operacionales</p>
          </CardContent>
        </Card>

        <Card className={balance >= 0 ? 'bg-indigo-500/[0.07]' : 'bg-amber-500/[0.07]'}>
          <CardHeader className="pb-2">
            <CardTitle className={`text-sm ${balance >= 0 ? 'text-indigo-700 dark:text-indigo-400' : 'text-amber-700 dark:text-amber-400'}`}>Utilidad neta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${balance >= 0 ? 'text-indigo-700 dark:text-indigo-400' : 'text-amber-700 dark:text-amber-400'}`}>
              ${balance.toFixed(2)}
            </div>
            <p className={`mt-1 text-xs ${balance >= 0 ? 'text-indigo-700/70 dark:text-indigo-400/70' : 'text-amber-600'}`}>
              {balance >= 0 ? '✓ Ganancia' : '⚠ Pérdida'}
            </p>
          </CardContent>
        </Card>
      </div>

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