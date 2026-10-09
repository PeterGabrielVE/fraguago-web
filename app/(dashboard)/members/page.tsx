'use client';
import { useCallback, useState } from 'react';
import ResourceManager from '@/components/ResourceManager';
import MemberDetails, { type MemberDetailsMember } from '@/components/MemberDetails';
import ExportButton from '@/components/ExportButton';
import SignupLinkButton from '@/components/SignupLinkButton';
import MemberCreate from '@/components/MemberCreate';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SlidersHorizontal, User, Users, X } from 'lucide-react';
import { api } from '@/lib/api';
import { activityOptions, preferredTimeOptions } from '@/lib/memberOptions';
import { useT } from '@/components/I18nProvider';
import type { Translate } from '@/lib/i18n/translate';
import { ageFrom, birthMonth, formatBirthDate, monthNames } from '@/lib/birthdays';
import { activeIntlLocale } from '@/lib/i18n/client';

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

type MemberFilterState = { ageFrom: string; ageTo: string; month: string; joinedFrom: string; joinedTo: string };
const EMPTY_FILTERS: MemberFilterState = { ageFrom: '', ageTo: '', month: '', joinedFrom: '', joinedTo: '' };

function matchesFilters(member: Record<string, any>, f: MemberFilterState): boolean {
  if (f.ageFrom || f.ageTo || f.month) {
    const age = ageFrom(member.birthDate);
    if (age === null) return false;
    if (f.ageFrom && age < Number(f.ageFrom)) return false;
    if (f.ageTo && age > Number(f.ageTo)) return false;
    if (f.month && birthMonth(member.birthDate) !== Number(f.month)) return false;
  }
  if (f.joinedFrom || f.joinedTo) {
    // joinedAt es un instante: se compara su día local con las fechas del filtro (YYYY-MM-DD).
    const joined = member.joinedAt ?? member.createdAt;
    if (!joined) return false;
    const d = new Date(joined);
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (f.joinedFrom && day < f.joinedFrom) return false;
    if (f.joinedTo && day > f.joinedTo) return false;
  }
  return true;
}

const filterInput = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200';

function MemberFilters({ value, onChange }: { value: MemberFilterState; onChange: (value: MemberFilterState) => void }) {
  const t = useT();
  const months = monthNames(activeIntlLocale());
  const active = Object.values(value).some(Boolean);
  const set = (key: keyof MemberFilterState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange({ ...value, [key]: e.target.value });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-800"><SlidersHorizontal className="h-4 w-4 text-amber-600" />{t('birthdays.filters.title')}</p>
        {active && (
          <button type="button" onClick={() => onChange(EMPTY_FILTERS)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100">
            <X className="h-3.5 w-3.5" />{t('birthdays.filters.clear')}
          </button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-xs font-medium text-slate-600">{t('birthdays.filters.ageFrom')}
          <input type="number" min={0} max={120} inputMode="numeric" value={value.ageFrom} onChange={set('ageFrom')} className={`${filterInput} mt-1`} />
        </label>
        <label className="text-xs font-medium text-slate-600">{t('birthdays.filters.ageTo')}
          <input type="number" min={0} max={120} inputMode="numeric" value={value.ageTo} onChange={set('ageTo')} className={`${filterInput} mt-1`} />
        </label>
        <label className="text-xs font-medium text-slate-600">{t('birthdays.filters.birthMonth')}
          <select value={value.month} onChange={set('month')} className={`${filterInput} mt-1 capitalize`}>
            <option value="">{t('birthdays.filters.anyMonth')}</option>
            {months.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600">{t('birthdays.filters.joinedFrom')}
          <input type="date" value={value.joinedFrom} max={value.joinedTo || undefined} onChange={set('joinedFrom')} className={`${filterInput} mt-1`} />
        </label>
        <label className="text-xs font-medium text-slate-600">{t('birthdays.filters.joinedTo')}
          <input type="date" value={value.joinedTo} min={value.joinedFrom || undefined} onChange={set('joinedTo')} className={`${filterInput} mt-1`} />
        </label>
      </div>
      {(value.ageFrom || value.ageTo || value.month) && <p className="mt-2 text-xs text-slate-500">{t('birthdays.filters.noBirthDate')}</p>}
    </div>
  );
}

export default function Page() {
  const t = useT();
  const [memberFilters, setMemberFilters] = useState<MemberFilterState>(EMPTY_FILTERS);
  const filtering = Object.values(memberFilters).some(Boolean);
  const rowFilter = useCallback((row: Record<string, any>) => matchesFilters(row, memberFilters), [memberFilters]);
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
        {
          key: 'age',
          label: t('birthdays.age'),
          render: (r) => {
            const age = ageFrom(r.birthDate);
            return age === null ? '—' : <span title={formatBirthDate(r.birthDate, activeIntlLocale())}>{age}</span>;
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
        identificationNumber: member.identificationNumber ?? '',
        phone: member.user?.profile?.phone ?? '',
        address: member.user?.profile?.address ?? '',
        birthDate: member.birthDate?.slice(0, 10) ?? '',
        activityLevel: member.activityLevel ?? '',
        preferredTime: member.user?.profile?.preferredTime ?? '',
      })}
      intro={<MemberFilters value={memberFilters} onChange={setMemberFilters} />}
      rowFilter={filtering ? rowFilter : undefined}
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
