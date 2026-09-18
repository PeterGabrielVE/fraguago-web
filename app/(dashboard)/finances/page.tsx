'use client';
import { useEffect, useState } from 'react';
import { AlertCircle, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { CURRENCY_LABELS, formatMoney } from '@/lib/currency';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type ExchangeRate = { currency: string; rate: number | string };

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ' +
  'focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition';

export default function FinancesPage() {
  const [summary, setSummary] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ type: 'INCOME' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setItems(await api.list('/transactions'));
    try { setSummary(await api.get('/transactions/summary')); } catch { }
    try { setRates(await api.list('/exchange-rates/latest')); } catch { }
  }
  useEffect(() => {
    load().catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const baseCurrency = summary?.currency ?? 'USD';
  const isForeignCurrency = form.currency && form.currency !== baseCurrency;
  const latestRateForCurrency = rates.find((r) => r.currency === form.currency)?.rate;

  function cancelForm() {
    setForm({ type: 'INCOME' });
    setOpen(false);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault(); setError('');
    try {
      await api.post('/transactions', {
        type: form.type,
        amount: Number(form.amount),
        currency: form.currency || undefined,
        exchangeRate: form.exchangeRate ? Number(form.exchangeRate) : undefined,
        note: form.note || undefined,
      });
      cancelForm();
      load();
    } catch (e: any) { setError(e.message); }
  }

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-start justify-between border-b pb-6">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Finanzas</h1>
          <p className="mt-2 text-slate-600">Ingresos y egresos del gimnasio.</p>
        </div>
        <button
          onClick={() => (open ? cancelForm() : setOpen(true))}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${open
            ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            : 'bg-amber-600 text-white hover:bg-amber-700'
            }`}
        >
          {open ? 'Cancelar' : <><Plus className="h-4 w-4" /> Nuevo</>}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="text-sm font-medium text-emerald-700">Ingresos</div>
          <div className="mt-1 text-2xl font-bold text-emerald-700">{formatMoney(summary?.income || 0, baseCurrency)}</div>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <div className="text-sm font-medium text-red-700">Egresos</div>
          <div className="mt-1 text-2xl font-bold text-red-700">{formatMoney(summary?.expense || 0, baseCurrency)}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="text-sm font-medium text-amber-700">Balance</div>
          <div className="mt-1 text-2xl font-bold text-amber-700">{formatMoney(summary?.balance || 0, baseCurrency)}</div>
        </div>
      </div>

      {rates.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          Tasas vigentes: {rates.map((r) => `1 ${baseCurrency} = ${r.rate} ${r.currency}`).join(' · ')}
        </div>
      )}

      {/* Modal: nuevo movimiento */}
      <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) cancelForm(); }}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={create} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Nuevo movimiento</DialogTitle>
              <DialogDescription>Registra un ingreso o egreso.</DialogDescription>
            </DialogHeader>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Tipo</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputClass}>
                <option value="INCOME">Ingreso</option>
                <option value="EXPENSE">Egreso</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Monto <span className="text-red-500">*</span></label>
              <input
                type="number" step="0.01" required
                value={form.amount ?? ''}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Moneda</label>
              <select
                value={form.currency ?? ''}
                onChange={(e) => setForm({ ...form, currency: e.target.value, exchangeRate: '' })}
                className={inputClass}
              >
                <option value="">{`Moneda base (${baseCurrency})`}</option>
                {Object.entries(CURRENCY_LABELS).filter(([value]) => value !== baseCurrency).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {isForeignCurrency && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Tasa (unidades de {form.currency} por 1 {baseCurrency})
                </label>
                <input
                  type="number" step="0.000001"
                  placeholder={latestRateForCurrency ? String(latestRateForCurrency) : 'usa la última tasa registrada'}
                  value={form.exchangeRate ?? ''}
                  onChange={(e) => setForm({ ...form, exchangeRate: e.target.value })}
                  className={inputClass}
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Nota</label>
              <input
                value={form.note ?? ''}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                className={inputClass}
              />
            </div>

            <DialogFooter>
              <button
                type="submit"
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition"
              >
                Guardar
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Tabla de movimientos */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Movimientos</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-slate-500">Aún no hay movimientos. Crea el primero con el botón &quot;Nuevo&quot;.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 text-xs font-semibold">Tipo</th>
                  <th className="px-4 py-3 text-xs font-semibold">Monto</th>
                  <th className="px-4 py-3 text-xs font-semibold">Nota</th>
                  <th className="px-4 py-3 text-xs font-semibold">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {items.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100 last:border-0 hover:bg-amber-50/30">
                    <td className="px-5 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${t.type === 'INCOME' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                        {t.type === 'INCOME' ? 'Ingreso' : 'Egreso'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatMoney(t.amount, t.currency)}
                      {t.currency && t.currency !== baseCurrency && (
                        <span className="text-slate-400"> (≈ {formatMoney(t.amountBase, baseCurrency)})</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{t.note || '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{new Date(t.date).toLocaleDateString('es-MX')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
