'use client';
import { useEffect, useState } from 'react';
import { Columns3 } from 'lucide-react';
import type { ImportPreview } from '@/lib/imports';

// MIG-B02 (UI) — el mapeo automático de columnas se puede corregir a mano.
export default function ColumnMapping({
  preview,
  busy,
  onApply,
}: {
  preview: ImportPreview;
  busy: boolean;
  onApply: (mapping: Record<string, number | null>) => void;
}) {
  const [draft, setDraft] = useState(preview.mapping);
  useEffect(() => setDraft(preview.mapping), [preview.mapping]);

  const changed = JSON.stringify(draft) !== JSON.stringify(preview.mapping);
  const used = new Map<number, string>();
  for (const [key, idx] of Object.entries(draft)) if (idx !== null) used.set(idx, key);

  return (
    <details className="group rounded-xl border border-slate-200 bg-white" open={changed || undefined}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Columns3 className="h-4 w-4 text-amber-600" />
          Mapeo de columnas
          <span className="font-normal text-slate-500">
            · {Object.values(preview.mapping).filter((v) => v !== null).length} de {preview.fields.length} campos detectados
          </span>
        </span>
        <span className="text-xs text-slate-500 group-open:hidden">Revisar / corregir</span>
      </summary>

      <div className="border-t border-slate-100 p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {preview.fields.map((field) => {
            const value = draft[field.key];
            const col = value !== null && value !== undefined ? preview.columns[value] : null;
            return (
              <label key={field.key} className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">
                  {field.label}{field.required && <span className="text-red-500"> *</span>}
                </span>
                <select
                  value={value ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, [field.key]: e.target.value === '' ? null : Number(e.target.value) }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                >
                  <option value="">— No importar —</option>
                  {preview.columns.map((c) => (
                    <option key={c.index} value={c.index} disabled={used.has(c.index) && used.get(c.index) !== field.key}>
                      {c.header}
                    </option>
                  ))}
                </select>
                {col?.samples.length ? (
                  <span className="mt-0.5 block truncate text-xs text-slate-400">Ej.: {col.samples.join(' · ')}</span>
                ) : null}
              </label>
            );
          })}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          {changed && (
            <button type="button" onClick={() => setDraft(preview.mapping)} className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
              Descartar
            </button>
          )}
          <button
            type="button"
            disabled={!changed || busy}
            onClick={() => onApply(draft)}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {busy ? 'Revalidando…' : 'Aplicar y revalidar'}
          </button>
        </div>
      </div>
    </details>
  );
}
