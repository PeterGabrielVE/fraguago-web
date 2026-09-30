'use client';
import { useEffect, useState } from 'react';
import ResourceManager, { type SelectOption } from '@/components/ResourceManager';
import { api } from '@/lib/api';
import { Ban, CirclePause, CirclePlay, CreditCard, Plus, RefreshCw } from 'lucide-react';
import MembershipPaymentDialog, { type PlanOption } from '@/components/MembershipPaymentDialog';
import { MEMBERSHIP_STATUS_BADGES, MEMBERSHIP_STATUS_LABELS, effectiveMembershipStatus } from '@/lib/membershipStatus';
import { useI18n } from '@/components/I18nProvider';

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
  const { t, intlLocale } = useI18n();
  const [memberOptions, setMemberOptions] = useState<SelectOption[]>([]);
  const [planOptions, setPlanOptions] = useState<SelectOption[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [dialog, setDialog] = useState<{ open: boolean; renew: { id: string; memberName: string; planId: string } | null }>({ open: false, renew: null });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    api.list('/members').then((members) => {
      setMemberOptions(members.map((m: any) => ({
        value: String(m.id),
        label: `${m.user?.profile?.firstName ?? ''} ${m.user?.profile?.lastName ?? ''}`.trim() || m.user?.email || m.id,
      })));
    }).catch(() => {});
    api.list('/membership-plans').then((rows) => {
      setPlanOptions(rows.map((p: any) => ({ value: String(p.id), label: p.name })));
      setPlans(rows.map((p: any) => ({ value: String(p.id), label: p.name, price: Number(p.price), currency: p.currency ?? 'USD' })));
    }).catch(() => {});
  }, []);

  return (
    <>
    <ResourceManager
      key={reloadKey}
      title={t('payments.memberships.title')} subtitle={t('payments.memberships.subtitle')}
      icon={CreditCard}
      endpoint="/memberships"
      formVariant="modal"
      // Alta con datos del pago (método, referencia, comprobante): diálogo propio.
      disableCreate
      headerActions={
        <button
          type="button"
          onClick={() => setDialog({ open: true, renew: null })}
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700"
        >
          <Plus className="h-4 w-4" /> {t('payments.memberships.newMembership')}
        </button>
      }
      filters={[
        { label: t('payments.memberships.filterAll'), endpoint: '/memberships' },
        { label: t('payments.memberships.filterExpiring'), endpoint: '/memberships/expiring' },
        { label: t('payments.memberships.filterExpired'), endpoint: '/memberships/expired' },
      ]}
      columns={[
        { key: 'member', label: t('payments.memberships.member'), render: (r) => memberFullName(r.member) || r.memberId },
        { key: 'plan', label: t('payments.memberships.plan'), render: (r) => r.plan?.name || r.planId },
        { key: 'endDate', label: t('payments.memberships.expires'), render: (r) => new Date(r.endDate).toLocaleDateString(intlLocale) },
        {
          key: 'status', label: t('payments.memberships.status'), render: (r) => {
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
        { name: 'memberId', label: t('payments.memberships.member'), type: 'select', required: true, options: memberOptions },
        { name: 'planId', label: t('payments.memberships.plan'), type: 'select', required: true, options: planOptions },
        { name: 'startDate', label: t('payments.memberships.startDate'), type: 'datetime-local', defaultValue: nowAsDatetimeLocal },
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
        ...(row.status !== 'CANCELLED' ? [{
          label: t('payments.memberships.renew'),
          icon: RefreshCw,
          silent: true,
          // Renovar es un cobro: se registra cómo se pagó.
          onClick: () => setDialog({
            open: true,
            renew: { id: row.id, memberName: memberFullName(row.member) || t('payments.memberships.memberFallback'), planId: row.planId },
          }),
        }] : []),
        // DB-02 — estado administrativo: suspender (congela y bloquea el
        // check-in), reactivar o cancelar (definitivo).
        ...(row.status === 'ACTIVE' ? [{
          label: t('payments.memberships.suspend'),
          icon: CirclePause,
          confirm: true,
          confirmTitle: t('payments.memberships.suspendTitle'),
          confirmDescription: t('payments.memberships.suspendDesc', { name: memberFullName(row.member) || t('payments.memberships.theMember') }),
          onClick: () => api.patch(`/memberships/${row.id}/status`, { status: 'SUSPENDED' }),
        }] : []),
        ...(row.status === 'SUSPENDED' ? [{
          label: t('payments.memberships.reactivate'),
          icon: CirclePlay,
          confirm: true,
          confirmTitle: t('payments.memberships.reactivateTitle'),
          confirmDescription: t('payments.memberships.reactivateDesc', { name: memberFullName(row.member) || t('payments.memberships.theMember') }),
          onClick: () => api.patch(`/memberships/${row.id}/status`, { status: 'ACTIVE' }),
        }] : []),
        ...(row.status !== 'CANCELLED' ? [{
          label: t('payments.memberships.cancel'),
          icon: Ban,
          confirm: true,
          confirmTitle: t('payments.memberships.cancelTitle'),
          confirmDescription: t('payments.memberships.cancelDesc'),
          className: 'text-red-600',
          onClick: () => api.patch(`/memberships/${row.id}/status`, { status: 'CANCELLED' }),
        }] : []),
      ]}
    />
    <MembershipPaymentDialog
      open={dialog.open}
      renew={dialog.renew}
      plans={plans}
      members={memberOptions.map((m) => (typeof m === 'string' ? { value: m, label: m } : m))}
      onClose={() => setDialog({ open: false, renew: null })}
      onDone={() => { setDialog({ open: false, renew: null }); setReloadKey((k) => k + 1); }}
    />
    </>
  );
}
