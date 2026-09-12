'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import {
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  MoreVertical,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
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
  const [query, setQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [menuId, setMenuId] = useState<string | null>(null);

  // carga (loading / empty / error) gestionada por el hook
  const { status, data, error, refetch } = useAsync<any[]>(
    () => api.get(endpoint).then((res) =>
      Array.isArray(res) ? res : (res?.data ?? [])
    ),
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
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${open
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
            <ResourceTable
              items={items}
              columns={columns}
              query={query}
              page={page}
              pageSize={pageSize}
              selectedIds={selectedIds}
              menuId={menuId}
              onQueryChange={(value) => { setQuery(value); setPage(1); }}
              onPageSizeChange={(value) => { setPageSize(value); setPage(1); }}
              onPageChange={setPage}
              onMenuChange={setMenuId}
              onSelectionChange={setSelectedIds}
              onDelete={remove}
              onExport={() => exportCsv(items, columns, title)}
            />
          )}
        </AsyncBoundary>
      </div>
    </div>
  );
}

function ResourceTable({
  items,
  columns,
  query,
  page,
  pageSize,
  selectedIds,
  menuId,
  onQueryChange,
  onPageSizeChange,
  onPageChange,
  onMenuChange,
  onSelectionChange,
  onDelete,
  onExport,
}: {
  items: any[];
  columns: Column[];
  query: string;
  page: number;
  pageSize: number;
  selectedIds: string[];
  menuId: string | null;
  onQueryChange: (value: string) => void;
  onPageSizeChange: (value: number) => void;
  onPageChange: (value: number) => void;
  onMenuChange: (value: string | null) => void;
  onSelectionChange: (value: string[]) => void;
  onDelete: (id: string) => void;
  onExport: () => void;
}) {
  const normalizedQuery = query.trim().toLowerCase();
  const filteredItems = normalizedQuery
    ? items.filter((row) => columns.some((column) => String(column.render ? column.render(row) : row[column.key] ?? '').toLowerCase().includes(normalizedQuery)))
    : items;
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const visibleIds = visibleItems.map((row) => String(row.id));
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const firstItem = filteredItems.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, filteredItems.length);

  function toggleSelection(id: string) {
    onSelectionChange(selectedIds.includes(id) ? selectedIds.filter((selectedId) => selectedId !== id) : [...selectedIds, id]);
  }

  function toggleVisibleSelection() {
    onSelectionChange(allVisibleSelected
      ? selectedIds.filter((id) => !visibleIds.includes(id))
      : [...new Set([...selectedIds, ...visibleIds])]);
  }

  return (
    <div>
      <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Mostrar</span>
          <label className="relative">
            <select
              value={pageSize}
              aria-label="Cantidad de registros por página"
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="h-10 appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-9 text-sm text-slate-700 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            >
              {[10, 25, 50].map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-3 h-4 w-4 text-slate-500" />
          </label>
          <span>registros</span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button type="button" onClick={onExport} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-amber-50 px-4 text-sm font-semibold text-amber-700 transition hover:bg-amber-100">
            <Download className="h-4 w-4" />
            Exportar
          </button>
          <label className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Buscar..."
              aria-label="Buscar registros"
              className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 sm:w-64"
            />
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left uppercase tracking-wide text-slate-500">
              <th className="w-12 px-5 py-4">
                <input type="checkbox" checked={allVisibleSelected} onChange={toggleVisibleSelection} aria-label="Seleccionar registros visibles" className="h-4 w-4 rounded border-slate-300 accent-amber-600" />
              </th>
              {columns.map((column) => <th key={column.key} className="px-4 py-4 text-xs font-semibold">{column.label}</th>)}
              <th className="w-20 px-4 py-4 text-right text-xs font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((row) => {
              const id = String(row.id);
              return (
                <tr key={id} className="border-b border-slate-100 last:border-0 hover:bg-amber-50/30">
                  <td className="px-5 py-4">
                    <input type="checkbox" checked={selectedIds.includes(id)} onChange={() => toggleSelection(id)} aria-label={`Seleccionar registro ${id}`} className="h-4 w-4 rounded border-slate-300 accent-amber-600" />
                  </td>
                  {columns.map((column) => <td key={column.key} className="px-4 py-4 text-slate-700">{column.render ? column.render(row) : String(row[column.key] ?? '—')}</td>)}
                  <td className="relative px-4 py-4 text-right">
                    <button type="button" onClick={() => onMenuChange(menuId === id ? null : id)} aria-label={`Acciones para ${id}`} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {menuId === id && (
                      <div className="absolute right-4 top-12 z-10 w-32 rounded-lg border border-slate-200 bg-white py-1 text-left shadow-xl">
                        <button type="button" onClick={() => { onMenuChange(null); onDelete(id); }} className="w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                          <Trash2 className="mr-2 inline h-3.5 w-3.5" />Eliminar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span>Mostrando {firstItem} a {lastItem} de {filteredItems.length} registros</span>
        <div className="flex items-center gap-1" aria-label="Paginación">
          <button type="button" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)} aria-label="Página anterior" className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => index + 1).map((pageNumber) => <button type="button" key={pageNumber} onClick={() => onPageChange(pageNumber)} className={`h-9 min-w-9 rounded-lg px-2 font-medium ${pageNumber === currentPage ? 'bg-amber-600 text-white' : 'hover:bg-slate-100'}`}>{pageNumber}</button>)}
          <button type="button" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)} aria-label="Página siguiente" className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
}

function exportCsv(items: any[], columns: Column[], title: string) {
  const headers = columns.map((column) => column.label);
  const rows = items.map((row) => columns.map((column) => String(column.render ? column.render(row) : row[column.key] ?? '')));
  const csv = [headers, ...rows].map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title.toLowerCase().replace(/\s+/g, '-')}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}