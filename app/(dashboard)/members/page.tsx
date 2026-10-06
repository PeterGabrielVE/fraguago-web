'use client';
import ResourceManager from '@/components/ResourceManager';
import MemberDetails, { type MemberDetailsMember } from '@/components/MemberDetails';
import ExportButton from '@/components/ExportButton';
import SignupLinkButton from '@/components/SignupLinkButton';
import MemberCreate from '@/components/MemberCreate';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { activityOptions, preferredTimeOptions } from '@/lib/memberOptions';
import { useT } from '@/components/I18nProvider';
import type { Translate } from '@/lib/i18n/translate';

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

const MEMBER_STATUSES = ['ACTIVE', 'SUSPENDED', 'INACTIVE', 'EXPIRED'] as const;

function statusBadge(status: string, t: Translate) {
  const known = (MEMBER_STATUSES as readonly string[]).includes(status);
  const colors: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-700',
    SUSPENDED: 'bg-amber-100 text-amber-800',
    INACTIVE: 'bg-slate-100 text-slate-600',
    EXPIRED: 'bg-red-100 text-red-700',
  };

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${colors[status] ?? colors.INACTIVE}`}>{known ? t(`labels.memberStatus.${status as (typeof MEMBER_STATUSES)[number]}`) : status}</span>;
}

export default function Page() {
  const t = useT();
  return (
    <ResourceManager
      title={t('members.page.title')} subtitle={t('members.page.subtitle')}
      icon={Users}
      endpoint="/members"
      columns={[
        {
          key: 'user',
          label: t('members.fields.name'),
          render: (r) => {
            const firstName = r.user?.profile?.firstName ?? '';
            const lastName = r.user?.profile?.lastName ?? '';
            const fullName = `${firstName} ${lastName}`.trim() || t('members.page.noName');
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
        { key: 'phone', label: t('members.fields.phone'), render: (r) => r.user?.profile?.phone || '—' },
        { key: 'email', label: t('members.fields.email'), render: (r) => r.user?.email || '—' },
        {
          key: 'activityLevel',
          label: t('members.fields.level'),
          render: (r) => activityOptions.find((o) => o.value === r.activityLevel)?.label ?? r.activityLevel ?? '—',
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
      headerActions={<div className="flex flex-wrap items-center gap-2"><SignupLinkButton /><ExportButton resource="members" /></div>}
      renderDetails={(member, onClose) => <MemberDetails member={member as MemberDetailsMember} onClose={onClose} />}
      renderCreate={(onDone, onCancel) => <MemberCreate onCreated={onDone} onCancel={onCancel} />}
      statusConfig={{
        getStatus: getMemberStatus,
        render: (status) => statusBadge(status, t),
        update: (id, status) => api.patch(`/members/${id}/status`, { status }),
      }}
      fields={[
        { name: 'firstName', label: t('members.fields.firstName'), required: true },
        { name: 'lastName', label: t('members.fields.lastName'), required: true },
        { name: 'email', label: t('members.fields.email'), type: 'email', required: true },
        { name: 'password', label: t('members.fields.passwordMin'), type: 'text', required: true, requiredOnEdit: false },
        { name: 'identificationNumber', label: t('members.fields.idNumber'), required: true },
        { name: 'phone', label: t('members.fields.phone'), type: 'phone' },
        { name: 'address', label: t('members.fields.address') },
        { name: 'birthDate', label: t('members.fields.birthDate'), type: 'date' },
        { name: 'activityLevel', label: t('members.fields.activityLevel'), type: 'select', options: activityOptions },
        { name: 'preferredTime', label: t('members.fields.preferredTime'), type: 'select', options: preferredTimeOptions },
      ]}
    />
  );
}
