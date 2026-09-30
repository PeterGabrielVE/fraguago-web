'use client';
import { useEffect, useState } from 'react';
import { Award, Power, Sparkles, UserPlus } from 'lucide-react';
import ResourceManager from '@/components/ResourceManager';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import {
  BADGE_CRITERIA_LABELS,
  BADGE_ICON_OPTIONS,
  badgeIcon,
  formatPoints,
} from '@/lib/gamification';
import { useT } from '@/components/I18nProvider';
import type { Translate } from '@/lib/i18n/translate';

type BadgeRow = {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  criteria: string;
  threshold?: number | null;
  pointsReward: number;
  active: boolean;
  _count?: { memberBadges: number };
};

function ruleLabel(row: BadgeRow, t: Translate) {
  if (row.criteria === 'ATTENDANCE_COUNT') return t('gamification.badges.ruleAttendance', { count: row.threshold ?? 0 });
  if (row.criteria === 'LIFETIME_POINTS') return t('gamification.badges.rulePoints', { points: formatPoints(row.threshold ?? 0) });
  return t('gamification.badges.ruleManual');
}

function AwardBadgeDialog({ badge, onClose }: { badge: BadgeRow | null; onClose: () => void }) {
  const t = useT();
  const [members, setMembers] = useState<{ value: string; label: string }[]>([]);
  const [memberId, setMemberId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!badge) return;
    setMemberId('');
    api.list('/members').then((rows) => {
      setMembers(rows.map((m: any) => ({
        value: String(m.id),
        label: `${m.user?.profile?.firstName ?? ''} ${m.user?.profile?.lastName ?? ''}`.trim() || m.user?.email || m.id,
      })));
    }).catch(() => {});
  }, [badge]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!badge || !memberId) return;
    setSaving(true);
    try {
      await api.post(`/gamification/badges/${badge.id}/award`, { memberId });
      toast.add({ title: t('gamification.badges.awarded', { name: badge.name }), type: 'success' });
      onClose();
    } catch (err: any) {
      toast.add({ title: t('gamification.badges.awardFailed'), description: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={Boolean(badge)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{t('gamification.badges.awardTitle', { name: badge?.name })}</DialogTitle>
            <DialogDescription>
              {badge?.pointsReward
                ? t('gamification.badges.awardDescPoints', { points: formatPoints(badge.pointsReward) })
                : t('gamification.badges.awardDesc')}
            </DialogDescription>
          </DialogHeader>
          <label className="block text-sm font-medium text-slate-700">
            <span className="mb-1.5 block">{t('gamification.badges.member')} <span className="text-red-500">*</span></span>
            <select
              required
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            >
              <option value="">{t('common.select')}</option>
              {members.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </label>
          <DialogFooter>
            <button
              type="submit"
              disabled={saving || !memberId}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700 disabled:opacity-60"
            >
              {saving ? t('gamification.badges.awarding') : t('gamification.badges.award')}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Insignias del gym: automáticas (por asistencias o puntos) o manuales.
export default function Page() {
  const t = useT();
  const [reloadKey, setReloadKey] = useState(0);
  const [awardTarget, setAwardTarget] = useState<BadgeRow | null>(null);
  const [seeding, setSeeding] = useState(false);

  async function createDefaults() {
    setSeeding(true);
    try {
      await api.post('/gamification/badges/defaults', {});
      toast.add({ title: t('gamification.badges.defaultsCreated'), type: 'success' });
      setReloadKey((k) => k + 1);
    } catch (err: any) {
      toast.add({ title: t('gamification.badges.defaultsFailed'), description: err.message, type: 'error' });
    } finally {
      setSeeding(false);
    }
  }

  return (
    <>
      <ResourceManager
        key={reloadKey}
        title={t('gamification.badges.title')} subtitle={t('gamification.badges.subtitle')}
        icon={Award}
        endpoint="/gamification/badges"
        formVariant="modal"
        headerActions={
          <button
            type="button"
            onClick={createDefaults}
            disabled={seeding}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4 text-amber-600" />
            {seeding ? t('gamification.badges.creating') : t('gamification.badges.createDefaults')}
          </button>
        }
        columns={[
          {
            key: 'name', label: t('gamification.badges.badge'),
            render: (row: BadgeRow) => {
              const Icon = badgeIcon(row.icon);
              return (
                <span className="inline-flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-700"><Icon className="h-4 w-4" /></span>
                  {row.name}
                </span>
              );
            },
          },
          { key: 'criteria', label: t('gamification.badges.rule'), render: (row: BadgeRow) => ruleLabel(row, t) },
          { key: 'pointsReward', label: t('gamification.badges.bonus'), render: (row: BadgeRow) => (row.pointsReward ? t('gamification.badges.bonusValue', { points: formatPoints(row.pointsReward) }) : '—') },
          { key: '_count', label: t('gamification.badges.members'), render: (row: BadgeRow) => row._count?.memberBadges ?? 0 },
          {
            key: 'active', label: t('gamification.badges.status'),
            render: (row: BadgeRow) => (
              <Badge variant="outline" className={row.active ? 'border-transparent bg-emerald-100 text-emerald-700' : 'border-transparent bg-slate-100 text-slate-500'}>
                {row.active ? t('gamification.badges.active') : t('gamification.badges.inactive')}
              </Badge>
            ),
          },
        ]}
        fields={[
          { name: 'name', label: t('gamification.badges.name'), required: true },
          { name: 'icon', label: t('gamification.badges.icon'), type: 'select', options: BADGE_ICON_OPTIONS },
          {
            name: 'criteria', label: t('gamification.badges.unlockBy'), type: 'select', required: true,
            options: Object.entries(BADGE_CRITERIA_LABELS).map(([value, label]) => ({ value, label })),
            defaultValue: 'ATTENDANCE_COUNT',
          },
          { name: 'threshold', label: t('gamification.badges.threshold'), type: 'number' },
          { name: 'pointsReward', label: t('gamification.badges.pointsBonus'), type: 'number' },
          { name: 'description', label: t('gamification.badges.description'), type: 'textarea', fullWidth: true },
        ]}
        getEditValues={(row) => ({
          name: row.name,
          icon: row.icon ?? '',
          criteria: row.criteria,
          threshold: row.threshold ?? '',
          pointsReward: row.pointsReward ?? '',
          description: row.description ?? '',
        })}
        validate={(form) => (
          form.criteria && form.criteria !== 'MANUAL' && !(Number(form.threshold) > 0)
            ? t('gamification.badges.errThreshold')
            : null
        )}
        extraActions={(row) => [
          {
            label: t('gamification.badges.awardToMember'),
            icon: UserPlus,
            silent: true,
            onClick: () => setAwardTarget(row as BadgeRow),
          },
          {
            label: row.active ? t('gamification.badges.deactivate') : t('gamification.badges.activate'),
            icon: Power,
            confirm: true,
            confirmTitle: row.active ? t('gamification.badges.deactivateTitle') : t('gamification.badges.activateTitle'),
            confirmDescription: row.active
              ? t('gamification.badges.deactivateDesc', { name: row.name })
              : t('gamification.badges.activateDesc', { name: row.name }),
            onClick: () => api.patch(`/gamification/badges/${row.id}`, { active: !row.active }),
          },
        ]}
      />
      <AwardBadgeDialog
        badge={awardTarget}
        onClose={() => { setAwardTarget(null); setReloadKey((k) => k + 1); }}
      />
    </>
  );
}
