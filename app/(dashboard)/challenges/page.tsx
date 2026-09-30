'use client';
import { useRouter } from 'next/navigation';
import { ListOrdered, Power, RefreshCw, Trophy } from 'lucide-react';
import ResourceManager from '@/components/ResourceManager';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { formatPoints } from '@/lib/gamification';
import {
  METRIC_LABELS,
  METRIC_OPTIONS,
  STATUS_BADGES,
  STATUS_LABELS,
  formatRange,
  toDatetimeLocal,
  type Challenge,
} from '@/lib/challenges';
import { useT } from '@/components/I18nProvider';

const LIST = '/challenges?pageSize=100';

function defaultStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return toDatetimeLocal(d);
}

function defaultEnd() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  d.setHours(23, 59, 0, 0);
  return toDatetimeLocal(d);
}

// COM-B01/COM-F01 (staff) — gestión de retos temporales.
export default function Page() {
  const t = useT();
  const router = useRouter();

  return (
    <ResourceManager
      title={t('challenges.title')} subtitle={t('challenges.staffSubtitle')}
      icon={Trophy}
      endpoint="/challenges"
      formVariant="modal"
      filters={[
        { label: t('challenges.tabActive'), endpoint: `${LIST}&status=ACTIVE` },
        { label: t('challenges.tabUpcoming'), endpoint: `${LIST}&status=UPCOMING` },
        { label: t('challenges.tabFinished'), endpoint: `${LIST}&status=FINISHED` },
        { label: t('challenges.tabAll'), endpoint: LIST },
      ]}
      columns={[
        { key: 'name', label: t('challenges.challenge') },
        { key: 'metric', label: t('challenges.measures'), render: (r: Challenge) => t('challenges.metricGoal', { metric: METRIC_LABELS[r.metric], goal: r.goal }) },
        { key: 'startsAt', label: t('challenges.dates'), render: (r: Challenge) => formatRange(r) },
        {
          key: 'participantsCount', label: t('challenges.participants'),
          render: (r: Challenge) => `${r.participantsCount}${r.maxParticipants ? ` / ${r.maxParticipants}` : ''}`,
        },
        { key: 'pointsReward', label: t('challenges.prize'), render: (r: Challenge) => (r.pointsReward ? t('challenges.prizeValue', { points: formatPoints(r.pointsReward) }) : '—') },
        {
          key: 'status', label: t('challenges.status'),
          render: (r: Challenge) => (
            <span className="inline-flex flex-wrap gap-1">
              <Badge variant="outline" className={STATUS_BADGES[r.status]}>{STATUS_LABELS[r.status]}</Badge>
              {!r.active && <Badge variant="outline" className="border-transparent bg-red-100 text-red-700">{t('challenges.hidden')}</Badge>}
            </span>
          ),
        },
      ]}
      fields={[
        { name: 'name', label: t('challenges.name'), required: true },
        { name: 'metric', label: t('challenges.metricField'), type: 'select', required: true, options: METRIC_OPTIONS, defaultValue: 'ATTENDANCE_DAYS' },
        { name: 'goal', label: t('challenges.goal'), type: 'number', required: true },
        { name: 'pointsReward', label: t('challenges.pointsReward'), type: 'number' },
        { name: 'startsAt', label: t('challenges.start'), type: 'datetime-local', required: true, defaultValue: defaultStart },
        { name: 'endsAt', label: t('challenges.end'), type: 'datetime-local', required: true, defaultValue: defaultEnd },
        { name: 'maxParticipants', label: t('challenges.maxParticipants'), type: 'number' },
        { name: 'description', label: t('challenges.description'), type: 'textarea', fullWidth: true },
      ]}
      getEditValues={(row) => ({
        name: row.name,
        metric: row.metric,
        goal: row.goal,
        pointsReward: row.pointsReward ?? '',
        startsAt: toDatetimeLocal(row.startsAt),
        endsAt: toDatetimeLocal(row.endsAt),
        maxParticipants: row.maxParticipants ?? '',
        description: row.description ?? '',
      })}
      validate={(form) => {
        const name = String(form.name ?? '').trim();
        if (name.length < 3) return t('challenges.errName');
        const goal = Number(form.goal);
        if (!Number.isInteger(goal) || goal < 1 || goal > 1000) return t('challenges.errGoal');
        if (form.pointsReward !== '' && form.pointsReward !== undefined && (Number(form.pointsReward) < 0 || !Number.isInteger(Number(form.pointsReward)))) {
          return t('challenges.errPrize');
        }
        if (form.maxParticipants !== '' && form.maxParticipants !== undefined && !(Number(form.maxParticipants) >= 1)) {
          return t('challenges.errCapacity');
        }
        const start = new Date(form.startsAt);
        const end = new Date(form.endsAt);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return t('challenges.errDates');
        if (end <= start) return t('challenges.errEndAfterStart');
        if (end <= new Date()) return t('challenges.errEndFuture');
        if (form.metric === 'ATTENDANCE_DAYS') {
          const days = Math.ceil((end.getTime() - start.getTime()) / 86_400_000);
          if (goal > days) return t('challenges.errGoalTooLong', { goal, days });
        }
        return null;
      }}
      extraActions={(row) => [
        {
          label: t('challenges.viewLeaderboard'),
          icon: ListOrdered,
          silent: true,
          onClick: () => router.push(`/challenges/${row.id}`),
        },
        {
          label: t('challenges.recalculate'),
          icon: RefreshCw,
          silent: true,
          onClick: async () => {
            try {
              const res = await api.post(`/challenges/${row.id}/recalculate`, {});
              toast.add({
                title: t('challenges.recalculated'),
                description: t('challenges.recalculatedDesc', { participants: res.recalculated, completed: res.newlyCompleted }),
                type: 'success',
              });
            } catch (e: any) {
              toast.add({ title: t('challenges.recalculateFailed'), description: e.message, type: 'error' });
            }
          },
        },
        ...(row.status === 'FINISHED' ? [] : [{
          label: row.active ? t('challenges.hide') : t('challenges.publish'),
          icon: Power,
          confirm: true,
          confirmTitle: row.active ? t('challenges.hideTitle') : t('challenges.publishTitle'),
          confirmDescription: row.active
            ? t('challenges.hideDesc', { name: row.name })
            : t('challenges.publishDesc', { name: row.name }),
          onClick: () => api.patch(`/challenges/${row.id}`, { active: !row.active }),
        }]),
      ]}
    />
  );
}
