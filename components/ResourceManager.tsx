'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { AsyncBoundary } from '@/components/async-boundary';

export type Field = {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'select' | 'email' | 'textarea' | 'checkbox';
  options?: string[];
  required?: boolean;
};
export type Column = { key: string; label: string; render?: (row: any) => any };

export default function ResourceManager({
  title, subtitle, endpoint, columns, fields,
}: {
  title: string; subtitle?: string; endpoint: string; columns: Column[]; fields: Field[];
}) {
  const [form, setForm] = useState<Record<string, any>>({});
  const [open, setOpen] = useState(false);
  const [actionError, setActionError] = useState(''); // errores de crear/eliminar

  // carga (loading / empty / error) gestionada por el hook
  const { status, data, error, refetch } = useAsync<any[]>(
    () => api.get(endpoint),
    [endpoint],
  );

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setActionError('');
    try {
      const payload: Record<string, any> = {};
      for (const f of fields) {
        let v = form[f.name];
        if (v === '' || v === undefined) continue;
        if (f.type === 'number') v = Number(v);
        if (f.type === 'checkbox' && v === false) continue;
        payload[f.name] = v;
      }
      await api.post(endpoint, payload);
      setForm({}); setOpen(false);
      refetch();
    } catch (e: any) { setActionError(e.message); }
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar este registro?')) return;
    setActionError('');
    try { await api.del(`${endpoint}/${id}`); refetch(); }
    catch (e: any) { setActionError(e.message); }
  }

  const inputClass =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ' +
    'focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition';

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-start justify-between border-b pb-6">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="text-slate-600 mt-2">{subtitle}</p>}
        </div>
        <button
          onClick={() => setOpen(!open)}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
            open
              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              : 'bg-amber-600 text-white hover:bg-amber-700'
          }`}
        >
          {open ? 'Cancelar' : <><Plus className="h-4 w-4" /> Nuevo</>}
        </button>
      </div>

      {/* Banner solo para errores de mutación (crear / eliminar) */}
      {actionError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {actionError}
        </div>
      )}

      {/* Formulario de alta */}
      {open && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <form onSubmit={create} className="grid gap-4 md:grid-cols-2">
            {fields.map((f) => (
              <div key={f.name} className={f.type === 'textarea' ? 'md:col-span-2' : ''}>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  {f.label}{f.required && <span className="text-red-500"> *</span>}
                </label>
                {f.type === 'checkbox' ? (
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={form[f.name] ?? false}
                      onChange={(e) => setForm({ ...form, [f.name]: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                    />
                    {f.label}
                  </label>
                ) : f.type === 'select' ? (
                  <select
                    value={form[f.name] ?? ''}
                    required={f.required}
                    onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">Selecciona…</option>
                    {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : f.type === 'textarea' ? (
                  <textarea
                    required={f.required}
                    value={form[f.name] ?? ''}
                    onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                    className={`${inputClass} min-h-24`}
                  />
                ) : (
                  <input
                    type={f.type || 'text'}
                    required={f.required}
                    value={form[f.name] ?? ''}
                    onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                    className={inputClass}
                  />
                )}
              </div>
            ))}
            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabla: loading / empty / error / datos vía AsyncBoundary */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <AsyncBoundary
          status={status}
          data={data}
          error={error}
          onRetry={refetch}
          loading={
            <div className="flex items-center justify-center py-16">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
            </div>
          }
          empty={
            <div className="py-16 text-center text-slate-500">
              Aún no hay registros. Crea el primero con el botón "Nuevo".
            </div>
          }
          errorFallback={
            <div role="alert" className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <p className="text-sm text-slate-600">
                {error?.message ?? 'No se pudieron cargar los datos.'}
              </p>
              <button
                onClick={refetch}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 transition"
              >
                Reintentar
              </button>
            </div>
          }
        >
          {(items) => (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    {columns.map((c) => (
                      <th key={c.key} className="px-4 py-3 font-semibold text-slate-700">{c.label}</th>
                    ))}
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                      {columns.map((c) => (
                        <td key={c.key} className="px-4 py-3 text-slate-700">
                          {c.render ? c.render(row) : row[c.key]}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => remove(row.id)}
                          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AsyncBoundary>
      </div>
    </div>
  );
}