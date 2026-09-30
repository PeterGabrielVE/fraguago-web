'use client';

import { useEffect, useState } from 'react';
import { Save, X } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PhoneField, { isValidPhone } from '@/components/PhoneField';
import type { SelectOption } from '@/components/ResourceManager';
import { activityOptions, preferredTimeOptions, relationshipOptions } from '@/lib/memberOptions';
import { useT } from '@/components/I18nProvider';

// Mínimo que exige el API para la contraseña (la cédula, al crear el socio).
const MIN_PASSWORD_LENGTH = 8;

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ' +
  'focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

function nowAsDatetimeLocal() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

type Details = {
  firstName: string; lastName: string; email: string;
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
  const t = useT();
  const [details, setDetails] = useState<Details>({
    firstName: '', lastName: '', email: '', identificationNumber: '',
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
      setError(t('members.create.errContactIncomplete'));
      return;
    }
    // La contraseña inicial es la cédula, y el API exige mínimo 8 caracteres.
    if (details.identificationNumber.trim().length < MIN_PASSWORD_LENGTH) {
      setError(t('members.create.errIdShort', { min: MIN_PASSWORD_LENGTH }));
      return;
    }
    if (details.phone && !isValidPhone(details.phone)) {
      setError(t('members.create.errPhone'));
      return;
    }
    if (contactStarted && !isValidPhone(contact.phone)) {
      setError(t('members.create.errContactPhone'));
      return;
    }

    setSaving(true);
    try {
      const created = await api.post('/members', {
        firstName: details.firstName,
        lastName: details.lastName,
        email: details.email,
        password: details.identificationNumber.trim(),
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

      toast.add({ title: t('members.create.created'), type: 'success' });
      onCreated();
    } catch (err: any) {
      setError(err.message);
      toast.add({ title: t('members.create.createFailed'), description: err.message, type: 'error' });
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
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">{t('members.create.eyebrow')}</p>
            <h2 id="member-create-title" className="mt-1 text-2xl font-bold text-slate-900">{fullName || t('members.create.defaultTitle')}</h2>
          </div>
          <button type="button" onClick={onCancel} aria-label={t('members.create.cancelLabel')} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
            <X className="h-5 w-5" />{t('common.cancel')}
          </button>
        </header>

        {error && <p role="alert" className="mx-6 mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <Tabs defaultValue="details" className="flex flex-col gap-5 p-6">
          <TabsList className="grid w-full grid-cols-1 gap-1 rounded-xl bg-slate-100 p-1 sm:grid-cols-4">
            <TabsTrigger value="details" className="h-11 px-4 py-3 data-active:bg-white data-active:text-slate-900 data-active:shadow-sm">{t('members.tabs.details')}</TabsTrigger>
            <TabsTrigger value="membership" className="h-11 px-4 py-3 data-active:bg-white data-active:text-slate-900 data-active:shadow-sm">{t('members.tabs.membership')}</TabsTrigger>
            <TabsTrigger value="health" className="h-11 px-4 py-3 data-active:bg-white data-active:text-slate-900 data-active:shadow-sm">{t('members.tabs.health')}</TabsTrigger>
            <TabsTrigger value="emergency" className="h-11 px-4 py-3 data-active:bg-white data-active:text-slate-900 data-active:shadow-sm">{t('members.tabs.emergency')}</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="pt-6">
            <h3 className="mb-5 text-lg font-semibold text-slate-900">{t('members.create.personalData')}</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label={t('members.fields.firstName')} required value={details.firstName} onChange={(v) => updateDetails('firstName', v)} />
              <TextField label={t('members.fields.lastName')} required value={details.lastName} onChange={(v) => updateDetails('lastName', v)} />
              <TextField label={t('members.fields.email')} type="email" required value={details.email} onChange={(v) => updateDetails('email', v)} />
              <TextField label={t('members.fields.idNumber')} required value={details.identificationNumber} onChange={(v) => updateDetails('identificationNumber', v)} />
              <TextField
                label={t('members.fields.password')}
                readOnly
                value={details.identificationNumber.trim()}
                onChange={() => {}}
                hint={
                  details.identificationNumber && details.identificationNumber.trim().length < MIN_PASSWORD_LENGTH
                    ? { text: t('members.create.passwordShort', { min: MIN_PASSWORD_LENGTH }), error: true }
                    : { text: t('members.create.passwordHint') }
                }
              />
              <PhoneFieldLabel label={t('members.fields.phone')} value={details.phone} onChange={(v) => updateDetails('phone', v)} />
              <TextField label={t('members.fields.address')} value={details.address} onChange={(v) => updateDetails('address', v)} />
              <TextField label={t('members.fields.birthDate')} type="date" value={details.birthDate} onChange={(v) => updateDetails('birthDate', v)} />
              <SelectFieldLabel label={t('members.fields.activityLevel')} value={details.activityLevel} options={activityOptions} onChange={(v) => updateDetails('activityLevel', v)} />
              <SelectFieldLabel label={t('members.fields.preferredTime')} value={details.preferredTime} options={preferredTimeOptions} onChange={(v) => updateDetails('preferredTime', v)} />
            </div>
          </TabsContent>

          <TabsContent value="membership" className="pt-6">
            <h3 className="mb-1 text-lg font-semibold text-slate-900">{t('members.create.assignMembership')}</h3>
            <p className="mb-5 text-sm text-slate-500">{t('members.create.membershipOptional')}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectFieldLabel label={t('members.fields.plan')} value={membership.planId} options={planOptions} onChange={(v) => setMembership({ ...membership, planId: v })} />
              <TextField
                label={t('members.fields.startDate')}
                type="datetime-local"
                value={membership.startDate}
                disabled={!membership.planId}
                onChange={(v) => setMembership({ ...membership, startDate: v })}
              />
            </div>
            {membership.planId && (
              <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                {t('members.create.endDateHint')}
              </p>
            )}
          </TabsContent>

          <TabsContent value="health" className="pt-6">
            <h3 className="mb-1 text-lg font-semibold text-slate-900">{t('members.health.title')}</h3>
            <p className="mb-5 text-sm text-slate-500">{t('members.create.optional')}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <CheckboxField label={t('members.health.hypertension')} checked={Boolean(health.hypertension)} onChange={(v) => updateHealth('hypertension', v)} />
              <CheckboxField label={t('members.health.diabetes')} checked={Boolean(health.diabetes)} onChange={(v) => updateHealth('diabetes', v)} />
              <CheckboxField label={t('members.health.heartProblems')} checked={Boolean(health.heartProblems)} onChange={(v) => updateHealth('heartProblems', v)} />
              <CheckboxField label={t('members.health.asthma')} checked={Boolean(health.asthma)} onChange={(v) => updateHealth('asthma', v)} />
            </div>
            <TextField label={t('members.health.otherConditions')} multiline value={health.otherConditions ?? ''} onChange={(v) => updateHealth('otherConditions', v)} />
            <CheckboxField label={t('members.health.hasInjury')} checked={Boolean(health.hasInjury)} onChange={(v) => updateHealth('hasInjury', v)} />
            {health.hasInjury && <TextField label={t('members.health.injuryDescription')} multiline value={health.injuryDescription ?? ''} onChange={(v) => updateHealth('injuryDescription', v)} />}
            <CheckboxField label={t('members.health.takesMedication')} checked={Boolean(health.takesMedication)} onChange={(v) => updateHealth('takesMedication', v)} />
            {health.takesMedication && <TextField label={t('members.health.medicationDescription')} multiline value={health.medicationDescription ?? ''} onChange={(v) => updateHealth('medicationDescription', v)} />}
          </TabsContent>

          <TabsContent value="emergency" className="pt-6">
            <h3 className="mb-1 text-lg font-semibold text-slate-900">{t('members.tabs.emergency')}</h3>
            <p className="mb-5 text-sm text-slate-500">{t('members.create.optional')}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label={t('members.fields.name')} value={contact.name} onChange={(v) => updateContact('name', v)} />
              <PhoneFieldLabel label={t('members.fields.phone')} value={contact.phone} onChange={(v) => updateContact('phone', v)} />
              <SelectFieldLabel label={t('members.fields.relationship')} value={contact.relationship} options={relationshipOptions} onChange={(v) => updateContact('relationship', v)} />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {t('common.cancel')}
          </button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60">
            <Save className="h-4 w-4" />{saving ? t('members.create.saving') : t('members.create.save')}
          </button>
        </div>
      </section>
    </form>
  );
}

function TextField({
  label, value, onChange, required = false, multiline = false, type = 'text', disabled = false, readOnly = false, hint,
}: {
  label: string; value: string; onChange: (value: string) => void; required?: boolean;
  multiline?: boolean; type?: 'text' | 'email' | 'password' | 'date' | 'datetime-local'; disabled?: boolean;
  readOnly?: boolean; hint?: { text: string; error?: boolean };
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
          readOnly={readOnly}
          tabIndex={readOnly ? -1 : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} font-normal ${readOnly ? 'cursor-not-allowed bg-slate-100 text-slate-600' : ''}`}
        />
      )}
      {hint && (
        <span className={`mt-1 block text-xs font-normal ${hint.error ? 'text-red-600' : 'text-slate-500'}`}>{hint.text}</span>
      )}
    </label>
  );
}

function SelectFieldLabel({
  label, value, options, onChange,
}: { label: string; value: string; options: SelectOption[]; onChange: (value: string) => void }) {
  const t = useT();
  return (
    <label className="mb-4 block text-sm font-medium text-slate-700">
      <span className="mb-1.5 block">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClass} bg-white font-normal`}>
        <option value="">{t('common.select')}</option>
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
