'use client';
import { useEffect, useState } from 'react';
import { AlertCircle, User } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { AsyncBoundary } from '@/components/async-boundary';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/toast';
import PhoneField from '@/components/PhoneField';
import { preferredTimeOptions, type MeProfile, type MemberProfileUpdate } from '@/lib/portal';
import GamificationCard from '@/components/GamificationCard';
import type { GamificationSummary } from '@/lib/gamification';
import { localizedRecord } from '@/lib/i18n/client';
import { useT } from '@/components/I18nProvider';

const ROLE_LABELS: Record<string, string> = localizedRecord({
  OWNER: 'labels.role.OWNER',
  ADMIN: 'labels.role.ADMIN',
  TRAINER: 'labels.role.TRAINER',
  STAFF: 'labels.role.STAFF',
  MEMBER: 'labels.role.MEMBER',
});

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ' +
  'focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition';

const readOnlyClass = 'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500';

export default function PortalProfilePage() {
  const t = useT();
  const { status, data, error, refetch } = useAsync<MeProfile>(
    () => api.get('/me/profile') as Promise<MeProfile>,
    [],
  );

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6 lg:p-8">
      <div className="relative rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-4 p-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white shadow-sm sm:h-14 sm:w-14 sm:rounded-2xl" aria-hidden="true">
            <User className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl text-slate-900">{t('portal.profile.title')}</h1>
            <p className="mt-1 text-slate-600">{t('portal.profile.subtitle')}</p>
          </div>
        </div>
      </div>

      <GamificationSection />

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <AsyncBoundary
          status={status}
          data={data}
          error={error}
          onRetry={refetch}
          isEmpty={() => false}
          loading={
            <div className="flex items-center justify-center py-16">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
            </div>
          }
          errorFallback={
            <div role="alert" className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <p className="text-sm text-slate-600">{error?.message ?? t('portal.loadError')}</p>
              <button onClick={refetch} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm transition hover:bg-slate-50">
                {t('common.retry')}
              </button>
            </div>
          }
        >
          {(profile) => <ProfileForm profile={profile} onSaved={refetch} />}
        </AsyncBoundary>
      </div>
    </div>
  );
}

// GAM-F01 — nivel y puntos del socio. Se carga aparte del perfil para que un
// fallo de gamificación no bloquee la edición de datos personales.
function GamificationSection() {
  const t = useT();
  const { status, data, error, refetch } = useAsync<GamificationSummary>(
    () => api.get('/me/gamification') as Promise<GamificationSummary>,
    [],
  );

  return (
    <AsyncBoundary
      status={status}
      data={data}
      error={error}
      onRetry={refetch}
      isEmpty={() => false}
      loading={<div className="h-48 animate-pulse rounded-xl border border-slate-200 bg-white" />}
      errorFallback={
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {t('portal.profile.gamificationError')}
          <button onClick={refetch} className="ml-auto font-semibold underline">{t('common.retry')}</button>
        </div>
      }
    >
      {(summary) => <GamificationCard summary={summary} />}
    </AsyncBoundary>
  );
}

function ProfileForm({ profile, onSaved }: { profile: MeProfile; onSaved: () => void }) {
  const t = useT();
  const [firstName, setFirstName] = useState(profile.profile?.firstName ?? '');
  const [lastName, setLastName] = useState(profile.profile?.lastName ?? '');
  const [phone, setPhone] = useState(profile.profile?.phone ?? '');
  const [address, setAddress] = useState(profile.profile?.address ?? '');
  const [preferredTime, setPreferredTime] = useState(profile.profile?.preferredTime ?? '');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    setFirstName(profile.profile?.firstName ?? '');
    setLastName(profile.profile?.lastName ?? '');
    setPhone(profile.profile?.phone ?? '');
    setAddress(profile.profile?.address ?? '');
    setPreferredTime(profile.profile?.preferredTime ?? '');
  }, [profile]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const payload: MemberProfileUpdate = {
        firstName,
        lastName,
        phone: phone || undefined,
        address: address || undefined,
        preferredTime: preferredTime || undefined,
      };
      await api.patch('/me/profile', payload);
      toast.add({ title: t('portal.profile.updated'), type: 'success' });
      onSaved();
    } catch (e: any) {
      setFormError(e.message);
      toast.add({ title: t('portal.profile.saveFailed'), description: e.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    // min-w-0: sin esto el campo de teléfono estira la columna y todo se sale en móvil.
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2 [&>*]:min-w-0">
      {formError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 md:col-span-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {formError}
        </div>
      )}

      <div>
        <label htmlFor="pf-email" className="mb-1.5 block text-sm font-medium text-slate-700">{t('portal.profile.email')}</label>
        <input id="pf-email" type="text" value={profile.email} disabled readOnly className={readOnlyClass} />
      </div>
      <div>
        <label htmlFor="pf-role" className="mb-1.5 block text-sm font-medium text-slate-700">{t('portal.profile.role')}</label>
        <input id="pf-role" type="text" value={ROLE_LABELS[profile.role] ?? profile.role} disabled readOnly className={readOnlyClass} />
      </div>

      <div>
        <label htmlFor="pf-first" className="mb-1.5 block text-sm font-medium text-slate-700">
          {t('portal.profile.firstName')}<span className="text-red-500" aria-hidden="true"> *</span>
        </label>
        <input id="pf-first" required autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label htmlFor="pf-last" className="mb-1.5 block text-sm font-medium text-slate-700">
          {t('portal.profile.lastName')}<span className="text-red-500" aria-hidden="true"> *</span>
        </label>
        <input id="pf-last" required autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
      </div>

      <div>
        <p className="mb-1.5 block text-sm font-medium text-slate-700">{t('portal.profile.phone')}</p>
        <PhoneField value={phone} onChange={setPhone} />
      </div>
      <div>
        <label htmlFor="pf-time" className="mb-1.5 block text-sm font-medium text-slate-700">{t('portal.profile.preferredTime')}</label>
        <select id="pf-time" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} className={`${inputClass} bg-white`}>
          <option value="">{t('common.select')}</option>
          {preferredTimeOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="md:col-span-2">
        <label htmlFor="pf-address" className="mb-1.5 block text-sm font-medium text-slate-700">{t('portal.profile.address')}</label>
        <input id="pf-address" autoComplete="street-address" value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
      </div>

      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={saving}
          className="h-11 w-full rounded-lg bg-amber-600 px-4 text-sm font-medium text-white transition hover:bg-amber-700 disabled:opacity-60 sm:h-10 sm:w-auto"
        >
          {saving ? t('portal.saving') : t('portal.profile.saveChanges')}
        </button>
      </div>
    </form>
  );
}
