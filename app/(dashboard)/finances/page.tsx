'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, Filter, Plus, Receipt, Wallet } from 'lucide-react';
import { api } from '@/lib/api';
import ExportButton from '@/components/ExportButton';
import { CURRENCY_LABELS, formatMoney } from '@/lib/currency';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { localizedRecord } from '@/lib/i18n/client';
import { useI18n } from '@/components/I18nProvider';

type ExchangeRate = { currency: string; rate: number | string };
type Concept = { id: string; name: string; kind: 'INCOME' | 'EXPENSE' };

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ' +
  'focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition';

const TYPE_LABELS: Record<string, string> = localizedRecord({ INCOME: 'labels.conceptKind.INCOME', EXPENSE: 'labels.conceptKind.EXPENSE' });
const PAGE_SIZE = 20;

export default function FinancesPage() {
  const { t, intlLocale } = useI18n();
  const [summary, setSummary] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ type: 'INCOME' });
  const [error, setError] = useState('');

  const [filterType, setFilterType] = useState('');
  const [filterConceptId, setFilterConceptId] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  async function loadItems() {
    setItemsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (filterType) params.set('type', filterType);
      if (filterConceptId) params.set('conceptId', filterConceptId);
      if (filterFrom) params.set('from', `${filterFrom}T00:00:00`);
      if (filterTo) params.set('to', `${filterTo}T23:59:59`);
      const response: any = await api.get(`/transactions?${params.toString()}`);
      setItems(Array.isArray(response) ? response : response?.data ?? []);
      setTotalItems(response?.meta?.total ?? 0);
      setTotalPages(response?.meta?.totalPages ?? 1);
    } finally {
      setItemsLoading(false);
    }
  }

  async function loadSummary() {
    try {
      const params = new URLSearchParams();
      if (filterFrom) params.set('from', `${filterFrom}T00:00:00`);
      if (filterTo) params.set('to', `${filterTo}T23:59:59`);
      const qs = params.toString();
      setSummary(await api.get(`/transactions/summary${qs ? `?${qs}` : ''}`));
    } catch { /* STAFF no tiene acceso al resumen; se ignora */ }
  }

  useEffect(() => {
    api.list('/concepts').then(setConcepts).catch((e) => setError(t('operations.finances.conceptsLoadFailed', { error: e.message })));
    api.list('/exchange-rates/latest').then(setRates).catch(() => {});
  }, []);

  useEffect(() => {
    Promise.all([loadItems(), loadSummary()]).catch((e) => setError(e.message));
  }, [filterType, filterConceptId, filterFrom, filterTo, page]);

  const baseCurrency = summary?.currency ?? 'USD';
  const isForeignCurrency = form.currency && form.currency !== baseCurrency;
  const latestRateForCurrency = rates.find((r) => r.currency === form.currency)?.rate;
  const filtersActive = Boolean(filterType || filterConceptId || filterFrom || filterTo);
  // Conceptos del mismo tipo que el movimiento / que el filtro de tipo.
  const formConcepts = concepts.filter((c) => c.kind === form.type);
  const filterConcepts = filterType ? concepts.filter((c) => c.kind === filterType) : concepts;

  function clearFilters() {
    setFilterType('');
    setFilterConceptId('');
    setFilterFrom('');
    setFilterTo('');
    setPage(1);
  }

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
        conceptId: form.conceptId || undefined,
        note: form.note || undefined,
      });
      cancelForm();
      if (page !== 1) { setPage(1); } else { await Promise.all([loadItems(), loadSummary()]); }
    } catch (e: any) { setError(e.message); }
  }

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-sm">
              <Wallet className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{t('operations.finances.title')}</h1>
              <p className="mt-1 text-slate-600">{t('operations.finances.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
          <ExportButton
            resource="finances"
            filters={{ type: filterType, conceptId: filterConceptId, from: filterFrom, to: filterTo }}
          />
          <button
            onClick={() => (open ? cancelForm() : setOpen(true))}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${open
              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              : 'bg-amber-600 text-white hover:bg-amber-700'
              }`}
          >
            {open ? t('common.cancel') : <><Plus className="h-4 w-4" /> {t('common.new')}</>}
          </button>
          </div>
        </div>
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
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-emerald-700">{t('operations.finances.income')}</div>
            <span className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600"><ArrowUpRight className="h-4 w-4" /></span>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700">{formatMoney(summary?.income || 0, baseCurrency)}</div>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-red-700">{t('operations.finances.expenses')}</div>
            <span className="rounded-lg bg-red-500/10 p-2 text-red-600"><ArrowDownRight className="h-4 w-4" /></span>
          </div>
          <div className="mt-2 text-2xl font-bold text-red-700">{formatMoney(summary?.expense || 0, baseCurrency)}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-amber-700">{t('operations.finances.balance')}</div>
            <span className="rounded-lg bg-amber-500/10 p-2 text-amber-600"><Wallet className="h-4 w-4" /></span>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-700">{formatMoney(summary?.balance || 0, baseCurrency)}</div>
        </div>
      </div>

      {rates.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          {t('operations.finances.currentRates', { rates: rates.map((r) => `1 ${baseCurrency} = ${r.rate} ${r.currency}`).join(' · ') })}
        </div>
      )}

      {/* Modal: nuevo movimiento */}
      <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) cancelForm(); }}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={create} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>{t('operations.finances.newMovement')}</DialogTitle>
              <DialogDescription>{t('operations.finances.newMovementDesc')}</DialogDescription>
            </DialogHeader>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('operations.finances.type')}</label>
              <select
                value={form.type}
                onChange={(e) => {
                  // El concepto elegido deja de valer si es del otro tipo.
                  const type = e.target.value;
                  const keep = concepts.some((c) => c.id === form.conceptId && c.kind === type);
                  setForm({ ...form, type, conceptId: keep ? form.conceptId : '' });
                }}
                className={inputClass}
              >
                <option value="INCOME">{t('operations.finances.incomeOne')}</option>
                <option value="EXPENSE">{t('operations.finances.expenseOne')}</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('operations.finances.amount')} <span className="text-red-500">*</span></label>
              <input
                type="number" step="0.01" required
                value={form.amount ?? ''}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('operations.finances.currency')}</label>
              <select
                value={form.currency ?? ''}
                onChange={(e) => setForm({ ...form, currency: e.target.value, exchangeRate: '' })}
                className={inputClass}
              >
                <option value="">{t('operations.finances.baseCurrency', { currency: baseCurrency })}</option>
                {Object.entries(CURRENCY_LABELS).filter(([value]) => value !== baseCurrency).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {isForeignCurrency && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  {t('operations.finances.rate', { currency: form.currency, base: baseCurrency })}
                </label>
                <input
                  type="number" step="0.000001"
                  placeholder={latestRateForCurrency ? String(latestRateForCurrency) : t('operations.finances.ratePlaceholder')}
                  value={form.exchangeRate ?? ''}
                  onChange={(e) => setForm({ ...form, exchangeRate: e.target.value })}
                  className={inputClass}
                />
              </div>
            )}

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">{t('operations.finances.concept')}</label>
                <Link href="/concepts" className="text-xs font-medium text-amber-700 hover:text-amber-800">{t('operations.finances.manageConcepts')}</Link>
              </div>
              <select
                value={form.conceptId ?? ''}
                onChange={(e) => setForm({ ...form, conceptId: e.target.value })}
                className={inputClass}
              >
                <option value="">{t('operations.finances.noConcept')}</option>
                {formConcepts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {formConcepts.length === 0 && (
                <p className="mt-1.5 text-xs text-slate-500">
                  {t('operations.finances.noConceptsOfType', { type: TYPE_LABELS[form.type]?.toLowerCase() ?? t('operations.finances.thisType') })}{' '}
                  <Link href="/concepts" className="font-medium text-amber-700 hover:text-amber-800">{t('operations.finances.createOne')}</Link>{t('operations.finances.createOneHint')}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('operations.finances.note')}</label>
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
                {t('common.save')}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Movimientos + filtros */}
      <div className="grid gap-6 lg:grid-cols-[240px_1fr] lg:items-start">
        {/* Filtro lateral */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Filter className="h-4 w-4 text-amber-600" />
            {t('operations.finances.filters')}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">{t('operations.finances.type')}</label>
              <select
                value={filterType}
                onChange={(e) => {
                  const type = e.target.value;
                  setFilterType(type);
                  if (type && concepts.some((c) => c.id === filterConceptId && c.kind !== type)) setFilterConceptId('');
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              >
                <option value="">{t('operations.finances.all')}</option>
                <option value="INCOME">{t('operations.finances.income')}</option>
                <option value="EXPENSE">{t('operations.finances.expenses')}</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">{t('operations.finances.concept')}</label>
              <select
                value={filterConceptId}
                onChange={(e) => { setFilterConceptId(e.target.value); setPage(1); }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              >
                <option value="">{t('operations.finances.all')}</option>
                {filterConcepts.map((c) => <option key={c.id} value={c.id}>{c.name} ({TYPE_LABELS[c.kind]})</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">{t('operations.finances.from')}</label>
              <input
                type="date"
                value={filterFrom}
                onChange={(e) => { setFilterFrom(e.target.value); setPage(1); }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">{t('operations.finances.to')}</label>
              <input
                type="date"
                value={filterTo}
                onChange={(e) => { setFilterTo(e.target.value); setPage(1); }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              />
            </div>
            {filtersActive && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-semibold text-amber-700 hover:text-amber-800"
              >
                {t('operations.finances.clearFilters')}
              </button>
            )}
          </div>
        </div>

        {/* Tabla de movimientos */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
            <Receipt className="h-5 w-5 text-amber-600" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{t('operations.finances.movements', { count: totalItems })}</h2>
              <p className="text-xs text-slate-500">{t('operations.finances.movementsHint')}</p>
            </div>
          </div>
          {itemsLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              {filtersActive ? t('operations.finances.noFilterResults') : t('operations.finances.empty')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3 text-xs font-semibold">{t('operations.finances.type')}</th>
                    <th className="px-4 py-3 text-xs font-semibold">{t('operations.finances.amount')}</th>
                    <th className="px-4 py-3 text-xs font-semibold">{t('operations.finances.concept')}</th>
                    <th className="px-4 py-3 text-xs font-semibold">{t('operations.finances.note')}</th>
                    <th className="px-4 py-3 text-xs font-semibold">{t('operations.finances.date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((tx) => (
                    <tr key={tx.id} className="border-b border-slate-100 last:border-0 hover:bg-amber-50/30">
                      <td className="px-5 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tx.type === 'INCOME' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                          }`}>
                          {TYPE_LABELS[tx.type] ?? tx.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatMoney(tx.amount, tx.currency)}
                        {tx.currency && tx.currency !== baseCurrency && (
                          <span className="text-slate-400"> (≈ {formatMoney(tx.amountBase, baseCurrency)})</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{tx.concept?.name || '—'}</td>
                      <td className="px-4 py-3 text-slate-500">{tx.note || '—'}</td>
                      <td className="px-4 py-3 text-slate-700">{new Date(tx.date).toLocaleDateString(intlLocale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!itemsLoading && items.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span>
                {t('operations.finances.showing', { from: (page - 1) * PAGE_SIZE + 1, to: Math.min(page * PAGE_SIZE, totalItems), total: totalItems })}
              </span>
              <div className="flex items-center gap-1" aria-label={t('table.pagination')}>
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  aria-label={t('table.prevPage')}
                  className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => index + 1).map((pageNumber) => (
                  <button
                    type="button"
                    key={pageNumber}
                    onClick={() => setPage(pageNumber)}
                    className={`h-9 min-w-9 rounded-lg px-2 font-medium ${pageNumber === page ? 'bg-amber-600 text-white' : 'hover:bg-slate-100'}`}
                  >
                    {pageNumber}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  aria-label={t('table.nextPage')}
                  className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
