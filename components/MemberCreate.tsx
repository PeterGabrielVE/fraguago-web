'use client';

import { useEffect, useState } from 'react';
import { Save, X } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PhoneField, { isValidPhone } from '@/components/PhoneField';
import type { SelectOption } from '@/components/ResourceManager';

const activityOptions = [
  { value: 'BEGINNER', label: 'Principiante' },
  { value: 'INTERMEDIATE', label: 'Intermedio' },
  { value: 'ADVANCED', label: 'Avanzado' },
];

const preferredTimeOptions = [
  { value: 'MAÑANA', label: 'Mañana' },
  { value: 'TARDE', label: 'Tarde' },
  { value: 'NOCHE', label: 'Noche' },
  { value: 'OTROS', label: 'Otros' },
  { value: 'VARIADO', label: 'Variado' },
];

const relationshipOptions = [
  { value: 'MADRE', label: 'Madre' },
  { value: 'PADRE', label: 'Padre' },
  { value: 'HERMANO', label: 'Hermano' },
  { value: 'HERMANA', label: 'Hermana' },
  { value: 'HIJO', label: 'Hijo' },
  { value: 'HIJA', label: 'Hija' },
  { value: 'PAREJA', label: 'Pareja' },
  { value: 'ESPOSO', label: 'Esposo' },
  { value: 'ESPOSA', label: 'Esposa' },
  { value: 'AMIGO', label: 'Amigo' },
  { value: 'AMIGA', label: 'Amiga' },
  { value: 'VECINO', label: 'Vecino' },
  { value: 'VECINA', label: 'Vecina' },
  { value: 'OTRO', label: 'Otro' },
];

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ' +
  'focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

function nowAsDatetimeLocal() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

type Details = {
  firstName: string; lastName: string; email: string; password: string;
  identificationNumber: string; phone: string; address: string; birthDate: string;
  activityLevel: string; preferredTime: string;
};

type HealthDraft = {
  hypertension?: boolean; diabetes?: boolean; heartProblems?: boolean; asthma?: boolean;
  otherConditions?: string; hasInjury?: boolean; injuryDescription?: string;
  takesMedication?: boolean; medicationDescription?: string;
};

type ContactDraft = { name: string; phone: string; relationship: string };
type MembershipDraft = { planId: string; startDate: string };

export default function MemberCreate({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [details, setDetails] = useState<Details>({
    firstName: '', lastName: '', email: '', password: '', identificationNumber: '',
    phone: '', address: '', birthDate: '', activityLevel: '', preferredTime: '',
  });
  const [membership, setMembership] = useState<MembershipDraft>({ planId: '', startDate: nowAsDatetimeLocal() });
  const [health, setHealth] = useState<HealthDraft>({});
  const [contact, setContact] = useState<ContactDraft>({ name: '', phone: '', relationship: '' });
  const [planOptions, setPlanOptions] = useState<SelectOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.list('/membership-plans')
      .then((plans) => setPlanOptions(plans.map((p: any) => ({ value: String(p.id), label: p.name }))))
      .catch(() => {});
  }, []);

  function updateDetails(key: keyof Details, value: string) { setDetails({ ...details, [key]: value }); }
  function updateHealth(key: keyof HealthDraft, value: string | boolean) { setHealth({ ...health, [key]: value }); }
  function updateContact(key: keyof ContactDraft, value: string) { setContact({ ...contact, [key]: value }); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const contactStarted = Boolean(contact.name || contact.phone || contact.relationship);
    if (contactStarted && (!contact.name || !contact.phone || !contact.relationship)) {
      setError('Completa nombre, teléfono y parentesco del contacto de emergencia, o deja los tres vacíos.');
      return;
    }
    if (details.phone && !isValidPhone(details.phone)) {
      setError('El teléfono del socio debe tener un código válido y 7 dígitos.');
      return;
    }
    if (contactStarted && !isValidPhone(contact.phone)) {
      setError('El teléfono del contacto de emergencia debe tener un código válido y 7 dígitos.');
      return;
    }

    setSaving(true);
    try {
      const created = await api.post('/members', {
        firstName: details.firstName,
        lastName: details.lastName,
        email: details.email,
        password: details.password,
        identificationNumber: details.identificationNumber,
        phone: details.phone || undefined,
        address: details.address || undefined,
        birthDate: details.birthDate || undefined,
        activityLevel: details.activityLevel || undefined,
        preferredTime: details.preferredTime || undefined,
      });
      const memberId = created.id;

      // La membresía es opcional al crear: un socio puede quedar sin plan y
      // asignársele uno más tarde desde la sección "Membresías".
      if (membership.planId) {
        await api.post(`/members/${memberId}/memberships`, {
          planId: membership.planId,
          startDate: membership.startDate,
        });
      }

      const hasHealthData = Object.values(health).some((v) => v === true || (typeof v === 'string' && v.trim() !== ''));
      if (hasHealthData) {
        await api.patch(`/health-profiles?memberId=${memberId}`, {
          hypertension: health.hypertension ?? false,
          diabetes: health.diabetes ?? false,
          heartProblems: health.heartProblems ?? false,
          asthma: health.asthma ?? false,
          otherConditions: health.otherConditions || undefined,
          hasInjury: health.hasInjury ?? false,
          injuryDescription: health.hasInjury ? health.injuryDescription || undefined : undefined,
          takesMedication: health.takesMedication ?? false,
          medicationDescription: health.takesMedication ? health.medicationDescription || undefined : undefined,
        });
      }

      if (contactStarted) {
        await api.put(`/members/${memberId}/emergency-contact`, contact);
      }

      toast.add({ title: 'Socio creado', type: 'success' });
      onCreated();
    } catch (err: any) {
      setError(err.message);
      toast.add({ title: 'No se pudo crear el socio', description: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  const fullName = `${details.firstName} ${details.lastName}`.trim();

  return (
    <form onSubmit={handleSubmit} aria-labelledby="member-create-title">
      <section className="mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">Nuevo socio</p>
            <h2 id="member-create-title" className="mt-1 text-2xl font-bold text-slate-900">{fullName || 'Datos del socio'}</h2>
          </div>
          <button type="button" onClick={onCancel} aria-label="Cancelar y volver al listado" className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
            <X className="h-5 w-5" />Cancelar
          </button>
        </header>

        {error && <p role="alert" className="mx-6 mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <Tabs defaultValue="details" className="flex flex-col gap-5 p-6">
          <TabsList className="grid w-full grid-cols-1 gap-1 rounded-xl bg-slate-100 p-1 sm:grid-cols-4">
            <TabsTrigger value="details" className="h-11 px-4 py-3 data-active:bg-white data-active:text-slate-900 data-active:shadow-sm">Detalles</TabsTrigger>
            <TabsTrigger value="membership" className="h-11 px-4 py-3 data-active:bg-white data-active:text-slate-900 data-active:shadow-sm">Membresía</TabsTrigger>
            <TabsTrigger value="health" className="h-11 px-4 py-3 data-active:bg-white data-active:text-slate-900 data-active:shadow-sm">Ficha médica</TabsTrigger>
            <TabsTrigger value="emergency" className="h-11 px-4 py-3 data-active:bg-white data-active:text-slate-900 data-active:shadow-sm">Contacto de emergencia</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="pt-6">
            <h3 className="mb-5 text-lg font-semibold text-slate-900">Datos personales</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Nombre" required value={details.firstName} onChange={(v) => updateDetails('firstName', v)} />
              <TextField label="Apellido" required value={details.lastName} onChange={(v) => updateDetails('lastName', v)} />
              <TextField label="Correo" type="email" required value={details.email} onChange={(v) => updateDetails('email', v)} />
              <TextField label="Contraseña (mín. 8 caracteres)" type="password" required value={details.password} onChange={(v) => updateDetails('password', v)} />
              <TextField label="CI / Cédula" required value={details.identificationNumber} onChange={(v) => updateDetails('identificationNumber', v)} />
              <PhoneFieldLabel label="Teléfono" value={details.phone} onChange={(v) => updateDetails('phone', v)} />
              <TextField label="Dirección" value={details.address} onChange={(v) => updateDetails('address', v)} />
              <TextField label="Fecha de nacimiento" type="date" value={details.birthDate} onChange={(v) => updateDetails('birthDate', v)} />
              <SelectFieldLabel label="Nivel de actividad" value={details.activityLevel} options={activityOptions} onChange={(v) => updateDetails('activityLevel', v)} />
              <SelectFieldLabel label="Horario preferido" value={details.preferredTime} options={preferredTimeOptions} onChange={(v) => updateDetails('preferredTime', v)} />
            </div>
          </TabsContent>

          <TabsContent value="membership" className="pt-6">
            <h3 className="mb-1 text-lg font-semibold text-slate-900">Asignar membresía</h3>
            <p className="mb-5 text-sm text-slate-500">Opcional: puedes crear el socio sin plan y asignárselo después desde "Membresías".</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectFieldLabel label="Plan" value={membership.planId} options={planOptions} onChange={(v) => setMembership({ ...membership, planId: v })} />
              <TextField
                label="Fecha de inicio"
                type="datetime-local"
                value={membership.startDate}
                disabled={!membership.planId}
                onChange={(v) => setMembership({ ...membership, startDate: v })}
              />
            </div>
            {membership.planId && (
              <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                La fecha de vencimiento se calcula sola según la duración del plan seleccionado.
              </p>
            )}
          </TabsContent>

          <TabsContent value="health" className="pt-6">
            <h3 className="mb-1 text-lg font-semibold text-slate-900">Condiciones de salud</h3>
            <p className="mb-5 text-sm text-slate-500">Opcional.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <CheckboxField label="Hipertensión" checked={Boolean(health.hypertension)} onChange={(v) => updateHealth('hypertension', v)} />
              <CheckboxField label="Diabetes" checked={Boolean(health.diabetes)} onChange={(v) => updateHealth('diabetes', v)} />
              <CheckboxField label="Problemas cardiacos" checked={Boolean(health.heartProblems)} onChange={(v) => updateHealth('heartProblems', v)} />
              <CheckboxField label="Asma" checked={Boolean(health.asthma)} onChange={(v) => updateHealth('asthma', v)} />
            </div>
            <TextField label="Otras condiciones" multiline value={health.otherConditions ?? ''} onChange={(v) => updateHealth('otherConditions', v)} />
            <CheckboxField label="Tiene lesión o limitación" checked={Boolean(health.hasInjury)} onChange={(v) => updateHealth('hasInjury', v)} />
            {health.hasInjury && <TextField label="Descripción de la lesión" multiline value={health.injuryDescription ?? ''} onChange={(v) => updateHealth('injuryDescription', v)} />}
            <CheckboxField label="Toma medicación continua" checked={Boolean(health.takesMedication)} onChange={(v) => updateHealth('takesMedication', v)} />
            {health.takesMedication && <TextField label="Descripción de la medicación" multiline value={health.medicationDescription ?? ''} onChange={(v) => updateHealth('medicationDescription', v)} />}
          </TabsContent>

          <TabsContent value="emergency" className="pt-6">
            <h3 className="mb-1 text-lg font-semibold text-slate-900">Contacto de emergencia</h3>
            <p className="mb-5 text-sm text-slate-500">Opcional.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Nombre" value={contact.name} onChange={(v) => updateContact('name', v)} />
              <PhoneFieldLabel label="Teléfono" value={contact.phone} onChange={(v) => updateContact('phone', v)} />
              <SelectFieldLabel label="Parentesco" value={contact.relationship} options={relationshipOptions} onChange={(v) => updateContact('relationship', v)} />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60">
            <Save className="h-4 w-4" />{saving ? 'Guardando…' : 'Guardar socio'}
          </button>
        </div>
      </section>
    </form>
  );
}

function TextField({
  label, value, onChange, required = false, multiline = false, type = 'text', disabled = false,
}: {
  label: string; value: string; onChange: (value: string) => void; required?: boolean;
  multiline?: boolean; type?: 'text' | 'email' | 'password' | 'date' | 'datetime-local'; disabled?: boolean;
}) {
  return (
    <label className="mb-4 block text-sm font-medium text-slate-700">
      <span className="mb-1.5 block">{label}{required && <span className="text-red-500"> *</span>}</span>
      {multiline ? (
        <textarea
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} min-h-24 font-normal`}
        />
      ) : (
        <input
          type={type}
          required={required}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} font-normal`}
        />
      )}
    </label>
  );
}

function SelectFieldLabel({
  label, value, options, onChange,
}: { label: string; value: string; options: SelectOption[]; onChange: (value: string) => void }) {
  return (
    <label className="mb-4 block text-sm font-medium text-slate-700">
      <span className="mb-1.5 block">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClass} bg-white font-normal`}>
        <option value="">Selecciona…</option>
        {options.map((o) => {
          const optValue = typeof o === 'string' ? o : o.value;
          const optLabel = typeof o === 'string' ? o : o.label;
          return <option key={optValue} value={optValue}>{optLabel}</option>;
        })}
      </select>
    </label>
  );
}

function PhoneFieldLabel({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="mb-4 block text-sm font-medium text-slate-700">
      <span className="mb-1.5 block">{label}</span>
      <PhoneField value={value} onChange={onChange} />
    </label>
  );
}

function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="mb-3 flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-amber-600" />
      {label}
    </label>
  );
}
