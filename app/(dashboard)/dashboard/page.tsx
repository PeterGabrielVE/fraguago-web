'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

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
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600 mx-auto mb-4" />
          <p className="text-slate-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
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
    <div className="space-y-6 p-8">
      <div className="border-b pb-6">
        <h1 className="text-4xl font-bold">Dashboard</h1>
        <p className="text-slate-600 mt-2">Resumen de tu gimnasio</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Socios Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data?.activeMembers || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Membresías Activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{data?.activeMemberships || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Asistencia Hoy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{data?.attendanceToday || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${balance.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-700">Ingresos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">${income.toFixed(2)}</div>
            <p className="text-xs text-green-600 mt-1">Membresías y ventas</p>
          </CardContent>
        </Card>

        <Card className="bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-700">Egresos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-700">${expense.toFixed(2)}</div>
            <p className="text-xs text-red-600 mt-1">Gastos operacionales</p>
          </CardContent>
        </Card>

        <Card className={balance >= 0 ? 'bg-green-50' : 'bg-amber-50'}>
          <CardHeader className="pb-2">
            <CardTitle className={`text-sm ${balance >= 0 ? 'text-green-700' : 'text-amber-700'}`}>Utilidad Neta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${balance >= 0 ? 'text-green-700' : 'text-amber-700'}`}>
              ${balance.toFixed(2)}
            </div>
            <p className={`text-xs mt-1 ${balance >= 0 ? 'text-green-600' : 'text-amber-600'}`}>
              {balance >= 0 ? '✓ Ganancia' : '⚠ Pérdida'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <a href="/members" className="p-4 border rounded-lg hover:bg-amber-50">
              <p className="font-semibold">Registrar Socio</p>
              <p className="text-xs text-slate-500">Nuevo miembro</p>
            </a>
            <a href="/attendance" className="p-4 border rounded-lg hover:bg-amber-50">
              <p className="font-semibold">Check-in</p>
              <p className="text-xs text-slate-500">Registrar entrada</p>
            </a>
            <a href="/finances" className="p-4 border rounded-lg hover:bg-amber-50">
              <p className="font-semibold">Finanzas</p>
              <p className="text-xs text-slate-500">Ver movimientos</p>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}