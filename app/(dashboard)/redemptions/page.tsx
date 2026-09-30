'use client';
import { useState } from 'react';
import { CircleCheck, CircleX, Search, Ticket } from 'lucide-react';
import ResourceManager from '@/components/ResourceManager';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import {
  REDEMPTION_STATUS_BADGES,
  REDEMPTION_STATUS_LABELS,
  formatPoints,
  redemptionMemberName,
  rewardValueLabel,
  type Redemption,
} from '@/lib/gamification';
import { useI18n } from '@/components/I18nProvider';

const LIST = '/gamification/redemptions?pageSize=100';

// Recepción: busca el código que muestra el socio y lo valida en un paso.
function CodeLookup({ onResolved }: { onResolved: () => void }) {
  const { t, intlLocale } = useI18n();
  const [code, setCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [found, setFound] = useState<Redemption | null>(null);
  const [busy, setBusy] = useState(false);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const value = code.trim().toUpperCase();
    if (!value) return;
    setSearching(true);
    try {
      setFound((await api.get(`/gamification/redemptions/code/${encodeURIComponent(value)}`)) as Redemption);
    } catch (err: any) {
      toast.add({ title: t('gamification.redemptions.invalidCode'), description: err.message, type: 'error' });
    } finally {
      setSearching(false);
    }
  }

  async function resolve(action: 'fulfill' | 'cancel') {
    if (!found) return;
    setBusy(true);
    try {
      await api.patch(`/gamification/redemptions/${found.id}/${action}`, {});
      toast.add({
        title: action === 'fulfill' ? t('gamification.redemptions.fulfilled') : t('gamification.redemptions.cancelled'),
        description: action === 'cancel' ? t('gamification.redemptions.pointsReturned') : undefined,
        type: 'success',
      });
      setFound(null);
      setCode('');
      onResolved();
    } catch (err: any) {
      toast.add({ title: t('gamification.redemptions.processFailed'), description: err.message, type: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form onSubmit={search} className="flex items-center gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder={t('gamification.redemptions.codePlaceholder')}
          aria-label={t('gamification.redemptions.codePlaceholder')}
          maxLength={12}
          className="w-40 rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm uppercase tracking-widest outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
        />
        <button
          type="submit"
          disabled={searching || !code.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <Search className="h-4 w-4" />
          {searching ? t('gamification.redemptions.searching') : t('gamification.redemptions.validate')}
        </button>
      </form>

      <Dialog open={Boolean(found)} onOpenChange={(open) => { if (!open && !busy) setFound(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('gamification.redemptions.dialogTitle', { code: found?.code })}</DialogTitle>
            <DialogDescription>
              {found && `${redemptionMemberName(found) || t('gamification.redemptions.member')} · ${new Date(found.createdAt).toLocaleString(intlLocale)}`}
            </DialogDescription>
          </DialogHeader>
          {found && (
            <div className="space-y-2 rounded-lg bg-slate-50 p-4 text-sm">
              <p className="text-lg font-semibold text-slate-900">{found.reward.name}</p>
              <p className="text-slate-600">{rewardValueLabel(found.reward)} · {t('gamification.pts', { points: formatPoints(found.pointsSpent) })}</p>
              <Badge variant="outline" className={REDEMPTION_STATUS_BADGES[found.status]}>
                {REDEMPTION_STATUS_LABELS[found.status]}
              </Badge>
            </div>
          )}
          {found?.status === 'PENDING' ? (
            <DialogFooter>
              <button
                type="button"
                disabled={busy}
                onClick={() => resolve('cancel')}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                <CircleX className="h-4 w-4" />
                {t('gamification.redemptions.cancel')}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => resolve('fulfill')}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
              >
                <CircleCheck className="h-4 w-4" />
                {t('gamification.redemptions.markFulfilled')}
              </button>
            </DialogFooter>
          ) : (
            <p className="text-sm text-slate-500">{t('gamification.redemptions.alreadyProcessed')}</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// GAM-01 (staff) — canjes de recompensas: validar código, entregar o anular
// (anular devuelve los puntos al socio y la unidad al stock).
export default function Page() {
  const { t, intlLocale } = useI18n();
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <ResourceManager
      key={reloadKey}
      title={t('gamification.redemptions.title')} subtitle={t('gamification.redemptions.subtitle')}
      icon={Ticket}
      endpoint="/gamification/redemptions"
      disableCreate
      disableEdit
      disableDelete
      filters={[
        { label: t('gamification.redemptions.pending'), endpoint: `${LIST}&status=PENDING` },
        { label: t('gamification.redemptions.fulfilledTab'), endpoint: `${LIST}&status=FULFILLED` },
        { label: t('gamification.redemptions.cancelledTab'), endpoint: `${LIST}&status=CANCELLED` },
        { label: t('gamification.redemptions.all'), endpoint: LIST },
      ]}
      headerActions={<CodeLookup onResolved={() => setReloadKey((k) => k + 1)} />}
      columns={[
        { key: 'code', label: t('gamification.redemptions.code'), render: (r: Redemption) => <span className="font-mono font-semibold tracking-widest">{r.code}</span> },
        { key: 'member', label: t('gamification.redemptions.member'), render: (r: Redemption) => redemptionMemberName(r) || '—' },
        { key: 'reward', label: t('gamification.redemptions.reward'), render: (r: Redemption) => r.reward?.name },
        { key: 'pointsSpent', label: t('gamification.redemptions.points'), render: (r: Redemption) => formatPoints(r.pointsSpent) },
        { key: 'createdAt', label: t('gamification.redemptions.date'), render: (r: Redemption) => new Date(r.createdAt).toLocaleString(intlLocale) },
        {
          key: 'status', label: t('gamification.redemptions.status'),
          render: (r: Redemption) => (
            <Badge variant="outline" className={REDEMPTION_STATUS_BADGES[r.status]}>{REDEMPTION_STATUS_LABELS[r.status]}</Badge>
          ),
        },
      ]}
      fields={[]}
      extraActions={(row) => (row.status !== 'PENDING' ? [] : [
        {
          label: t('gamification.redemptions.markFulfilled'),
          icon: CircleCheck,
          confirm: true,
          confirmTitle: t('gamification.redemptions.fulfillTitle'),
          confirmDescription: t('gamification.redemptions.fulfillDesc', { reward: row.reward?.name, code: row.code }),
          onClick: () => api.patch(`/gamification/redemptions/${row.id}/fulfill`, {}),
        },
        {
          label: t('gamification.redemptions.cancel'),
          icon: CircleX,
          confirm: true,
          confirmTitle: t('gamification.redemptions.cancelTitle'),
          confirmDescription: t('gamification.redemptions.cancelDesc', { points: formatPoints(row.pointsSpent) }),
          onClick: () => api.patch(`/gamification/redemptions/${row.id}/cancel`, {}),
        },
      ])}
    />
  );
}
