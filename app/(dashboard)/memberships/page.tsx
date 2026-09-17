'use client';
import { useEffect, useState } from 'react';
import ResourceManager, { type SelectOption } from '@/components/ResourceManager';
import { api } from '@/lib/api';
import { RefreshCw } from 'lucide-react';

function nowAsDatetimeLocal() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

const MEMBERSHIP_STATUS_LABELS: Record<string, string> = {
  active: 'Activa',
  expired: 'Vencida',
  cancelled: 'Cancelada',
  canceled: 'Cancelada',
  pending: 'Pendiente',
  suspended: 'Suspendida',
};

function memberFullName(member: any) {
  const firstName = member?.user?.profile?.firstName ?? '';
  const lastName = member?.user?.profile?.lastName ?? '';
  return `${firstName} ${lastName}`.trim();
}

export default function Page() {
  const [memberOptions, setMemberOptions] = useState<SelectOption[]>([]);
  const [planOptions, setPlanOptions] = useState<SelectOption[]>([]);

  useEffect(() => {
    api.list('/members').then((members) => {
      setMemberOptions(members.map((m: any) => ({
        value: String(m.id),
        label: `${m.user?.profile?.firstName ?? ''} ${m.user?.profile?.lastName ?? ''}`.trim() || m.user?.email || m.id,
      })));
    }).catch(() => {});
    api.list('/membership-plans').then((plans) => {
      setPlanOptions(plans.map((p: any) => ({ value: String(p.id), label: p.name })));
    }).catch(() => {});
  }, []);

  return (
    <ResourceManager
      title="Membresías" subtitle="Asigna un plan a un socio; el vencimiento se calcula solo."
      endpoint="/memberships"
      formVariant="modal"
      columns={[
        { key: 'member', label: 'Socio', render: (r) => memberFullName(r.member) || r.memberId },
        { key: 'plan', label: 'Plan', render: (r) => r.plan?.name || r.planId },
        { key: 'endDate', label: 'Vence', render: (r) => new Date(r.endDate).toLocaleDateString('es-MX') },
        { key: 'status', label: 'Estado', render: (r) => MEMBERSHIP_STATUS_LABELS[r.status] ?? r.status },
      ]}
      fields={[
        { name: 'memberId', label: 'Socio', type: 'select', required: true, options: memberOptions },
        { name: 'planId', label: 'Plan', type: 'select', required: true, options: planOptions },
        { name: 'startDate', label: 'Fecha de inicio', type: 'datetime-local', defaultValue: nowAsDatetimeLocal },
      ]}
      onCreate={(payload) => api.post(`/members/${payload.memberId}/memberships`, {
        planId: payload.planId,
        startDate: payload.startDate,
      })}
      disableEdit
      extraActions={(row) => [
        {
          label: 'Renovar',
          icon: RefreshCw,
          confirm: true,
          confirmTitle: 'Renovar membresía',
          confirmDescription: `Se renovará la membresía de ${memberFullName(row.member) || row.memberId} con el plan ${row.plan?.name || row.planId}.`,
          onClick: () => api.post(`/memberships/${row.id}/renew`, {}),
        },
      ]}
    />
  );
}
