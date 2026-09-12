'use client';

import { useEffect, useState } from 'react';
import { Pencil, Save, X } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type MemberDetailsMember = {
  id: string;
  activityLevel?: string;
  preferredTime?: string;
  user?: { email?: string; profile?: Record<string, string | null> };
};

type HealthProfile = {
  hypertension?: boolean;
  diabetes?: boolean;
  heartProblems?: boolean;
  asthma?: boolean;
  otherConditions?: string;
  hasInjury?: boolean;
  injuryDescription?: string;
  takesMedication?: boolean;
  medicationDescription?: string;
};

type EmergencyContact = {
  id?: string;
  memberId?: string;
  name?: string;
  phone?: string;
  relationship?: string;
};

export default function MemberDetails({ member, onClose }: { member: MemberDetailsMember; onClose: () => void }) {
  const profile = member.user?.profile ?? {};
  const [editingDetails, setEditingDetails] = useState(false);
  const [details, setDetails] = useState({
    firstName: profile.firstName ?? '',
    lastName: profile.lastName ?? '',
    email: member.user?.email ?? '',
    phone: profile.phone ?? '',
    address: profile.address ?? '',
    activityLevel: member.activityLevel ?? '',
    preferredTime: member.preferredTime ?? '',
  });
  const [health, setHealth] = useState<HealthProfile>({});
  const [contact, setContact] = useState<EmergencyContact>({});
  const [healthLoaded, setHealthLoaded] = useState(false);
  const [contactLoaded, setContactLoaded] = useState(false);
  const [editingHealth, setEditingHealth] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void api.list(`/health-profiles?memberId=${member.id}`)
      .then((profiles) => setHealth(profiles[0] ?? {}))
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'No se pudo cargar la ficha médica.'))
      .finally(() => setHealthLoaded(true));

    void api.get(`/members/${member.id}/emergency-contact`)
      .then((memberContact) => {
        setContact(memberContact ?? { memberId: member.id });
      })
      .catch((requestError) => {
        if (requestError instanceof ApiError && requestError.status === 404) {
          setContact({ memberId: member.id });
          return;
        }
        setError('No se pudo cargar el contacto de emergencia. Intenta nuevamente.');
      })
      .finally(() => setContactLoaded(true));
  }, [member.id]);

  async function saveDetails() {
    await api.put(`/members/${member.id}`, details);
    setEditingDetails(false);
  }

  async function saveHealth() {
    const payload = {
      hypertension: health.hypertension ?? false,
      diabetes: health.diabetes ?? false,
      heartProblems: health.heartProblems ?? false,
      asthma: health.asthma ?? false,
      otherConditions: health.otherConditions || undefined,
      hasInjury: health.hasInjury ?? false,
      injuryDescription: health.hasInjury ? health.injuryDescription || undefined : undefined,
      takesMedication: health.takesMedication ?? false,
      medicationDescription: health.takesMedication ? health.medicationDescription || undefined : undefined,
    };
    await api.put(`/health-profiles?memberId=${member.id}`, payload);
    setEditingHealth(false);
  }

  async function saveContact() {
    const payload = { memberId: member.id, name: contact.name, phone: contact.phone, relationship: contact.relationship };
    await api.put(`/members/${member.id}/emergency-contact`, payload);
    setEditingContact(false);
  }

  async function save(action: () => Promise<void>) {
    setSaving(true);
    setError('');
    try { await action(); } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudieron guardar los cambios.');
    } finally { setSaving(false); }
  }

  function updateDetails(key: keyof typeof details, value: string) { setDetails({ ...details, [key]: value }); }
  function updateHealth(key: keyof HealthProfile, value: string | boolean) { setHealth({ ...health, [key]: value }); }
  function updateContact(key: keyof EmergencyContact, value: string) { setContact({ ...contact, [key]: value }); }

  return (
    <div className="min-h-full" aria-labelledby="member-details-title">
      <section className="mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">Perfil del socio</p>
            <h2 id="member-details-title" className="mt-1 text-2xl font-bold text-slate-900">{details.firstName} {details.lastName}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Volver al listado de socios" className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"><X className="h-5 w-5" />Volver</button>
        </header>

        {error && <p role="alert" className="mx-6 mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <Tabs defaultValue="details" className="flex flex-col gap-5 p-6">
          <TabsList className="grid w-full grid-cols-1 gap-1 rounded-xl bg-slate-100 p-1 sm:grid-cols-3">
            <TabsTrigger value="details" className="h-11 px-4 py-3 data-active:bg-white data-active:text-slate-900 data-active:shadow-sm">Detalles</TabsTrigger>
            <TabsTrigger value="health" className="h-11 px-4 py-3 data-active:bg-white data-active:text-slate-900 data-active:shadow-sm">Ficha médica</TabsTrigger>
            <TabsTrigger value="emergency" className="h-11 px-4 py-3 data-active:bg-white data-active:text-slate-900 data-active:shadow-sm">Contacto de emergencia</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="pt-6">
            <TabHeader title="Datos personales" editing={editingDetails} onEdit={() => setEditingDetails(true)} />
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailField label="Nombre" value={details.firstName} editing={editingDetails} onChange={(value) => updateDetails('firstName', value)} />
              <DetailField label="Apellido" value={details.lastName} editing={editingDetails} onChange={(value) => updateDetails('lastName', value)} />
              <DetailField label="Correo" value={details.email} editing={editingDetails} onChange={(value) => updateDetails('email', value)} />
              <DetailField label="Teléfono" value={details.phone} editing={editingDetails} onChange={(value) => updateDetails('phone', value)} />
              <DetailField label="Dirección" value={details.address} editing={editingDetails} onChange={(value) => updateDetails('address', value)} />
              <DetailField label="Nivel de actividad" value={details.activityLevel} editing={editingDetails} onChange={(value) => updateDetails('activityLevel', value)} />
              <DetailField label="Horario preferido" value={details.preferredTime} editing={editingDetails} onChange={(value) => updateDetails('preferredTime', value)} />
            </div>
            {editingDetails && <SaveButton saving={saving} onClick={() => save(saveDetails)} />}
          </TabsContent>

          <TabsContent value="health" className="pt-6">
            {!healthLoaded ? <LoadingText /> : <>
              <TabHeader title="Condiciones de salud" editing={editingHealth} onEdit={() => setEditingHealth(true)} />
              <div className="grid gap-3 sm:grid-cols-2">
                {(['hypertension', 'diabetes', 'heartProblems', 'asthma'] as const).map((key) => <CheckField key={key} label={healthLabel[key]} checked={Boolean(health[key])} editing={editingHealth} onChange={(value) => updateHealth(key, value)} />)}
              </div>
              <DetailField label="Otras condiciones" value={health.otherConditions ?? ''} editing={editingHealth} multiline onChange={(value) => updateHealth('otherConditions', value)} />
              <CheckField label="Tiene lesión o limitación" checked={Boolean(health.hasInjury)} editing={editingHealth} onChange={(value) => updateHealth('hasInjury', value)} />
              {health.hasInjury && <DetailField label="Descripción de la lesión" value={health.injuryDescription ?? ''} editing={editingHealth} multiline onChange={(value) => updateHealth('injuryDescription', value)} />}
              <CheckField label="Toma medicación continua" checked={Boolean(health.takesMedication)} editing={editingHealth} onChange={(value) => updateHealth('takesMedication', value)} />
              {health.takesMedication && <DetailField label="Descripción de la medicación" value={health.medicationDescription ?? ''} editing={editingHealth} multiline onChange={(value) => updateHealth('medicationDescription', value)} />}
              {editingHealth && <SaveButton saving={saving} onClick={() => save(saveHealth)} />}
            </>}
          </TabsContent>

          <TabsContent value="emergency" className="pt-6">
            {!contactLoaded ? <LoadingText /> : <>
              <TabHeader title="Contacto de emergencia" editing={editingContact} onEdit={() => setEditingContact(true)} />
              {!contact.id && !editingContact && <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Este socio todavía no tiene un contacto de emergencia registrado.</p>}
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailField label="Nombre" value={contact.name ?? ''} editing={editingContact} onChange={(value) => updateContact('name', value)} />
                <DetailField label="Teléfono" value={contact.phone ?? ''} editing={editingContact} onChange={(value) => updateContact('phone', value)} />
                <DetailField label="Parentesco" value={contact.relationship ?? ''} editing={editingContact} onChange={(value) => updateContact('relationship', value)} />
              </div>
              {editingContact && <SaveButton saving={saving} onClick={() => save(saveContact)} />}
            </>}
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}

const healthLabel = { hypertension: 'Hipertensión', diabetes: 'Diabetes', heartProblems: 'Problemas cardiacos', asthma: 'Asma' };

function TabHeader({ title, editing, onEdit }: { title: string; editing: boolean; onEdit: () => void }) {
  return <div className="mb-5 flex items-center justify-between"><h3 className="text-lg font-semibold text-slate-900">{title}</h3>{!editing && <button type="button" onClick={onEdit} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Pencil className="h-4 w-4" />Editar</button>}</div>;
}

function DetailField({ label, value, editing, multiline = false, onChange }: { label: string; value: string; editing: boolean; multiline?: boolean; onChange: (value: string) => void }) {
  return <label className="mb-4 block text-sm font-medium text-slate-700"><span className="mb-1.5 block">{label}</span>{editing ? (multiline ? <textarea value={value} onChange={(event) => onChange(event.target.value)} className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200" /> : <input value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200" />) : <span className="block rounded-lg bg-slate-50 px-3 py-2 font-normal text-slate-600">{value || '—'}</span>}</label>;
}

function CheckField({ label, checked, editing, onChange }: { label: string; checked: boolean; editing: boolean; onChange: (value: boolean) => void }) {
  return <label className="mb-3 flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-700"><input type="checkbox" checked={checked} disabled={!editing} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-amber-600" />{label}</label>;
}

function SaveButton({ saving, onClick }: { saving: boolean; onClick: () => void }) {
  return <button type="button" disabled={saving} onClick={onClick} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-700 disabled:opacity-60"><Save className="h-4 w-4" />{saving ? 'Guardando...' : 'Guardar cambios'}</button>;
}

function LoadingText() { return <p className="py-10 text-center text-sm text-slate-500">Cargando información...</p>; }
