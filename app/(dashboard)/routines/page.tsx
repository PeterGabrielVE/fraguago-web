'use client';
import { useEffect, useState } from 'react';
import { Copy, Dumbbell, Sparkles } from 'lucide-react';
import ResourceManager, { type SelectOption } from '@/components/ResourceManager';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const GOAL_OPTIONS = [
  { value: 'MUSCLE_GAIN', label: 'Ganancia muscular' },
  { value: 'WEIGHT_LOSS', label: 'Pérdida de peso' },
  { value: 'GENERAL_WELLNESS', label: 'Bienestar general' },
  { value: 'PERFORMANCE_REHABILITATION', label: 'Rendimiento / rehabilitación' },
];

const LEVEL_OPTIONS = [
  { value: 'BEGINNER', label: 'Principiante' },
  { value: 'INTERMEDIATE', label: 'Intermedio' },
  { value: 'ADVANCED', label: 'Avanzado' },
];

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ' +
  'focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition';

function personLabel(entity: any) {
  const firstName = entity?.user?.profile?.firstName ?? '';
  const lastName = entity?.user?.profile?.lastName ?? '';
  return `${firstName} ${lastName}`.trim();
}

function optionLabel(options: SelectOption[], value: string | undefined) {
  if (!value) return '';
  const match = options.find((o) => (typeof o === 'string' ? o : o.value) === value);
  return match ? (typeof match === 'string' ? match : match.label) : '';
}

type RoutineDraft = {
  name: string;
  goal: string;
  daysPerWeek: number;
  days: {
    day: number;
    focus: string;
    exercises: { name: string; sets: number; reps: string; restSeconds?: number; notes?: string }[];
  }[];
  notes?: string;
};

function formatDraft(draft: RoutineDraft) {
  let text = '';
  for (const day of draft.days) {
    text += `Día ${day.day} — ${day.focus}\n`;
    for (const ex of day.exercises) {
      const rest = ex.restSeconds ? `, descanso ${ex.restSeconds}s` : '';
      const notes = ex.notes ? ` (${ex.notes})` : '';
      text += `  • ${ex.name}: ${ex.sets}x${ex.reps}${rest}${notes}\n`;
    }
    text += '\n';
  }
  if (draft.notes) text += `Notas: ${draft.notes}`;
  return text.trim();
}

function GenerateRoutineButton({
  memberOptions,
  trainerOptions,
  onSaved,
}: {
  memberOptions: SelectOption[];
  trainerOptions: SelectOption[];
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({ goal: 'GENERAL_WELLNESS', level: 'BEGINNER', daysPerWeek: 3 });
  const [draft, setDraft] = useState<RoutineDraft | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  function reset() {
    setForm({ goal: 'GENERAL_WELLNESS', level: 'BEGINNER', daysPerWeek: 3 });
    setDraft(null);
    setName('');
    setDescription('');
  }

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    try {
      const res: any = await api.post('/ai/routines/generate', {
        goal: form.goal,
        level: form.level,
        daysPerWeek: Number(form.daysPerWeek),
        notes: form.notes || undefined,
        memberId: form.memberId || undefined,
      });
      const generatedDraft = res.draft as RoutineDraft;
      setDraft(generatedDraft);
      setName(generatedDraft.name || 'Rutina generada con IA');
      setDescription(formatDraft(generatedDraft));
    } catch (err: any) {
      toast.add({ title: 'No se pudo generar la rutina', description: err.message, type: 'error' });
    } finally {
      setGenerating(false);
    }
  }

  async function saveRoutine(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/routines', {
        memberId: form.memberId,
        trainerId: form.trainerId || undefined,
        name,
        description,
      });
      toast.add({ title: 'Rutina guardada', type: 'success' });
      setOpen(false);
      reset();
      onSaved();
    } catch (err: any) {
      toast.add({ title: 'No se pudo guardar la rutina', description: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100"
      >
        <Sparkles className="h-4 w-4" /> Generar con IA
      </button>

      <Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) reset(); }}>
        <DialogContent className="sm:max-w-lg">
          {!draft ? (
            <form onSubmit={generate} className="grid gap-4">
              <DialogHeader>
                <DialogTitle>Generar rutina con IA</DialogTitle>
                <DialogDescription>Se genera un borrador; el entrenador decide si lo guarda tal cual o lo edita.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Socio <span className="text-red-500">*</span></label>
                  <select required value={form.memberId ?? ''} onChange={(e) => setForm({ ...form, memberId: e.target.value })} className={inputClass}>
                    <option value="">Selecciona…</option>
                    {memberOptions.map((o) => {
                      const value = typeof o === 'string' ? o : o.value;
                      const label = typeof o === 'string' ? o : o.label;
                      return <option key={value} value={value}>{label}</option>;
                    })}
                  </select>
                  <p className="mt-1.5 text-xs text-slate-500">
                    Se usa su ficha médica y última medición registrada para adaptar la rutina (no se muestran tal cual, solo ajustan intensidad y ejercicios a evitar).
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Entrenador</label>
                  <select value={form.trainerId ?? ''} onChange={(e) => setForm({ ...form, trainerId: e.target.value })} className={inputClass}>
                    <option value="">Selecciona…</option>
                    {trainerOptions.map((o) => {
                      const value = typeof o === 'string' ? o : o.value;
                      const label = typeof o === 'string' ? o : o.label;
                      return <option key={value} value={value}>{label}</option>;
                    })}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Objetivo</label>
                  <select value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} className={inputClass}>
                    {GOAL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Nivel</label>
                  <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className={inputClass}>
                    {LEVEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Días por semana</label>
                  <input
                    type="number" min={1} max={7}
                    value={form.daysPerWeek}
                    onChange={(e) => setForm({ ...form, daysPerWeek: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Consideraciones (opcional)</label>
                <textarea
                  value={form.notes ?? ''}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Lesiones, equipamiento disponible, preferencias…"
                  className={`${inputClass} min-h-20`}
                />
              </div>
              <DialogFooter>
                <button
                  type="submit"
                  disabled={generating || !form.memberId}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition disabled:opacity-60"
                >
                  {generating ? 'Generando…' : 'Generar borrador'}
                </button>
              </DialogFooter>
            </form>
          ) : (
            <form onSubmit={saveRoutine} className="grid gap-4">
              <DialogHeader>
                <DialogTitle>Revisar borrador</DialogTitle>
                <DialogDescription>Editá lo que necesites antes de guardarlo. La IA no reemplaza tu criterio.</DialogDescription>
              </DialogHeader>
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Socio: <span className="font-medium text-slate-800">{optionLabel(memberOptions, form.memberId)}</span>
                {form.trainerId && <> · Entrenador: <span className="font-medium text-slate-800">{optionLabel(trainerOptions, form.trainerId)}</span></>}
              </p>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Nombre</label>
                <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Descripción</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`${inputClass} min-h-64 font-mono text-xs`}
                />
              </div>
              <DialogFooter>
                <button
                  type="button"
                  onClick={() => setDraft(null)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Volver
                </button>
                <button
                  type="submit"
                  disabled={saving || !form.memberId}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition disabled:opacity-60"
                >
                  {saving ? 'Guardando…' : 'Guardar rutina'}
                </button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function CopyRoutineDialog({
  row,
  open,
  onOpenChange,
  memberOptions,
  trainerOptions,
  onSaved,
}: {
  row: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberOptions: SelectOption[];
  trainerOptions: SelectOption[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!row) return;
    setForm({
      memberId: row.memberId ? String(row.memberId) : '',
      trainerId: row.trainerId ? String(row.trainerId) : '',
      name: row.name ? `${row.name} (copia)` : '',
      description: row.description ?? '',
    });
  }, [row]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/routines', {
        memberId: form.memberId,
        trainerId: form.trainerId || undefined,
        name: form.name,
        description: form.description || undefined,
      });
      toast.add({ title: 'Rutina copiada', type: 'success' });
      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      toast.add({ title: 'No se pudo copiar la rutina', description: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={save} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Copiar rutina</DialogTitle>
            <DialogDescription>Creá una copia de esta rutina para otro socio o entrenador.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Socio <span className="text-red-500">*</span></label>
              <select required value={form.memberId ?? ''} onChange={(e) => setForm({ ...form, memberId: e.target.value })} className={inputClass}>
                <option value="">Selecciona…</option>
                {memberOptions.map((o) => {
                  const value = typeof o === 'string' ? o : o.value;
                  const label = typeof o === 'string' ? o : o.label;
                  return <option key={value} value={value}>{label}</option>;
                })}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Entrenador</label>
              <select value={form.trainerId ?? ''} onChange={(e) => setForm({ ...form, trainerId: e.target.value })} className={inputClass}>
                <option value="">Selecciona…</option>
                {trainerOptions.map((o) => {
                  const value = typeof o === 'string' ? o : o.value;
                  const label = typeof o === 'string' ? o : o.label;
                  return <option key={value} value={value}>{label}</option>;
                })}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Nombre <span className="text-red-500">*</span></label>
            <input required value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Descripción</label>
            <textarea
              value={form.description ?? ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={`${inputClass} min-h-32 font-mono text-xs`}
            />
          </div>
          <DialogFooter>
            <button
              type="submit"
              disabled={saving || !form.memberId || !form.name}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition disabled:opacity-60"
            >
              {saving ? 'Copiando…' : 'Copiar rutina'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Page() {
  const [memberOptions, setMemberOptions] = useState<SelectOption[]>([]);
  const [trainerOptions, setTrainerOptions] = useState<SelectOption[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [copyRow, setCopyRow] = useState<any | null>(null);

  useEffect(() => {
    api.list('/members').then((members) => {
      setMemberOptions(members.map((m: any) => ({
        value: String(m.id),
        label: personLabel(m) || m.user?.email || m.id,
      })));
    }).catch(() => {});
    api.list('/trainers').then((trainers) => {
      setTrainerOptions(trainers.map((t: any) => ({
        value: String(t.id),
        label: personLabel(t) || t.id,
      })));
    }).catch(() => {});
  }, []);

  return (
    <>
      <ResourceManager
        key={reloadKey}
        title="Rutinas"
        subtitle="Planes de entrenamiento asignados a los socios."
        icon={Dumbbell}
        endpoint="/routines"
        formVariant="modal"
        headerActions={
          <GenerateRoutineButton
            memberOptions={memberOptions}
            trainerOptions={trainerOptions}
            onSaved={() => setReloadKey((k) => k + 1)}
          />
        }
        columns={[
          { key: 'name', label: 'Nombre' },
          { key: 'member', label: 'Socio', render: (r) => personLabel(r.member) || r.memberId },
          { key: 'trainer', label: 'Entrenador', render: (r) => personLabel(r.trainer) || '—' },
        ]}
        fields={[
          { name: 'memberId', label: 'Socio', type: 'select', required: true, options: memberOptions },
          { name: 'trainerId', label: 'Entrenador', type: 'select', options: trainerOptions },
          { name: 'name', label: 'Nombre', required: true, fullWidth: true },
          { name: 'description', label: 'Descripción', type: 'textarea' },
        ]}
        extraActions={(row) => [
          {
            label: 'Copiar',
            icon: Copy,
            silent: true,
            onClick: () => setCopyRow(row),
          },
        ]}
      />
      <CopyRoutineDialog
        row={copyRow}
        open={Boolean(copyRow)}
        onOpenChange={(nextOpen) => { if (!nextOpen) setCopyRow(null); }}
        memberOptions={memberOptions}
        trainerOptions={trainerOptions}
        onSaved={() => setReloadKey((k) => k + 1)}
      />
    </>
  );
}
