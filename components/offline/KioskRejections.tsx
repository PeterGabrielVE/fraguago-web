'use client';

import { useState } from 'react';
import { MonitorX } from 'lucide-react';
import { api } from '@/lib/api';
import { useAsync } from '@/hooks/useAsync';
import { useRefetchOnSync } from '@/hooks/useRefetchOnSync';
import { useI18n } from '@/components/I18nProvider';
import { MemberLink } from '@/components/RecordLink';
import { toast } from '@/components/ui/toast';

type KioskRejection = {
  id: string;
  identificationNumber: string;
  occurredAt: string;
  reason: string | null;
  memberId: string | null;
  memberName: string | null;
};

const REASONS = {
  MEMBER_NOT_FOUND: 'attendance.kioskRejections.reasonMEMBER_NOT_FOUND',
  NO_ACTIVE_MEMBERSHIP: 'attendance.kioskRejections.reasonNO_ACTIVE_MEMBERSHIP',
  TOO_OLD: 'attendance.kioskRejections.reasonTOO_OLD',
} as const;

// Entradas que el kiosko público guardó sin conexión y el servidor no pudo
// registrar al recibirlas (cédula inexistente, sin membresía vigente). El
// socio ya entró: recepción decide qué hacer y la marca como revisada. No se
// muestra si no hay ninguna.
export default function KioskRejections() {
  const { t, intlLocale } = useI18n();
  const { data, refetch } = useAsync<KioskRejection[]>(() => api.get('/attendance/kiosk-rejections'), []);
  useRefetchOnSync(refetch);
  const [busy, setBusy] = useState<string | null>(null);

  if (!data?.length) return null;

  async function dismiss(id: string) {
    setBusy(id);
    try {
      await api.post(`/attendance/kiosk-rejections/${id}/dismiss`, {});
      refetch();
    } catch (err) {
      toast.add({ title: t('attendance.kioskRejections.dismissFailed'), description: err instanceof Error ? err.message : undefined, type: 'error' });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-labelledby="kiosk-rejections-title" className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
      <h2 id="kiosk-rejections-title" className="flex items-center gap-2 text-base font-semibold text-amber-950">
        <MonitorX className="h-5 w-5 shrink-0" aria-hidden="true" />
        {t('attendance.kioskRejections.title', { count: data.length })}
      </h2>
      <p className="mt-1 text-sm text-amber-900">{t('attendance.kioskRejections.desc')}</p>
      <ul className="mt-3 divide-y divide-amber-200">
        {data.map((entry) => (
          <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
            <div className="min-w-0">
              <p className="font-medium text-slate-900">
                {entry.memberId && entry.memberName
                  ? <MemberLink id={entry.memberId} fallback={entry.identificationNumber}>{entry.memberName}</MemberLink>
                  : t('attendance.kioskRejections.unknownMember', { id: entry.identificationNumber })}
                <span className="ml-2 font-normal text-slate-600">
                  {new Date(entry.occurredAt).toLocaleString(intlLocale, { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </p>
              <p className="text-slate-700">
                {t(REASONS[entry.reason as keyof typeof REASONS] ?? 'attendance.kioskRejections.reasonOther')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => dismiss(entry.id)}
              disabled={busy === entry.id}
              className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
            >
              {t('attendance.kioskRejections.dismiss')}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
