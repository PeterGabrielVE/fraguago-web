'use client';
import { useEffect, useState } from 'react';
import { AlertCircle, Save, Stethoscope } from 'lucide-react';
import { api } from '@/lib/api';

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ' +
  'focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition';

export default function HealthPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [health, setHealth] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.list('/members')
      .then(setMembers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function loadHealth(memberId: string) {
    setError('');
    if (!memberId) { setHealth(null); setForm({}); setOpen(false); return; }
    try {
      const response = await api.get(`/health-profiles?memberId=${memberId}`);
      const data = Array.isArray(response)
        ? response[0] ?? null
        : (response && typeof response === 'object' && 'data' in response && Array.isArray((response as any).data)
          ? (response as any).data[0] ?? null
          : (response && typeof response === 'object' && 'data' in response && (response as any).data && typeof (response as any).data === 'object'
            ? (response as any).data
            : response ?? null));
      setHealth(data || null);
      setForm(data ? { ...data } : {});
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      const payload = {
        hypertension: form.hypertension || false,
        diabetes: form.diabetes || false,
        heartProblems: form.heartProblems || false,
        asthma: form.asthma || false,
        otherConditions: form.otherConditions || undefined,
        hasInjury: form.hasInjury || false,
        injuryDescription: form.hasInjury ? (form.injuryDescription || undefined) : undefined,
        takesMedication: form.takesMedication || false,
        medicationDescription: form.takesMedication ? (form.medicationDescription || undefined) : undefined,
      };
      await api.patch(`/health-profiles?memberId=${selected}`, payload);
      setOpen(false);
      await loadHealth(selected);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const set = (k: string) => (e: any) =>
    setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-sm">
              <Stethoscope className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Ficha Médica</h1>
              <p className="mt-1 text-slate-600">Datos de salud y condiciones médicas de los socios.</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
        </div>
      ) : (
        <>
          {/* Selector de socio */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                className={`${inputClass} sm:max-w-sm`}
                value={selected}
                onChange={(e) => { setSelected(e.target.value); loadHealth(e.target.value); }}
              >
                <option value="">Selecciona un socio…</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.user?.profile?.firstName} {m.user?.profile?.lastName}
                  </option>
                ))}
              </select>
              {selected && (
                <button
                  type="button"
                  onClick={() => setOpen(!open)}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${open
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    : 'bg-amber-600 text-white hover:bg-amber-700'
                    }`}
                >
                  {open ? 'Cancelar' : (health ? 'Editar' : 'Crear ficha')}
                </button>
              )}
            </div>
          </div>

          {selected && !health && !open && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
              Este socio aún no tiene ficha médica registrada.
            </div>
          )}

          {selected && health && !open && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-lg font-semibold text-slate-900">Información actual</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <Stat label="Hipertensión" on={health.hypertension} />
                <Stat label="Diabetes" on={health.diabetes} />
                <Stat label="Problemas cardiacos" on={health.heartProblems} />
                <Stat label="Asma" on={health.asthma} />
              </div>
              {(health.otherConditions || health.hasInjury || health.takesMedication) && (
                <div className="mt-4 space-y-1.5 text-sm text-slate-700">
                  {health.otherConditions && <p><span className="font-medium">Otras condiciones:</span> {health.otherConditions}</p>}
                  {health.hasInjury && <p><span className="font-medium">Lesión / limitación:</span> {health.injuryDescription || 'Sí'}</p>}
                  {health.takesMedication && <p><span className="font-medium">Medicación continua:</span> {health.medicationDescription || 'Sí'}</p>}
                </div>
              )}
            </div>
          )}

          {open && selected && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-lg font-semibold text-slate-900">{health ? 'Editar ficha médica' : 'Nueva ficha médica'}</h2>
              <form onSubmit={save} className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Check label="Hipertensión" checked={form.hypertension} onChange={set('hypertension')} />
                  <Check label="Diabetes" checked={form.diabetes} onChange={set('diabetes')} />
                  <Check label="Problemas cardiacos" checked={form.heartProblems} onChange={set('heartProblems')} />
                  <Check label="Asma" checked={form.asthma} onChange={set('asthma')} />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Otras condiciones</label>
                  <textarea
                    className={`${inputClass} min-h-20`}
                    value={form.otherConditions || ''}
                    onChange={set('otherConditions')}
                    placeholder="Describe otras condiciones si existen…"
                  />
                </div>

                <hr className="border-slate-200" />

                <Check label="Tiene lesión o limitación" checked={form.hasInjury} onChange={set('hasInjury')} />
                {form.hasInjury && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Descripción de la lesión</label>
                    <textarea className={`${inputClass} min-h-20`} value={form.injuryDescription || ''} onChange={set('injuryDescription')} />
                  </div>
                )}

                <Check label="Toma medicación de uso continuo" checked={form.takesMedication} onChange={set('takesMedication')} />
                {form.takesMedication && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Descripción de la medicación</label>
                    <textarea className={`${inputClass} min-h-20`} value={form.medicationDescription || ''} onChange={set('medicationDescription')} />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />{saving ? 'Guardando…' : 'Guardar'}
                </button>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (e: any) => void }) {
  return (
    <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-700">
      <input type="checkbox" checked={!!checked} onChange={onChange} className="h-4 w-4 accent-amber-600" />
      {label}
    </label>
  );
}

function Stat({ label, on }: { label: string; on: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-lg border px-3 py-3 text-sm ${on ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600'}`}>
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${on ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
        {on ? '✓' : '–'}
      </span>
      {label}
    </div>
  );
}
