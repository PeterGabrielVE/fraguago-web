'use client';
import { useState } from 'react';
import { Package, PackagePlus, TriangleAlert } from 'lucide-react';
import ResourceManager from '@/components/ResourceManager';
import { CURRENCY_OPTIONS, formatMoney } from '@/lib/currency';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/toast';
import { useAsync } from '@/hooks/useAsync';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { richText, useT } from '@/components/I18nProvider';

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ' +
  'focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition';

// coincide con el default del backend (LowStockQueryDto.threshold)
const LOW_STOCK_THRESHOLD = 5;

function LowStockBanner({ refreshKey }: { refreshKey: number }) {
  const t = useT();
  const { data } = useAsync<any[]>(
    () => api.list(`/products/low-stock?threshold=${LOW_STOCK_THRESHOLD}`),
    [refreshKey],
  );
  const lowStock = data ?? [];
  if (lowStock.length === 0) return null;

  const names = lowStock.slice(0, 3).map((p) => p.name).join(', ');
  const rest = lowStock.length > 3 ? t('operations.products.andMore', { count: lowStock.length - 3 }) : '';

  return (
    <div className="px-8 pt-8">
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
        <p>
          <span className="font-medium">{t('operations.products.lowStockBanner', { count: lowStock.length })}</span>
          {t('operations.products.lowStockDetail', { threshold: LOW_STOCK_THRESHOLD, names, rest })}
        </p>
      </div>
    </div>
  );
}

function AdjustStockDialog({
  row,
  open,
  onOpenChange,
  onSaved,
}: {
  row: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const t = useT();
  const [change, setChange] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  function reset() {
    setChange('');
    setReason('');
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!row) return;
    const delta = Number(change);
    if (!delta) {
      toast.add({ title: t('operations.products.invalidChange'), type: 'error' });
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/products/${row.id}/stock`, { change: delta, reason: reason || undefined });
      toast.add({ title: t('operations.products.stockUpdated'), type: 'success' });
      onOpenChange(false);
      reset();
      onSaved();
    } catch (err: any) {
      toast.add({ title: t('operations.products.stockFailed'), description: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) reset(); }}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={save} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{t('operations.products.adjustStock')}</DialogTitle>
            <DialogDescription>
              {richText(t('operations.products.currentStock'), { name: row?.name, stock: <span className="font-medium text-slate-800">{row?.stock}</span> })}
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('operations.products.quantity')} <span className="text-red-500">*</span></label>
            <input
              type="number"
              required
              value={change}
              onChange={(e) => setChange(e.target.value)}
              placeholder={t('operations.products.quantityPlaceholder')}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('operations.products.reason')}</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('operations.products.reasonPlaceholder')}
              className={inputClass}
            />
          </div>
          <DialogFooter>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition disabled:opacity-60"
            >
              {saving ? t('operations.products.saving') : t('common.save')}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Page() {
  const t = useT();
  const [reloadKey, setReloadKey] = useState(0);
  const [stockRow, setStockRow] = useState<any | null>(null);

  return (
    <div className="space-y-4">
      <LowStockBanner refreshKey={reloadKey} />
      <ResourceManager
        key={reloadKey}
        title={t('operations.products.title')}
        subtitle={t('operations.products.subtitle')}
        icon={Package}
        endpoint="/products"
        formVariant="modal"
        filters={[
          { label: t('operations.products.all'), endpoint: '/products' },
          { label: t('operations.products.lowStock'), endpoint: `/products/low-stock?threshold=${LOW_STOCK_THRESHOLD}` },
        ]}
        columns={[
          { key: 'name', label: t('operations.products.name') },
          { key: 'price', label: t('operations.products.price'), render: (row) => formatMoney(row.price, row.currency) },
          {
            key: 'stock', label: t('operations.products.stock'), render: (row) => (
              row.stock <= LOW_STOCK_THRESHOLD
                ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                    <TriangleAlert className="h-3.5 w-3.5" /> {row.stock}
                  </span>
                )
                : row.stock
            ),
          },
        ]}
        fields={[
          { name: 'name', label: t('operations.products.name'), required: true },
          { name: 'price', label: t('operations.products.price'), type: 'number', required: true },
          { name: 'currency', label: t('operations.products.currency'), type: 'select', options: CURRENCY_OPTIONS },
          { name: 'stock', label: t('operations.products.initialStock'), type: 'number', required: true, createOnly: true },
          { name: 'sku', label: t('operations.products.sku') },
        ]}
        extraActions={(row) => [
          {
            label: t('operations.products.adjustStock'),
            icon: PackagePlus,
            silent: true,
            onClick: () => setStockRow(row),
          },
        ]}
      />
      <AdjustStockDialog
        row={stockRow}
        open={Boolean(stockRow)}
        onOpenChange={(next) => { if (!next) setStockRow(null); }}
        onSaved={() => setReloadKey((k) => k + 1)}
      />
    </div>
  );
}
