'use client';
import { AlertCircle, CreditCard } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { AsyncBoundary } from '@/components/async-boundary';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { isMembershipActive, type Membership, type PaginatedResponse } from '@/lib/portal';

export default function PortalMembershipPage() {
  const { status, data, error, refetch } = useAsync<PaginatedResponse<Membership>>(
    () => api.get('/me/membership') as Promise<PaginatedResponse<Membership>>,
    [],
  );

  return (
    <div className="space-y-6 p-8">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-4 p-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-sm">
            <CreditCard className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Mi membresía</h1>
            <p className="mt-1 text-slate-600">Historial de planes contratados y su vigencia.</p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <AsyncBoundary
          status={status}
          data={data}
          error={error}
          onRetry={refetch}
          isEmpty={(d) => (d?.data ?? []).length === 0}
          loading={
            <div className="flex items-center justify-center py-16">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
            </div>
          }
          errorFallback={
            <div role="alert" className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <p className="text-sm text-slate-600">{error?.message ?? 'No se pudieron cargar los datos.'}</p>
              <button onClick={refetch} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm transition hover:bg-slate-50">
                Reintentar
              </button>
            </div>
          }
          empty={
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <CreditCard className="h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500">Todavía no tienes membresías registradas.</p>
            </div>
          }
        >
          {(res) => (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    <th className="px-4 py-3 font-semibold text-slate-700">Plan</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Precio</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Inicio</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Fin</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {res.data.map((m) => {
                    const active = isMembershipActive(m);
                    return (
                      <tr key={m.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{m.plan?.name ?? '—'}</p>
                          <p className="text-xs text-slate-500">{m.plan?.type ?? ''}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {m.plan?.price != null ? `$${Number(m.plan.price).toFixed(2)}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {m.startDate ? new Date(m.startDate).toLocaleDateString('es-MX') : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {m.endDate ? new Date(m.endDate).toLocaleDateString('es-MX') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={active ? 'border-transparent bg-emerald-100 text-emerald-700' : 'border-transparent bg-red-100 text-red-700'}
                          >
                            {active ? 'Vigente' : 'Vencida'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </AsyncBoundary>
      </div>
    </div>
  );
}
