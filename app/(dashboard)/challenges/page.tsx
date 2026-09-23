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
  const router = useRouter();

  return (
    <ResourceManager
      title="Retos" subtitle="Desafíos temporales para la comunidad del gym."
      icon={Trophy}
      endpoint="/challenges"
      formVariant="modal"
      filters={[
        { label: 'En curso', endpoint: `${LIST}&status=ACTIVE` },
        { label: 'Próximos', endpoint: `${LIST}&status=UPCOMING` },
        { label: 'Finalizados', endpoint: `${LIST}&status=FINISHED` },
        { label: 'Todos', endpoint: LIST },
      ]}
      columns={[
        { key: 'name', label: 'Reto' },
        { key: 'metric', label: 'Mide', render: (r: Challenge) => `${METRIC_LABELS[r.metric]} · meta ${r.goal}` },
        { key: 'startsAt', label: 'Fechas', render: (r: Challenge) => formatRange(r) },
        {
          key: 'participantsCount', label: 'Participantes',
          render: (r: Challenge) => `${r.participantsCount}${r.maxParticipants ? ` / ${r.maxParticipants}` : ''}`,
        },
        { key: 'pointsReward', label: 'Premio', render: (r: Challenge) => (r.pointsReward ? `${formatPoints(r.pointsReward)} pts` : '—') },
        {
          key: 'status', label: 'Estado',
          render: (r: Challenge) => (
            <span className="inline-flex flex-wrap gap-1">
              <Badge variant="outline" className={STATUS_BADGES[r.status]}>{STATUS_LABELS[r.status]}</Badge>
              {!r.active && <Badge variant="outline" className="border-transparent bg-red-100 text-red-700">Oculto</Badge>}
            </span>
          ),
        },
      ]}
      fields={[
        { name: 'name', label: 'Nombre', required: true },
        { name: 'metric', label: 'Qué se mide', type: 'select', required: true, options: METRIC_OPTIONS, defaultValue: 'ATTENDANCE_DAYS' },
        { name: 'goal', label: 'Meta', type: 'number', required: true },
        { name: 'pointsReward', label: 'Premio en puntos', type: 'number' },
        { name: 'startsAt', label: 'Inicio', type: 'datetime-local', required: true, defaultValue: defaultStart },
        { name: 'endsAt', label: 'Fin', type: 'datetime-local', required: true, defaultValue: defaultEnd },
        { name: 'maxParticipants', label: 'Cupo (vacío = sin límite)', type: 'number' },
        { name: 'description', label: 'Descripción', type: 'textarea', fullWidth: true },
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
        if (name.length < 3) return 'El nombre debe tener al menos 3 caracteres.';
        const goal = Number(form.goal);
        if (!Number.isInteger(goal) || goal < 1 || goal > 1000) return 'La meta debe ser un entero entre 1 y 1000.';
        if (form.pointsReward !== '' && form.pointsReward !== undefined && (Number(form.pointsReward) < 0 || !Number.isInteger(Number(form.pointsReward)))) {
          return 'El premio debe ser un entero mayor o igual a 0.';
        }
        if (form.maxParticipants !== '' && form.maxParticipants !== undefined && !(Number(form.maxParticipants) >= 1)) {
          return 'El cupo debe ser al menos 1.';
        }
        const start = new Date(form.startsAt);
        const end = new Date(form.endsAt);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 'Revisa las fechas de inicio y fin.';
        if (end <= start) return 'La fecha de fin debe ser posterior a la de inicio.';
        if (end <= new Date()) return 'La fecha de fin debe ser futura.';
        if (form.metric === 'ATTENDANCE_DAYS') {
          const days = Math.ceil((end.getTime() - start.getTime()) / 86_400_000);
          if (goal > days) return `La meta (${goal} días) supera la duración del reto (${days} días).`;
        }
        return null;
      }}
      extraActions={(row) => [
        {
          label: 'Ver clasificación',
          icon: ListOrdered,
          silent: true,
          onClick: () => router.push(`/challenges/${row.id}`),
        },
        {
          label: 'Recalcular progreso',
          icon: RefreshCw,
          silent: true,
          onClick: async () => {
            try {
              const res = await api.post(`/challenges/${row.id}/recalculate`, {});
              toast.add({
                title: 'Progreso recalculado',
                description: `${res.recalculated} participantes · ${res.newlyCompleted} completaron`,
                type: 'success',
              });
            } catch (e: any) {
              toast.add({ title: 'No se pudo recalcular', description: e.message, type: 'error' });
            }
          },
        },
        ...(row.status === 'FINISHED' ? [] : [{
          label: row.active ? 'Ocultar' : 'Publicar',
          icon: Power,
          confirm: true,
          confirmTitle: row.active ? 'Ocultar reto' : 'Publicar reto',
          confirmDescription: row.active
            ? `"${row.name}" dejará de verse en el portal y su progreso dejará de actualizarse.`
            : `"${row.name}" volverá a verse en el portal de los socios.`,
          onClick: () => api.patch(`/challenges/${row.id}`, { active: !row.active }),
        }]),
      ]}
    />
  );
}
