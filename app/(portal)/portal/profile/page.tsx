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

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ' +
  'focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition';

const readOnlyClass = 'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500';

export default function PortalProfilePage() {
  const { status, data, error, refetch } = useAsync<MeProfile>(
    () => api.get('/me/profile') as Promise<MeProfile>,
    [],
  );

  return (
    <div className="space-y-6 p-8">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-4 p-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-sm">
            <User className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Mi perfil</h1>
            <p className="mt-1 text-slate-600">Actualiza tus datos de contacto y preferencias.</p>
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
              <p className="text-sm text-slate-600">{error?.message ?? 'No se pudieron cargar los datos.'}</p>
              <button onClick={refetch} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm transition hover:bg-slate-50">
                Reintentar
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
          No se pudo cargar tu nivel y puntos.
          <button onClick={refetch} className="ml-auto font-semibold underline">Reintentar</button>
        </div>
      }
    >
      {(summary) => <GamificationCard summary={summary} />}
    </AsyncBoundary>
  );
}

function ProfileForm({ profile, onSaved }: { profile: MeProfile; onSaved: () => void }) {
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
      toast.add({ title: 'Perfil actualizado', type: 'success' });
      onSaved();
    } catch (e: any) {
      setFormError(e.message);
      toast.add({ title: 'No se pudo guardar', description: e.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
      {formError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 md:col-span-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {formError}
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Correo electrónico</label>
        <input type="text" value={profile.email} disabled readOnly className={readOnlyClass} />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Rol</label>
        <input type="text" value={profile.role} disabled readOnly className={readOnlyClass} />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Nombre<span className="text-red-500"> *</span>
        </label>
        <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Apellido<span className="text-red-500"> *</span>
        </label>
        <input required value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Teléfono</label>
        <PhoneField value={phone} onChange={setPhone} />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Horario preferido</label>
        <select value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} className={`${inputClass} bg-white`}>
          <option value="">Selecciona…</option>
          {preferredTimeOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="md:col-span-2">
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Dirección</label>
        <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
      </div>

      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700 disabled:opacity-60"
        >
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}
