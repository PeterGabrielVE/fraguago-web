'use client';
import { useEffect, useState } from 'react';
import ResourceManager, { type SelectOption } from '@/components/ResourceManager';
import { api } from '@/lib/api';
import { Ban, CirclePause, CirclePlay, CreditCard, RefreshCw } from 'lucide-react';
import { MEMBERSHIP_STATUS_BADGES, MEMBERSHIP_STATUS_LABELS, effectiveMembershipStatus } from '@/lib/membershipStatus';

function nowAsDatetimeLocal() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

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
      icon={CreditCard}
      endpoint="/memberships"
      formVariant="modal"
      filters={[
        { label: 'Todas', endpoint: '/memberships' },
        { label: 'Por vencer', endpoint: '/memberships/expiring' },
        { label: 'Vencidas', endpoint: '/memberships/expired' },
      ]}
      columns={[
        { key: 'member', label: 'Socio', render: (r) => memberFullName(r.member) || r.memberId },
        { key: 'plan', label: 'Plan', render: (r) => r.plan?.name || r.planId },
        { key: 'endDate', label: 'Vence', render: (r) => new Date(r.endDate).toLocaleDateString('es-MX') },
        {
          key: 'status', label: 'Estado', render: (r) => {
            const s = effectiveMembershipStatus(r);
            return (
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${MEMBERSHIP_STATUS_BADGES[s] ?? 'bg-slate-100 text-slate-600'}`}>
                {MEMBERSHIP_STATUS_LABELS[s] ?? s}
              </span>
            );
          },
        },
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
      getEditValues={(row) => ({
        memberId: row.memberId,
        planId: row.planId,
        startDate: row.startDate ? String(row.startDate).slice(0, 16) : '',
      })}
      extraActions={(row) => [
        {
          label: 'Renovar',
          icon: RefreshCw,
          confirm: true,
          confirmTitle: 'Renovar membresía',
          confirmDescription: `Se renovará la membresía de ${memberFullName(row.member) || row.memberId} con el plan ${row.plan?.name || row.planId}.`,
          onClick: () => api.post(`/memberships/${row.id}/renew`, {}),
        },
        // DB-02 — estado administrativo: suspender (congela y bloquea el
        // check-in), reactivar o cancelar (definitivo).
        ...(row.status === 'ACTIVE' ? [{
          label: 'Suspender',
          icon: CirclePause,
          confirm: true,
          confirmTitle: 'Suspender membresía',
          confirmDescription: `${memberFullName(row.member) || 'El socio'} no podrá registrar asistencia hasta que la reactives.`,
          onClick: () => api.patch(`/memberships/${row.id}/status`, { status: 'SUSPENDED' }),
        }] : []),
        ...(row.status === 'SUSPENDED' ? [{
          label: 'Reactivar',
          icon: CirclePlay,
          confirm: true,
          confirmTitle: 'Reactivar membresía',
          confirmDescription: `${memberFullName(row.member) || 'El socio'} vuelve a poder registrar asistencia.`,
          onClick: () => api.patch(`/memberships/${row.id}/status`, { status: 'ACTIVE' }),
        }] : []),
        ...(row.status !== 'CANCELLED' ? [{
          label: 'Cancelar',
          icon: Ban,
          confirm: true,
          confirmTitle: 'Cancelar membresía',
          confirmDescription: 'La cancelación es definitiva: para volver a habilitar al socio habrá que asignarle una membresía nueva.',
          className: 'text-red-600',
          onClick: () => api.patch(`/memberships/${row.id}/status`, { status: 'CANCELLED' }),
        }] : []),
      ]}
    />
  );
}
