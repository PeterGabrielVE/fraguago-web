'use client';
import ResourceManager from '@/components/ResourceManager';
import MemberDetails, { type MemberDetailsMember } from '@/components/MemberDetails';
import ExportButton from '@/components/ExportButton';
import MemberCreate from '@/components/MemberCreate';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Users } from 'lucide-react';
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
  return (
    <ResourceManager
      title="Socios" subtitle="Los clientes de tu gimnasio."
      icon={Users}
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
      headerActions={<ExportButton resource="members" />}
      renderDetails={(member, onClose) => <MemberDetails member={member as MemberDetailsMember} onClose={onClose} />}
      renderCreate={(onDone, onCancel) => <MemberCreate onCreated={onDone} onCancel={onCancel} />}
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
