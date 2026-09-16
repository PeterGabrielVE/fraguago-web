'use client';
import { useState } from 'react';
import ResourceManager, { type CreateFormRendererProps } from '@/components/ResourceManager';
import MemberDetails, { type MemberDetailsMember } from '@/components/MemberDetails';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import PhoneField, { isValidPhone } from '@/components/PhoneField';
import { api } from '@/lib/api';

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

function getMemberStatus(member: Record<string, any>) {
  const status = String(member.status ?? '').toUpperCase();
  if (member.statusOverride) return status;
  if (status === 'SUSPENDED') return 'SUSPENDED';
  if (status === 'INACTIVE') return 'INACTIVE';
  if (status === 'EXPIRED') return 'EXPIRED';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const hasExpiredMembership = (member.memberships ?? []).some((membership: Record<string, any>) => {
    if (!membership.endDate) return false;
    const endDate = new Date(membership.endDate);
    endDate.setHours(0, 0, 0, 0);
    return endDate < today;
  });

  return hasExpiredMembership ? 'EXPIRED' : 'ACTIVE';
}

function statusBadge(status: string) {
  const labels: Record<string, string> = {
    ACTIVE: 'Activo',
    SUSPENDED: 'Suspendido',
    INACTIVE: 'Inactivo',
    EXPIRED: 'Vencido',
  };
  const colors: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-700',
    SUSPENDED: 'bg-amber-100 text-amber-800',
    INACTIVE: 'bg-slate-100 text-slate-600',
    EXPIRED: 'bg-red-100 text-red-700',
  };

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${colors[status] ?? colors.INACTIVE}`}>{labels[status] ?? status}</span>;
}

export default function Page() {
  async function createMember(form: Record<string, any>) {
    const memberResponse = await api.post('/members', {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      password: form.password,
      identificationNumber: form.identificationNumber,
      phone: form.phone || undefined,
      address: form.address || undefined,
      birthDate: form.birthDate || undefined,
      activityLevel: form.activityLevel || undefined,
      preferredTime: form.preferredTime || undefined,
    });
    const member = memberResponse?.data ?? memberResponse;
    const memberId = member?.id;
    if (!memberId) throw new Error('La API no devolvió el ID del socio creado.');

    await api.put(`/health-profiles?memberId=${memberId}`, {
      hypertension: Boolean(form.healthHypertension),
      diabetes: Boolean(form.healthDiabetes),
      heartProblems: Boolean(form.healthHeartProblems),
      asthma: Boolean(form.healthAsthma),
      otherConditions: form.healthOtherConditions || undefined,
      hasInjury: Boolean(form.healthHasInjury),
      injuryDescription: form.healthHasInjury ? form.healthInjuryDescription || undefined : undefined,
      takesMedication: Boolean(form.healthTakesMedication),
      medicationDescription: form.healthTakesMedication ? form.healthMedicationDescription || undefined : undefined,
    });

    if (form.emergencyName || form.emergencyPhone || form.emergencyRelationship) {
      await api.put(`/members/${memberId}/emergency-contact`, {
        name: form.emergencyName || undefined,
        phone: form.emergencyPhone || undefined,
        relationship: form.emergencyRelationship || undefined,
      });
    }
  }

  return (
    <ResourceManager
      title="Socios" subtitle="Los clientes de tu gimnasio."
      endpoint="/members"
      columns={[
        {
          key: 'user',
          label: 'Nombre',
          render: (r) => {
            const firstName = r.user?.profile?.firstName ?? '';
            const lastName = r.user?.profile?.lastName ?? '';
            const fullName = `${firstName} ${lastName}`.trim() || 'Sin nombre';
            const avatarSrc = r.user?.profile?.avatar ?? r.user?.avatar ?? r.user?.profile?.image ?? '';

            return (
              <div className="flex items-center gap-3">
                <Avatar size="sm" className="border border-slate-200 bg-slate-100">
                  {avatarSrc ? (
                    <AvatarImage src={avatarSrc} alt={fullName} />
                  ) : (
                    <AvatarFallback className="bg-slate-200 text-slate-600">
                      <User className="h-3.5 w-3.5" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <span>{fullName}</span>
              </div>
            );
          },
        },
        { key: 'phone', label: 'Teléfono', render: (r) => r.user?.profile?.phone || '—' },
        { key: 'email', label: 'Email', render: (r) => r.user?.email || '—' },
        {
          key: 'activityLevel',
          label: 'Nivel',
          render: (r) => {
            const value = r.activityLevel;
            const labels: Record<string, string> = {
              BEGINNER: 'Principiante',
              INTERMEDIATE: 'Intermedio',
              ADVANCED: 'Avanzado',
            };
            return labels[value] ?? value ?? '—';
          },
        },
      ]}
      getEditValues={(member) => ({
        firstName: member.user?.profile?.firstName ?? '',
        lastName: member.user?.profile?.lastName ?? '',
        email: member.user?.email ?? '',
        identificationNumber: member.user?.profile?.identificationNumber ?? '',
        phone: member.user?.profile?.phone ?? '',
        address: member.user?.profile?.address ?? '',
        birthDate: member.user?.profile?.birthDate?.slice(0, 10) ?? '',
        activityLevel: member.activityLevel ?? '',
        preferredTime: member.user?.profile?.preferredTime ?? '',
      })}
      renderDetails={(member, onClose) => <MemberDetails member={member as MemberDetailsMember} onClose={onClose} />}
      onCreate={createMember}
      renderCreateForm={(props) => <MemberCreateForm {...props} />}
      hideListWhenCreating
      statusConfig={{
        getStatus: getMemberStatus,
        render: (status) => statusBadge(status),
        update: (id, status) => api.patch(`/members/${id}/status`, { status }),
      }}
      fields={[
        { name: 'firstName', label: 'Nombre', required: true },
        { name: 'lastName', label: 'Apellido', required: true },
        { name: 'email', label: 'Correo', type: 'email', required: true },
        { name: 'password', label: 'Contraseña (mín. 8 caracteres)', type: 'text', required: true, requiredOnEdit: false },
        { name: 'identificationNumber', label: 'CI / Cédula', required: true },
        { name: 'phone', label: 'Teléfono', type: 'phone' },
        { name: 'address', label: 'Dirección' },
        { name: 'birthDate', label: 'Fecha de nacimiento', type: 'date' },
        { name: 'activityLevel', label: 'Nivel de actividad', type: 'select', options: activityOptions },
        { name: 'preferredTime', label: 'Horario preferido', type: 'select', options: preferredTimeOptions },
      ]}
    />
  );
}

function MemberCreateForm({ form, setForm, onSubmit }: CreateFormRendererProps) {
  const [tab, setTab] = useState<'personal' | 'health' | 'emergency'>('personal');
  const [validationError, setValidationError] = useState('');
  const requiredFields = [
    'firstName', 'lastName', 'email', 'password', 'identificationNumber',
    'phone', 'address', 'birthDate', 'activityLevel', 'preferredTime',
  ];
  const requiredEmergencyFields = ['emergencyName', 'emergencyPhone', 'emergencyRelationship'];
  const set = (name: string, value: any) => setForm((current) => ({ ...current, [name]: value }));
  const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200';

  function input(name: string, label: string, type = 'text', required = false, onValueChange?: (value: string) => void) {
    return <label className="block text-sm font-medium text-slate-700">
      <span className="mb-1.5 block">{label}{required && <span className="ml-1 font-semibold text-red-600" aria-label="Campo obligatorio">*</span>}</span>
      <input type={type} required={required} value={form[name] ?? ''} onChange={(event) => onValueChange ? onValueChange(event.target.value) : set(name, event.target.value)} className={inputClass} />
    </label>;
  }

  function select(name: string, label: string, options: { value: string; label: string }[], required = false) {
    return <label className="block text-sm font-medium text-slate-700">
      <span className="mb-1.5 block">{label}{required && <span className="ml-1 font-semibold text-red-600" aria-label="Campo obligatorio">*</span>}</span>
      <select required={required} value={form[name] ?? ''} onChange={(event) => set(name, event.target.value)} className={inputClass}>
        <option value="">Selecciona...</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>;
  }

  function check(name: string, label: string) {
    return <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-700">
      <input type="checkbox" checked={Boolean(form[name])} onChange={(event) => set(name, event.target.checked)} className="h-4 w-4 accent-amber-600" />
      {label}
    </label>;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const missingField = requiredFields.find((field) => !String(form[field] ?? '').trim());
    if (missingField) {
      setTab('personal');
      setValidationError('Completa todos los datos personales obligatorios antes de guardar.');
      return;
    }
    if (!isValidPhone(form.phone)) {
      setTab('personal');
      setValidationError('El teléfono del socio debe tener un código válido y 7 dígitos, o ser un número extranjero.');
      return;
    }
    const missingEmergencyField = requiredEmergencyFields.find((field) => !String(form[field] ?? '').trim());
    if (missingEmergencyField) {
      setTab('emergency');
      setValidationError('Completa el nombre, teléfono y parentesco del contacto de emergencia.');
      return;
    }
    if (!isValidPhone(form.emergencyPhone)) {
      setTab('emergency');
      setValidationError('El teléfono del contacto debe tener un código válido y 7 dígitos, o ser un número extranjero.');
      return;
    }
    if (String(form.password).length < 8) {
      setTab('personal');
      setValidationError('La cédula debe tener al menos 8 caracteres para usarla como contraseña.');
      return;
    }
    if (form.password !== form.identificationNumber) {
      setTab('personal');
      setValidationError('La contraseña debe coincidir con la cédula.');
      return;
    }
    setValidationError('');
    onSubmit(event);
  }

  return <form onSubmit={handleSubmit} className="space-y-6">
    <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
      {([['personal', 'Datos personales'], ['health', 'Ficha médica'], ['emergency', 'Emergencia']] as const).map(([value, label]) => (
        <button key={value} type="button" onClick={() => setTab(value)} className={`rounded-lg px-3 py-3 text-sm font-semibold transition ${tab === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
          {label}
        </button>
      ))}
    </div>
    {validationError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{validationError}</p>}

    {tab === 'personal' && <div className="grid gap-4 md:grid-cols-2">
      {input('firstName', 'Nombre', 'text', true)}
      {input('lastName', 'Apellido', 'text', true)}
      {input('email', 'Correo', 'email', true)}
      {input('identificationNumber', 'CI / Cédula', 'text', true, (value) => {
        set('identificationNumber', value);
        set('password', value);
      })}
      <label className="block text-sm font-medium text-slate-700">
        <span className="mb-1.5 block">Contraseña<span className="ml-1 font-semibold text-red-600" aria-label="Campo obligatorio">*</span></span>
        <input type="text" readOnly value={form.password ?? ''} className={`${inputClass} bg-slate-100 text-slate-600`} aria-readonly="true" />
      </label>
      <label className="block text-sm font-medium text-slate-700"><span className="mb-1.5 block">Teléfono<span className="ml-1 font-semibold text-red-600" aria-label="Campo obligatorio">*</span></span><PhoneField value={form.phone ?? ''} onChange={(value) => set('phone', value)} /></label>
      {input('address', 'Dirección', 'text', true)}
      {input('birthDate', 'Fecha de nacimiento', 'date', true)}
      {select('activityLevel', 'Nivel de actividad', activityOptions, true)}
      {select('preferredTime', 'Horario preferido', preferredTimeOptions, true)}
    </div>}

    {tab === 'health' && <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {check('healthHypertension', 'Hipertensión')}
        {check('healthDiabetes', 'Diabetes')}
        {check('healthHeartProblems', 'Problemas cardiacos')}
        {check('healthAsthma', 'Asma')}
      </div>
      <label className="block text-sm font-medium text-slate-700"><span className="mb-1.5 block">Otras condiciones</span><textarea value={form.healthOtherConditions ?? ''} onChange={(event) => set('healthOtherConditions', event.target.value)} className={`${inputClass} min-h-24`} /></label>
      {check('healthHasInjury', 'Tiene lesión o limitación')}
      {form.healthHasInjury && <label className="block text-sm font-medium text-slate-700"><span className="mb-1.5 block">Descripción de la lesión</span><textarea value={form.healthInjuryDescription ?? ''} onChange={(event) => set('healthInjuryDescription', event.target.value)} className={`${inputClass} min-h-24`} /></label>}
      {check('healthTakesMedication', 'Toma medicación continua')}
      {form.healthTakesMedication && <label className="block text-sm font-medium text-slate-700"><span className="mb-1.5 block">Descripción de la medicación</span><textarea value={form.healthMedicationDescription ?? ''} onChange={(event) => set('healthMedicationDescription', event.target.value)} className={`${inputClass} min-h-24`} /></label>}
    </div>}

    {tab === 'emergency' && <div className="grid gap-4 md:grid-cols-2">
      {input('emergencyName', 'Nombre', 'text', true)}
      <label className="block text-sm font-medium text-slate-700"><span className="mb-1.5 block">Teléfono<span className="ml-1 font-semibold text-red-600" aria-label="Campo obligatorio">*</span></span><PhoneField value={form.emergencyPhone ?? ''} onChange={(value) => set('emergencyPhone', value)} /></label>
      {select('emergencyRelationship', 'Parentesco', [{ value: 'MADRE', label: 'Madre' }, { value: 'PADRE', label: 'Padre' }, { value: 'HERMANO', label: 'Hermano' }, { value: 'HERMANA', label: 'Hermana' }, { value: 'PAREJA', label: 'Pareja' }, { value: 'AMIGO', label: 'Amigo' }, { value: 'AMIGA', label: 'Amiga' }, { value: 'VECINO', label: 'Vecino' }, { value: 'VECINA', label: 'Vecina' }, { value: 'OTRO', label: 'Otro' }], true)}
    </div>}

    <div className="flex items-center justify-between border-t border-slate-200 pt-4">
      <p className="text-xs text-slate-500"><span className="font-semibold text-red-600">*</span> Campo requerido</p>
      <button type="submit" className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700">Guardar socio</button>
    </div>
  </form>;
}
