'use client';
import { useRef } from 'react';
import { ShieldCheck } from 'lucide-react';
import ResourceManager from '@/components/ResourceManager';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Propietario',
  ADMIN: 'Administrador',
  TRAINER: 'Entrenador',
  STAFF: 'Personal',
  MEMBER: 'Socio',
};
const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));

const PREFERRED_TIME_OPTIONS = [
  { value: 'MAÑANA', label: 'Mañana' },
  { value: 'TARDE', label: 'Tarde' },
  { value: 'NOCHE', label: 'Noche' },
  { value: 'OTROS', label: 'Otros' },
];

export default function Page() {
  // Guarda el rol elegido en el <select> no controlado del diálogo de "Asignar rol", por fila.
  const roleDraft = useRef<Record<string, string>>({});

  return (
    <ResourceManager
      title="Usuarios"
      icon={ShieldCheck}
      endpoint="/users"
      formVariant="modal"
      columns={[
        { key: 'profile', label: 'Nombre', render: (r) => `${r.profile?.firstName ?? ''} ${r.profile?.lastName ?? ''}`.trim() || '—' },
        { key: 'email', label: 'Email', render: (r) => r.email || '—' },
        {
          key: 'role',
          label: 'Rol',
          render: (r) => (
            <Badge variant={r.role === 'OWNER' || r.role === 'ADMIN' ? 'default' : 'secondary'}>
              {ROLE_LABELS[r.role] ?? r.role}
            </Badge>
          ),
        },
        { key: 'phone', label: 'Teléfono', render: (r) => r.profile?.phone || '—' },
        { key: 'createdAt', label: 'Creado', render: (r) => new Date(r.createdAt).toLocaleDateString('es-MX') },
      ]}
      getEditValues={(row) => ({
        firstName: row.profile?.firstName ?? '',
        lastName: row.profile?.lastName ?? '',
        phone: row.profile?.phone ?? '',
        address: row.profile?.address ?? '',
        preferredTime: row.profile?.preferredTime ?? '',
      })}
      fields={[
        { name: 'firstName', label: 'Nombre', required: true, requiredOnEdit: true },
        { name: 'lastName', label: 'Apellido' },
        { name: 'email', label: 'Correo', type: 'email', required: true, createOnly: true },
        { name: 'password', label: 'Contraseña', required: true, createOnly: true },
        { name: 'role', label: 'Rol', type: 'select', options: ROLE_OPTIONS, required: true, createOnly: true },
        { name: 'phone', label: 'Teléfono', type: 'phone' },
        { name: 'address', label: 'Dirección', editOnly: true },
        { name: 'preferredTime', label: 'Horario preferido', type: 'select', options: PREFERRED_TIME_OPTIONS, editOnly: true },
      ]}
      extraActions={(row) => [
        {
          label: 'Asignar rol',
          icon: ShieldCheck,
          confirm: true,
          confirmTitle: 'Asignar rol',
          confirmDescription: (
            <div className="space-y-2 text-sm">
              <p>
                Nuevo rol para{' '}
                <span className="font-medium text-foreground">
                  {`${row.profile?.firstName ?? ''} ${row.profile?.lastName ?? ''}`.trim() || row.email}
                </span>
                :
              </p>
              <select
                defaultValue={row.role}
                onChange={(e) => { roleDraft.current[row.id] = e.target.value; }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              >
                {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          ),
          onClick: async () => {
            const role = roleDraft.current[row.id] ?? row.role;
            await api.patch(`/users/${row.id}/role`, { role });
          },
        },
      ]}
    />
  );
}
