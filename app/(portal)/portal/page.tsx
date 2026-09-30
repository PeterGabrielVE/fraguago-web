'use client';
import { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ClipboardCheck, CreditCard, Clock, Dumbbell, Activity, LogOut } from 'lucide-react';
import OccupancyCard from '@/components/OccupancyCard';
import { useAsync } from '@/hooks/useAsync';
import { AsyncBoundary } from '@/components/async-boundary';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/toast';
import { Badge } from '@/components/ui/badge';
import {
  fmtMeasurement,
  isMembershipActive,
  trainerName,
  SHIFT_LABELS,
  type Attendance,
  type MeProfile,
  type Membership,
  type Measurement,
  type MeasurementListResponse,
  type PaginatedResponse,
  type Routine,
} from '@/lib/portal';
import { requestBadgesRefresh } from '@/lib/gamification';
import { challengeUpdatesMessage } from '@/lib/challenges';
import { useI18n, useT } from '@/components/I18nProvider';

type DashboardData = {
  profile: MeProfile;
  membership: Membership | null;
  lastAttendance: Attendance | null;
  activeRoutine: Routine | null;
  lastMeasurement: Measurement | null;
};

async function loadDashboard(): Promise<DashboardData> {
  const [profile, membershipRes, attendances, routines, progressRes] = await Promise.all([
    api.get('/me/profile') as Promise<MeProfile>,
    api.get('/me/membership?pageSize=1') as Promise<PaginatedResponse<Membership>>,
    api.list('/me/attendances') as Promise<Attendance[]>,
    api.list('/me/routine') as Promise<Routine[]>,
    api.get('/me/progress?pageSize=1') as Promise<MeasurementListResponse>,
  ]);

  return {
    profile,
    membership: membershipRes.data?.[0] ?? null,
    lastAttendance: attendances[0] ?? null,
    activeRoutine: routines[0] ?? null,
    lastMeasurement: progressRes.data?.[0] ?? null,
  };
}

export default function PortalDashboardPage() {
  const t = useT();
  const { status, data, error, refetch } = useAsync<DashboardData>(loadDashboard, []);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  async function handleCheckOut() {
    setCheckingOut(true);
    try {
      await api.post('/me/check-out', {});
      toast.add({ title: t('portal.home.checkedOut'), description: t('portal.home.seeYou'), type: 'success' });
    } catch (e: any) {
      toast.add({ title: t('portal.home.checkOutFailed'), description: e.message, type: 'error' });
    } finally {
      setCheckingOut(false);
    }
  }

  async function handleCheckIn() {
    setCheckingIn(true);
    try {
      const res = await api.post('/me/check-in', {});
      const pointsAwarded: number = res?.gamification?.pointsAwarded ?? 0;
      const details = [
        pointsAwarded > 0 ? t('portal.home.plusPoints', { points: pointsAwarded }) : undefined,
        challengeUpdatesMessage(res?.challenges),
      ].filter(Boolean);
      toast.add({
        title: t('portal.home.checkedIn'),
        description: details.length ? details.join(' · ') : undefined,
        type: 'success',
      });
      requestBadgesRefresh();
      refetch();
    } catch (e: any) {
      toast.add({ title: t('portal.home.checkInFailed'), description: e.message, type: 'error' });
    } finally {
      setCheckingIn(false);
    }
  }

  return (
    <div className="space-y-6 p-8">
      <AsyncBoundary
        status={status}
        data={data}
        error={error}
        onRetry={refetch}
        isEmpty={() => false}
        loading={
          <div className="flex items-center justify-center py-24">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
          </div>
        }
        errorFallback={
          <div role="alert" className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <p className="text-sm text-slate-600">{error?.message ?? t('portal.loadError')}</p>
            <button onClick={refetch} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm transition hover:bg-slate-50">
              {t('common.retry')}
            </button>
          </div>
        }
      >
        {(d) => (
          <DashboardContent
            data={d}
            onCheckIn={handleCheckIn}
            checkingIn={checkingIn}
            onCheckOut={handleCheckOut}
            checkingOut={checkingOut}
          />
        )}
      </AsyncBoundary>
    </div>
  );
}

function DashboardContent({
  data,
  onCheckIn,
  checkingIn,
  onCheckOut,
  checkingOut,
}: {
  data: DashboardData;
  onCheckIn: () => void;
  checkingIn: boolean;
  onCheckOut: () => void;
  checkingOut: boolean;
}) {
  const { t, intlLocale } = useI18n();
  const { profile, membership, lastAttendance, activeRoutine, lastMeasurement } = data;
  const firstName = profile.profile?.firstName ?? '';
  const membershipActive = isMembershipActive(membership);

  return (
    <>
      {/* Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{t('portal.home.hello', { name: firstName || t('portal.home.memberFallback') })}</h1>
            <p className="mt-1 text-slate-600">{t('portal.home.summary')}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onCheckIn}
              disabled={checkingIn}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ClipboardCheck className="h-5 w-5" />
              {checkingIn ? t('portal.registering') : t('portal.home.checkIn')}
            </button>
            <button
              type="button"
              onClick={onCheckOut}
              disabled={checkingOut}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogOut className="h-5 w-5" />
              {checkingOut ? t('portal.registering') : t('portal.home.checkOut')}
            </button>
          </div>
        </div>
      </div>

      <OccupancyCard scope="member" />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {/* Membresía */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <CreditCard className="h-4 w-4 text-amber-600" />
            {t('portal.home.membership')}
          </h2>
          {membership ? (
            <div className="mt-3 space-y-2">
              <p className="text-lg font-semibold text-slate-900">{membership.plan?.name ?? '—'}</p>
              <Badge variant="outline" className={membershipActive ? 'border-transparent bg-emerald-100 text-emerald-700' : 'border-transparent bg-red-100 text-red-700'}>
                {membershipActive ? t('portal.home.active') : t('portal.home.expired')}
              </Badge>
              <p className="text-sm text-slate-500">
                {t('portal.home.expiresOn', { date: membership.endDate ? new Date(membership.endDate).toLocaleDateString(intlLocale) : '—' })}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">{t('portal.home.noMembership')}</p>
          )}
          <Link href="/portal/membership" className="mt-4 inline-block text-xs font-semibold text-amber-700 hover:text-amber-800">
            {t('portal.home.viewDetail')}
          </Link>
        </div>

        {/* Última asistencia */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Clock className="h-4 w-4 text-amber-600" />
            {t('portal.home.lastAttendance')}
          </h2>
          {lastAttendance ? (
            <div className="mt-3 space-y-1">
              <p className="text-lg font-semibold text-slate-900">
                {new Date(lastAttendance.checkedInAt).toLocaleString(intlLocale)}
              </p>
              <p className="text-sm text-slate-500">{t('portal.home.shift', { shift: SHIFT_LABELS[lastAttendance.shift] ?? lastAttendance.shift })}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">{t('portal.home.noAttendance')}</p>
          )}
          <Link href="/portal/attendance" className="mt-4 inline-block text-xs font-semibold text-amber-700 hover:text-amber-800">
            {t('portal.home.viewHistory')}
          </Link>
        </div>

        {/* Rutina activa */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Dumbbell className="h-4 w-4 text-amber-600" />
            {t('portal.home.routine')}
          </h2>
          {activeRoutine ? (
            <div className="mt-3 space-y-1">
              <p className="text-lg font-semibold text-slate-900">{activeRoutine.name}</p>
              <p className="text-sm text-slate-500">
                {trainerName(activeRoutine.trainer) ? t('portal.home.trainer', { name: trainerName(activeRoutine.trainer) }) : t('portal.home.noTrainer')}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">{t('portal.home.noRoutine')}</p>
          )}
          <Link href="/portal/routine" className="mt-4 inline-block text-xs font-semibold text-amber-700 hover:text-amber-800">
            {t('portal.home.viewRoutine')}
          </Link>
        </div>

        {/* Última medición */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Activity className="h-4 w-4 text-amber-600" />
            {t('portal.home.lastMeasurement')}
          </h2>
          {lastMeasurement ? (
            <div className="mt-3 space-y-1">
              <p className="text-lg font-semibold text-slate-900">
                {fmtMeasurement(lastMeasurement.weightKg, ' kg')}
              </p>
              <p className="text-sm text-slate-500">
                {new Date(lastMeasurement.date).toLocaleDateString(intlLocale)}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">{t('portal.home.noMeasurements')}</p>
          )}
          <Link href="/portal/progress" className="mt-4 inline-block text-xs font-semibold text-amber-700 hover:text-amber-800">
            {t('portal.home.viewProgress')}
          </Link>
        </div>
      </div>
    </>
  );
}
