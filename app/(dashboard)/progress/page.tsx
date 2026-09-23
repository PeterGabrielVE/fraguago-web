'use client';
import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertCircle, Pencil, Plus, Ruler, Save, Trash2, TrendingUp, X } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Area, AreaChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ' +
  'focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition';

type Measurement = {
  id: string;
  memberId: string;
  date: string;
  weightKg?: number | string | null;
  heightCm?: number | string | null;
  bodyFat?: number | string | null;
  chestCm?: number | string | null;
  waistCm?: number | string | null;
  armCm?: number | string | null;
  notes?: string | null;
};

function toNum(v: any): number | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

function fmt(v: any, suffix = ''): string {
  const n = toNum(v);
  return n === undefined ? '—' : `${n}${suffix}`;
}

function shortDate(iso: string) {
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(new Date(iso));
}

function fullDate(iso: string) {
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
}

function todayISODate() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function personLabel(m: any) {
  const firstName = m?.user?.profile?.firstName ?? '';
  const lastName = m?.user?.profile?.lastName ?? '';
  return `${firstName} ${lastName}`.trim();
}

const weightChartConfig = {
  weightKg: { label: 'Peso (kg)', theme: { light: '#d97706', dark: '#f59e0b' } },
} satisfies ChartConfig;

const bodyFatChartConfig = {
  bodyFat: { label: '% Grasa corporal', theme: { light: '#2a78d6', dark: '#3987e5' } },
} satisfies ChartConfig;

const bodyMeasurementsChartConfig = {
  chestCm: { label: 'Pecho (cm)', theme: { light: '#2a78d6', dark: '#3987e5' } },
  waistCm: { label: 'Cintura (cm)', theme: { light: '#eb6834', dark: '#d95926' } },
  armCm: { label: 'Brazo (cm)', theme: { light: '#1baf7a', dark: '#199e70' } },
} satisfies ChartConfig;

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-slate-300 px-4 text-center text-sm text-slate-500">
      {label}
    </div>
  );
}

function ChartCard({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Icon className="h-4 w-4 text-amber-600" />
        {title}
      </h3>
      {children}
    </div>
  );
}

function WeightChart({ data }: { data: { date: string; weightKg: number }[] }) {
  if (data.length < 2) return <EmptyChart label="Aún no hay suficientes mediciones de peso para graficar (mínimo 2)." />;
  return (
    <ChartContainer config={weightChartConfig} className="aspect-auto h-56 w-full">
      <AreaChart data={data} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={shortDate} minTickGap={20} />
        <YAxis tickLine={false} axisLine={false} width={32} domain={['auto', 'auto']} />
        <ChartTooltip content={<ChartTooltipContent indicator="line" labelFormatter={(v) => fullDate(String(v))} />} />
        <Area
          dataKey="weightKg"
          type="monotone"
          stroke="var(--color-weightKg)"
          fill="var(--color-weightKg)"
          fillOpacity={0.1}
          strokeWidth={2}
          dot={{ r: 3, fill: 'var(--color-weightKg)', stroke: 'var(--color-background)', strokeWidth: 2 }}
        />
      </AreaChart>
    </ChartContainer>
  );
}

function BodyFatChart({ data }: { data: { date: string; bodyFat: number }[] }) {
  if (data.length < 2) return <EmptyChart label="Aún no hay suficientes mediciones de grasa corporal para graficar (mínimo 2)." />;
  return (
    <ChartContainer config={bodyFatChartConfig} className="aspect-auto h-56 w-full">
      <AreaChart data={data} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={shortDate} minTickGap={20} />
        <YAxis tickLine={false} axisLine={false} width={32} domain={['auto', 'auto']} tickFormatter={(v: number) => `${v}%`} />
        <ChartTooltip content={<ChartTooltipContent indicator="line" labelFormatter={(v) => fullDate(String(v))} />} />
        <Area
          dataKey="bodyFat"
          type="monotone"
          stroke="var(--color-bodyFat)"
          fill="var(--color-bodyFat)"
          fillOpacity={0.1}
          strokeWidth={2}
          dot={{ r: 3, fill: 'var(--color-bodyFat)', stroke: 'var(--color-background)', strokeWidth: 2 }}
        />
      </AreaChart>
    </ChartContainer>
  );
}

function BodyMeasurementsChart({ data }: { data: { date: string; chestCm?: number; waistCm?: number; armCm?: number }[] }) {
  if (data.length < 2) return <EmptyChart label="Aún no hay suficientes medidas corporales para graficar (mínimo 2)." />;
  return (
    <ChartContainer config={bodyMeasurementsChartConfig} className="aspect-auto h-56 w-full">
      <LineChart data={data} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={shortDate} minTickGap={20} />
        <YAxis tickLine={false} axisLine={false} width={32} domain={['auto', 'auto']} />
        <ChartTooltip content={<ChartTooltipContent indicator="line" labelFormatter={(v) => fullDate(String(v))} />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Line dataKey="chestCm" type="monotone" stroke="var(--color-chestCm)" strokeWidth={2} dot={false} connectNulls />
        <Line dataKey="waistCm" type="monotone" stroke="var(--color-waistCm)" strokeWidth={2} dot={false} connectNulls />
        <Line dataKey="armCm" type="monotone" stroke="var(--color-armCm)" strokeWidth={2} dot={false} connectNulls />
      </LineChart>
    </ChartContainer>
  );
}

export default function ProgressPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Measurement | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.list('/members').then(setMembers).catch((e) => setError(e.message));
  }, []);

  async function loadMeasurements(memberId: string) {
    if (!memberId) { setMeasurements([]); return; }
    setLoadingList(true);
    setError('');
    try {
      setMeasurements(await api.list(`/members/${memberId}/measurements?pageSize=100`));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    setFormOpen(false);
    setEditingId(null);
    loadMeasurements(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  function startCreate() {
    setEditingId(null);
    setForm({ date: todayISODate() });
    setFormOpen(true);
  }

  function startEdit(m: Measurement) {
    setEditingId(m.id);
    setForm({
      date: m.date ? m.date.slice(0, 10) : todayISODate(),
      weightKg: m.weightKg ?? '',
      heightCm: m.heightCm ?? '',
      bodyFat: m.bodyFat ?? '',
      chestCm: m.chestCm ?? '',
      waistCm: m.waistCm ?? '',
      armCm: m.armCm ?? '',
      notes: m.notes ?? '',
    });
    setFormOpen(true);
  }

  function cancelForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm({});
  }

  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      const payload = {
        date: form.date ? new Date(form.date).toISOString() : undefined,
        weightKg: toNum(form.weightKg),
        heightCm: toNum(form.heightCm),
        bodyFat: toNum(form.bodyFat),
        chestCm: toNum(form.chestCm),
        waistCm: toNum(form.waistCm),
        armCm: toNum(form.armCm),
        notes: form.notes || undefined,
      };
      if (editingId) {
        await api.patch(`/measurements/${editingId}`, payload);
        toast.add({ title: 'Medición actualizada', type: 'success' });
      } else {
        await api.post(`/members/${selected}/measurements`, payload);
        toast.add({ title: 'Medición registrada', type: 'success' });
      }
      cancelForm();
      await loadMeasurements(selected);
    } catch (e: any) {
      setError(e.message);
      toast.add({ title: 'No se pudo guardar la medición', description: e.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.del(`/measurements/${deleteTarget.id}`);
      toast.add({ title: 'Medición eliminada', type: 'success' });
      setDeleteTarget(null);
      await loadMeasurements(selected);
    } catch (e: any) {
      toast.add({ title: 'No se pudo eliminar', description: e.message, type: 'error' });
    } finally {
      setDeleting(false);
    }
  }

  const chronological = useMemo(() => [...measurements].reverse(), [measurements]);
  const weightSeries = useMemo(
    () => chronological.filter((m) => toNum(m.weightKg) !== undefined).map((m) => ({ date: m.date, weightKg: toNum(m.weightKg)! })),
    [chronological],
  );
  const bodyFatSeries = useMemo(
    () => chronological.filter((m) => toNum(m.bodyFat) !== undefined).map((m) => ({ date: m.date, bodyFat: toNum(m.bodyFat)! })),
    [chronological],
  );
  const bodyMeasurementsSeries = useMemo(
    () => chronological
      .filter((m) => toNum(m.chestCm) !== undefined || toNum(m.waistCm) !== undefined || toNum(m.armCm) !== undefined)
      .map((m) => ({ date: m.date, chestCm: toNum(m.chestCm), waistCm: toNum(m.waistCm), armCm: toNum(m.armCm) })),
    [chronological],
  );

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-4 p-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-sm">
            <Activity className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Progreso</h1>
            <p className="mt-1 text-slate-600">Historial de peso, grasa corporal y medidas de los socios.</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Selector de socio */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <select
          className={`${inputClass} sm:max-w-sm`}
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">Selecciona un socio…</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{personLabel(m) || m.id}</option>
          ))}
        </select>
      </div>

      {selected && (
        <>
          {loadingList ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
            </div>
          ) : (
            <>
              {/* Gráficos */}
              <div className="grid gap-6 lg:grid-cols-3">
                <ChartCard icon={TrendingUp} title="Peso">
                  <WeightChart data={weightSeries} />
                </ChartCard>
                <ChartCard icon={Activity} title="Grasa corporal">
                  <BodyFatChart data={bodyFatSeries} />
                </ChartCard>
                <ChartCard icon={Ruler} title="Medidas corporales">
                  <BodyMeasurementsChart data={bodyMeasurementsSeries} />
                </ChartCard>
              </div>

              {/* Historial + alta/edición */}
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                  <h2 className="text-lg font-semibold text-slate-900">Historial de mediciones</h2>
                  {!formOpen && (
                    <button
                      type="button"
                      onClick={startCreate}
                      className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700"
                    >
                      <Plus className="h-4 w-4" /> Registrar medición
                    </button>
                  )}
                </div>

                {formOpen && (
                  <form onSubmit={save} className="space-y-4 border-b border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-900">{editingId ? 'Editar medición' : 'Nueva medición'}</h3>
                      <button type="button" onClick={cancelForm} aria-label="Cancelar" className="text-slate-400 hover:text-slate-600">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-600">Fecha</label>
                        <input type="date" value={form.date || ''} onChange={set('date')} className={`${inputClass} bg-white`} />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-600">Peso (kg)</label>
                        <input type="number" step="0.01" min="0" value={form.weightKg ?? ''} onChange={set('weightKg')} className={`${inputClass} bg-white`} />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-600">Estatura (cm)</label>
                        <input type="number" step="0.01" min="0" value={form.heightCm ?? ''} onChange={set('heightCm')} className={`${inputClass} bg-white`} />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-600">% Grasa corporal</label>
                        <input type="number" step="0.01" min="0" value={form.bodyFat ?? ''} onChange={set('bodyFat')} className={`${inputClass} bg-white`} />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-600">Pecho (cm)</label>
                        <input type="number" step="0.01" min="0" value={form.chestCm ?? ''} onChange={set('chestCm')} className={`${inputClass} bg-white`} />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-600">Cintura (cm)</label>
                        <input type="number" step="0.01" min="0" value={form.waistCm ?? ''} onChange={set('waistCm')} className={`${inputClass} bg-white`} />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-600">Brazo (cm)</label>
                        <input type="number" step="0.01" min="0" value={form.armCm ?? ''} onChange={set('armCm')} className={`${inputClass} bg-white`} />
                      </div>
                      <div className="sm:col-span-3 lg:col-span-4">
                        <label className="mb-1.5 block text-xs font-medium text-slate-600">Notas</label>
                        <input value={form.notes ?? ''} onChange={set('notes')} className={`${inputClass} bg-white`} />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />{saving ? 'Guardando…' : 'Guardar'}
                    </button>
                  </form>
                )}

                {measurements.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-16 text-center">
                    <Activity className="h-8 w-8 text-slate-300" />
                    <p className="text-sm text-slate-500">Este socio todavía no tiene mediciones registradas.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-left">
                          <th className="px-4 py-3 font-semibold text-slate-700">Fecha</th>
                          <th className="px-4 py-3 font-semibold text-slate-700">Peso</th>
                          <th className="px-4 py-3 font-semibold text-slate-700">Estatura</th>
                          <th className="px-4 py-3 font-semibold text-slate-700">% Grasa</th>
                          <th className="px-4 py-3 font-semibold text-slate-700">Pecho</th>
                          <th className="px-4 py-3 font-semibold text-slate-700">Cintura</th>
                          <th className="px-4 py-3 font-semibold text-slate-700">Brazo</th>
                          <th className="px-4 py-3 font-semibold text-slate-700">Notas</th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {measurements.map((m) => (
                          <tr key={m.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                            <td className="px-4 py-3 text-slate-600">{fullDate(m.date)}</td>
                            <td className="px-4 py-3 text-slate-700">{fmt(m.weightKg, ' kg')}</td>
                            <td className="px-4 py-3 text-slate-700">{fmt(m.heightCm, ' cm')}</td>
                            <td className="px-4 py-3 text-slate-700">{fmt(m.bodyFat, '%')}</td>
                            <td className="px-4 py-3 text-slate-700">{fmt(m.chestCm, ' cm')}</td>
                            <td className="px-4 py-3 text-slate-700">{fmt(m.waistCm, ' cm')}</td>
                            <td className="px-4 py-3 text-slate-700">{fmt(m.armCm, ' cm')}</td>
                            <td className="max-w-40 truncate px-4 py-3 text-slate-500">{m.notes || '—'}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => startEdit(m)}
                                  aria-label="Editar medición"
                                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteTarget(m)}
                                  aria-label="Eliminar medición"
                                  className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar medición</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que deseas eliminar la medición del {deleteTarget && fullDate(deleteTarget.date)}? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Eliminando…' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
