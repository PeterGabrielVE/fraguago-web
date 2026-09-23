'use client';
import { useState } from 'react';
import { AlertCircle, Trophy } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { AsyncBoundary } from '@/components/async-boundary';
import ChallengeCard from '@/components/ChallengeCard';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import type { ChallengeStatus, MemberChallenge } from '@/lib/challenges';

const TABS: { status: ChallengeStatus; label: string; empty: string }[] = [
  { status: 'ACTIVE', label: 'Activos', empty: 'No hay retos en curso ahora mismo.' },
  { status: 'UPCOMING', label: 'Próximos', empty: 'No hay retos programados todavía.' },
  { status: 'FINISHED', label: 'Pasados', empty: 'Aún no terminó ningún reto.' },
];

// COM-F01 — vista principal de retos: activos, próximos y pasados.
export default function PortalChallengesPage() {
  const [tab, setTab] = useState<ChallengeStatus>('ACTIVE');
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const { status, data, error, refetch } = useAsync<MemberChallenge[]>(
    () => api.get(`/me/challenges?status=${tab}`) as Promise<MemberChallenge[]>,
    [tab],
  );
  const current = TABS.find((t) => t.status === tab)!;

  async function join(challenge: MemberChallenge) {
    setJoiningId(challenge.id);
    try {
      await api.post(`/me/challenges/${challenge.id}/join`, {});
      toast.add({ title: `Te uniste a "${challenge.name}"`, type: 'success' });
      refetch();
    } catch (e: any) {
      toast.add({ title: 'No pudiste unirte', description: e.message, type: 'error' });
    } finally {
      setJoiningId(null);
    }
  }

  return (
    <div className="space-y-6 p-8">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-4 p-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-sm">
            <Trophy className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Retos</h1>
            <p className="mt-1 text-slate-600">Compite con la comunidad del gym y gana puntos.</p>
          </div>
        </div>
      </div>

      <div role="tablist" aria-label="Estado de los retos" className="inline-flex gap-1 rounded-xl bg-slate-100 p-1">
        {TABS.map((t) => (
          <button
            key={t.status}
            role="tab"
            aria-selected={tab === t.status}
            onClick={() => setTab(t.status)}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition',
              tab === t.status ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AsyncBoundary
        status={status}
        data={data}
        error={error}
        onRetry={refetch}
        loading={
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white" />
            ))}
          </div>
        }
        errorFallback={
          <div role="alert" className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-16 text-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <p className="text-sm text-slate-600">{error?.message ?? 'No se pudieron cargar los retos.'}</p>
            <button onClick={refetch} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm transition hover:bg-slate-50">Reintentar</button>
          </div>
        }
        empty={
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
            <Trophy className="h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">{current.empty}</p>
          </div>
        }
      >
        {(challenges) => (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {challenges.map((c) => (
              <ChallengeCard
                key={c.id}
                challenge={c}
                href={`/portal/challenges/${c.id}`}
                onJoin={() => join(c)}
                joining={joiningId === c.id}
              />
            ))}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
