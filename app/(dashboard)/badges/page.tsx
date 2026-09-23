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

function ruleLabel(row: BadgeRow) {
  if (row.criteria === 'ATTENDANCE_COUNT') return `${row.threshold} asistencias`;
  if (row.criteria === 'LIFETIME_POINTS') return `${formatPoints(row.threshold ?? 0)} pts acumulados`;
  return 'Manual';
}

function AwardBadgeDialog({ badge, onClose }: { badge: BadgeRow | null; onClose: () => void }) {
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
      toast.add({ title: `Insignia "${badge.name}" otorgada`, type: 'success' });
      onClose();
    } catch (err: any) {
      toast.add({ title: 'No se pudo otorgar la insignia', description: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={Boolean(badge)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Otorgar “{badge?.name}”</DialogTitle>
            <DialogDescription>
              El socio verá el aviso de insignia desbloqueada en su portal
              {badge?.pointsReward ? ` y recibirá ${formatPoints(badge.pointsReward)} puntos` : ''}.
            </DialogDescription>
          </DialogHeader>
          <label className="block text-sm font-medium text-slate-700">
            <span className="mb-1.5 block">Socio <span className="text-red-500">*</span></span>
            <select
              required
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            >
              <option value="">Selecciona…</option>
              {members.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </label>
          <DialogFooter>
            <button
              type="submit"
              disabled={saving || !memberId}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700 disabled:opacity-60"
            >
              {saving ? 'Otorgando…' : 'Otorgar'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Insignias del gym: automáticas (por asistencias o puntos) o manuales.
export default function Page() {
  const [reloadKey, setReloadKey] = useState(0);
  const [awardTarget, setAwardTarget] = useState<BadgeRow | null>(null);
  const [seeding, setSeeding] = useState(false);

  async function createDefaults() {
    setSeeding(true);
    try {
      await api.post('/gamification/badges/defaults', {});
      toast.add({ title: 'Insignias sugeridas creadas', type: 'success' });
      setReloadKey((k) => k + 1);
    } catch (err: any) {
      toast.add({ title: 'No se pudieron crear', description: err.message, type: 'error' });
    } finally {
      setSeeding(false);
    }
  }

  return (
    <>
      <ResourceManager
        key={reloadKey}
        title="Insignias" subtitle="Logros que los socios desbloquean al entrenar."
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
            {seeding ? 'Creando…' : 'Crear sugeridas'}
          </button>
        }
        columns={[
          {
            key: 'name', label: 'Insignia',
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
          { key: 'criteria', label: 'Regla', render: (row: BadgeRow) => ruleLabel(row) },
          { key: 'pointsReward', label: 'Bono', render: (row: BadgeRow) => (row.pointsReward ? `+${formatPoints(row.pointsReward)} pts` : '—') },
          { key: '_count', label: 'Socios', render: (row: BadgeRow) => row._count?.memberBadges ?? 0 },
          {
            key: 'active', label: 'Estado',
            render: (row: BadgeRow) => (
              <Badge variant="outline" className={row.active ? 'border-transparent bg-emerald-100 text-emerald-700' : 'border-transparent bg-slate-100 text-slate-500'}>
                {row.active ? 'Activa' : 'Inactiva'}
              </Badge>
            ),
          },
        ]}
        fields={[
          { name: 'name', label: 'Nombre', required: true },
          { name: 'icon', label: 'Ícono', type: 'select', options: BADGE_ICON_OPTIONS },
          {
            name: 'criteria', label: 'Se desbloquea por', type: 'select', required: true,
            options: Object.entries(BADGE_CRITERIA_LABELS).map(([value, label]) => ({ value, label })),
            defaultValue: 'ATTENDANCE_COUNT',
          },
          { name: 'threshold', label: 'Umbral (asistencias o puntos)', type: 'number' },
          { name: 'pointsReward', label: 'Bono en puntos', type: 'number' },
          { name: 'description', label: 'Descripción', type: 'textarea', fullWidth: true },
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
            ? 'Las insignias automáticas necesitan un umbral mayor a 0.'
            : null
        )}
        extraActions={(row) => [
          {
            label: 'Otorgar a socio',
            icon: UserPlus,
            silent: true,
            onClick: () => setAwardTarget(row as BadgeRow),
          },
          {
            label: row.active ? 'Desactivar' : 'Activar',
            icon: Power,
            confirm: true,
            confirmTitle: row.active ? 'Desactivar insignia' : 'Activar insignia',
            confirmDescription: row.active
              ? `"${row.name}" dejará de desbloquearse automáticamente. Quienes ya la tienen la conservan.`
              : `"${row.name}" volverá a desbloquearse automáticamente.`,
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
