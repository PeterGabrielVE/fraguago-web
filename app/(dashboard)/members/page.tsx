'use client';
import ResourceManager from '@/components/ResourceManager';
import MemberDetails, { type MemberDetailsMember } from '@/components/MemberDetails';
export default function Page() {
  return (
    <ResourceManager
      title="Socios" subtitle="Los clientes de tu gimnasio."
      endpoint="/members"
      columns={[
        { key: 'user', label: 'Nombre', render: (r) => `${r.user?.profile?.firstName} ${r.user?.profile?.lastName}` },
        { key: 'phone', label: 'Teléfono', render: (r) => r.user?.profile?.phone || '—' },
        { key: 'email', label: 'Email', render: (r) => r.user?.email || '—' },
        { key: 'activityLevel', label: 'Nivel' },
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
        preferredTime: member.preferredTime ?? '',
      })}
      renderDetails={(member, onClose) => <MemberDetails member={member as MemberDetailsMember} onClose={onClose} />}
      fields={[
        { name: 'firstName', label: 'Nombre', required: true },
        { name: 'lastName', label: 'Apellido', required: true },
        { name: 'email', label: 'Correo', type: 'email', required: true },
        { name: 'password', label: 'Contraseña (mín. 8 caracteres)', type: 'text', required: true, requiredOnEdit: false },
        { name: 'identificationNumber', label: 'CI / Cédula', required: true },
        { name: 'phone', label: 'Teléfono' },
        { name: 'address', label: 'Dirección' },
        { name: 'birthDate', label: 'Fecha de nacimiento', type: 'date' },
        { name: 'activityLevel', label: 'Nivel de actividad', type: 'select', options: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] },
        { name: 'preferredTime', label: 'Horario preferido (Mañana/Tarde/Noche)' },
      ]}
    />
  );
}
