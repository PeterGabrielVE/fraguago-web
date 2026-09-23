'use client';
import { useMemo, useState } from 'react';
import { AlertTriangle, CircleX, Link2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  ROW_STATUS_BADGES,
  ROW_STATUS_LABELS,
  type AttendanceRowData,
  type ImportPreview,
  type MemberRowData,
  type PreviewRow,
  type RowStatus,
} from '@/lib/imports';

const PAGE_SIZE = 50;
const FILTERS: (RowStatus | 'ALL' | 'WARN')[] = ['ALL', 'NEW', 'EXISTING', 'ERROR', 'WARN', 'DUPLICATE', 'IGNORED'];
const FILTER_LABELS: Record<string, string> = { ALL: 'Todas', WARN: 'Con advertencias', ...ROW_STATUS_LABELS };

const fmtDate = (ymd?: string) => (ymd ? ymd.split('-').reverse().join('/') : '—');

function Details({ row, type }: { row: PreviewRow; type: ImportPreview['type'] }) {
  if (!row.data) return <span className="text-slate-400">—</span>;
  if (type === 'ATTENDANCE') {
    const d = row.data as AttendanceRowData;
    return <span>{d.dates.length} día(s){d.dates.length ? `: ${d.dates.map((x) => Number(x.slice(8))).join(', ')}` : ''}</span>;
  }
  const d = row.data as MemberRowData;
  const parts = [
    d.planName,
    d.paymentDate && `${fmtDate(d.paymentDate)}${d.dueDate ? ` → ${fmtDate(d.dueDate)}` : ''}`,
    d.amount !== undefined && `$${d.amount}`,
    d.paymentStatus === 'PENDING' && 'Pendiente',
  ].filter(Boolean);
  return <span>{parts.join(' · ') || '—'}</span>;
}

function nameOf(row: PreviewRow, type: ImportPreview['type']) {
  if (!row.data) return '—';
  if (type === 'ATTENDANCE') return (row.data as AttendanceRowData).fullName ?? '—';
  const d = row.data as MemberRowData;
  return `${d.firstName} ${d.lastName}`.trim();
}

// Vista previa fila por fila, con filtros por estado y paginación local.
export default function ImportPreviewTable({ preview }: { preview: ImportPreview }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>(preview.summary.ERROR ? 'ERROR' : 'ALL');
  const [page, setPage] = useState(1);

  const counts = useMemo(() => ({
    ...preview.summary,
    ALL: preview.rows.length,
    WARN: preview.rows.filter((r) => r.warnings.length).length,
  }) as Record<string, number>, [preview]);

  const rows = useMemo(() => preview.rows.filter((r) =>
    filter === 'ALL' ? true : filter === 'WARN' ? r.warnings.length > 0 : r.status === filter,
  ), [preview.rows, filter]);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const visible = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const externalId = (r: PreviewRow) => (r.data as { externalId?: string } | null)?.externalId ?? '';

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div role="tablist" aria-label="Filtrar filas" className="flex flex-wrap gap-1 border-b border-slate-100 p-2">
        {FILTERS.filter((f) => f === 'ALL' || counts[f]).map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            onClick={() => { setFilter(f); setPage(1); }}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition',
              filter === f ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100',
            )}
          >
            {FILTER_LABELS[f]} ({counts[f] ?? 0})
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Fila</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Socio</th>
              <th className="px-3 py-2">{preview.type === 'ATTENDANCE' ? 'Asistencias' : 'Pago'}</th>
              <th className="px-3 py-2">Observaciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((r) => (
              <tr key={r.row} className={r.status === 'ERROR' ? 'bg-red-50/40' : undefined}>
                <td className="px-3 py-2 text-slate-500">{r.row}</td>
                <td className="px-3 py-2"><Badge variant="outline" className={ROW_STATUS_BADGES[r.status]}>{ROW_STATUS_LABELS[r.status]}</Badge></td>
                <td className="px-3 py-2 font-mono text-xs text-slate-600">{externalId(r)}</td>
                <td className="px-3 py-2">
                  <span className="font-medium text-slate-900">{nameOf(r, preview.type)}</span>
                  {r.match && (
                    <span className="mt-0.5 flex items-center gap-1 text-xs text-sky-700">
                      <Link2 className="h-3 w-3" />{r.match.name} (por {r.match.by})
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-slate-600"><Details row={r} type={preview.type} /></td>
                <td className="max-w-md px-3 py-2">
                  <ul className="space-y-0.5 text-xs">
                    {r.errors.map((m, i) => <li key={`e${i}`} className="flex gap-1 text-red-700"><CircleX className="mt-0.5 h-3 w-3 shrink-0" />{m}</li>)}
                    {r.warnings.map((m, i) => <li key={`w${i}`} className="flex gap-1 text-amber-700"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />{m}</li>)}
                  </ul>
                </td>
              </tr>
            ))}
            {!visible.length && (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">No hay filas con este filtro.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-xs text-slate-600">
          <span>Página {page} de {totalPages} · {rows.length} filas</span>
          <div className="flex gap-1">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="rounded border border-slate-200 px-2 py-1 disabled:opacity-40">Anterior</button>
            <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="rounded border border-slate-200 px-2 py-1 disabled:opacity-40">Siguiente</button>
          </div>
        </div>
      )}
    </div>
  );
}
