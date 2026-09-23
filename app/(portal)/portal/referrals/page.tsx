'use client';
import { useState } from 'react';
import { AlertCircle, Check, Copy, MessageCircle, Share2, Users } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { AsyncBoundary } from '@/components/async-boundary';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { formatPoints } from '@/lib/gamification';
import { REFERRAL_STATUS_BADGES, REFERRAL_STATUS_LABELS, type MyReferral } from '@/lib/retention';

// RET-B04 — el socio ve y comparte su código de referido.
export default function PortalReferralsPage() {
  const { status, data, error, refetch } = useAsync<MyReferral>(
    () => api.get('/me/referral') as Promise<MyReferral>,
    [],
  );

  return (
    <div className="space-y-6 p-8">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-4 p-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-sm">
            <Share2 className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Invita a un amigo</h1>
            <p className="mt-1 text-slate-600">Comparte tu código y ganen puntos los dos.</p>
          </div>
        </div>
      </div>

      <AsyncBoundary
        status={status}
        data={data}
        error={error}
        onRetry={refetch}
        isEmpty={() => false}
        loading={<div className="h-56 animate-pulse rounded-xl border border-slate-200 bg-white" />}
        errorFallback={
          <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white py-16 text-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <p className="text-sm text-slate-600">{error?.message ?? 'No se pudo cargar tu código.'}</p>
            <button onClick={refetch} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">Reintentar</button>
          </div>
        }
      >
        {(d) => <ReferralContent data={d} />}
      </AsyncBoundary>
    </div>
  );
}

function ReferralContent({ data }: { data: MyReferral }) {
  const [copied, setCopied] = useState(false);
  const { code, rewards, totals, referrals } = data;
  const shareText =
    `¡Entrena conmigo! Al inscribirte en el gym dile a recepción mi código ${code} ` +
    `y ganamos ${rewards.referredPoints} puntos tú y ${rewards.referrerPoints} yo.`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.add({ title: 'No se pudo copiar', description: 'Copia el código manualmente.', type: 'error' });
    }
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tu código</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="rounded-xl bg-slate-900 px-5 py-3 font-mono text-2xl font-bold tracking-[0.2em] text-white">{code}</span>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <MessageCircle className="h-4 w-4" />
              Compartir por WhatsApp
            </a>
          </div>

          <ol className="mt-6 space-y-2 text-sm text-slate-600">
            <li><span className="font-semibold text-slate-900">1.</span> Comparte tu código con un amigo.</li>
            <li><span className="font-semibold text-slate-900">2.</span> Al inscribirse, lo dice en recepción (dentro de sus primeros {rewards.windowDays} días).</li>
            <li>
              <span className="font-semibold text-slate-900">3.</span> Cuando active su primera membresía, tú ganas{' '}
              <span className="font-semibold text-amber-700">{formatPoints(rewards.referrerPoints)} pts</span> y tu amigo{' '}
              <span className="font-semibold text-amber-700">{formatPoints(rewards.referredPoints)} pts</span>.
            </li>
          </ol>
        </div>

        <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
          <Stat label="Invitados" value={totals.referred} />
          <Stat label="Premiados" value={totals.rewarded} />
          <Stat label="Puntos ganados" value={formatPoints(totals.pointsEarned)} highlight />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <h2 className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-900">
          <Users className="h-4 w-4 text-amber-600" />
          Mis invitados
        </h2>
        {referrals.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">Todavía no invitaste a nadie. ¡Comparte tu código!</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {referrals.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                <div>
                  <p className="font-medium text-slate-900">{r.name}</p>
                  <p className="text-xs text-slate-500">
                    {r.status === 'REWARDED' && r.rewardedAt
                      ? `Premiado el ${new Date(r.rewardedAt).toLocaleDateString('es-MX')} · +${formatPoints(r.points)} pts`
                      : 'Esperando que active su membresía'}
                  </p>
                </div>
                <Badge variant="outline" className={REFERRAL_STATUS_BADGES[r.status]}>{REFERRAL_STATUS_LABELS[r.status]}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number | string; highlight?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${highlight ? 'text-amber-600' : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}
