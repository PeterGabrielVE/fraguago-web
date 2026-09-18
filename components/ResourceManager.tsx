'use client';
import { Children, isValidElement, useState } from 'react';
import { api } from '@/lib/api';
import {
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { AsyncBoundary } from '@/components/async-boundary';
import PhoneField from '@/components/PhoneField';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';

export type SelectOption = string | { value: string; label: string };

export type Field = {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'datetime-local' | 'select' | 'email' | 'textarea' | 'checkbox' | 'phone';
  options?: SelectOption[];
  required?: boolean;
  requiredOnEdit?: boolean;
  defaultValue?: string | (() => string);
};
export type Column = { key: string; label: string; render?: (row: any) => any };

export type RowAction = {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => Promise<any> | void;
  className?: string;
  /** Si es true, la acción abre un modal de confirmación (como el de crear) en vez de ejecutarse al instante. */
  confirm?: boolean;
  confirmTitle?: string;
  confirmDescription?: React.ReactNode;
};

export type ListFilter = { label: string; endpoint: string };

export default function ResourceManager({
  title, subtitle, icon: Icon, endpoint, columns, fields, getEditValues, renderDetails, renderCreate, formVariant = 'inline', onCreate, extraActions, disableEdit, filters, headerActions,
}: {
  title: string;
  subtitle?: string;
  /** Ícono del módulo, mostrado en la insignia del encabezado (mismo lenguaje visual que Asistencia). */
  icon?: React.ComponentType<{ className?: string }>;
  endpoint: string;
  columns: Column[];
  fields: Field[];
  getEditValues?: (row: Record<string, any>) => Record<string, any>;
  renderDetails?: (row: Record<string, any>, onClose: () => void) => React.ReactNode;
  /** Reemplaza el formulario de alta (inline/modal por `fields`) por una vista propia, p. ej. una versión de `renderDetails` con pestañas editables. No aplica a edición. */
  renderCreate?: (onDone: () => void, onCancel: () => void) => React.ReactNode;
  formVariant?: 'inline' | 'modal';
  /** Sobrescribe el POST de creación por defecto (api.post(endpoint, payload)), p. ej. para endpoints anidados. */
  onCreate?: (payload: Record<string, any>) => Promise<any>;
  /** Acciones extra por fila que se muestran en el menú "···" junto a Eliminar. */
  extraActions?: (row: Record<string, any>) => RowAction[];
  /** Oculta el botón de editar (lápiz) cuando el recurso no soporta actualización genérica. */
  disableEdit?: boolean;
  /** Pestañas que cambian de qué endpoint se lee la lista (crear/editar/eliminar siguen usando `endpoint`). La primera se usa por defecto. */
  filters?: ListFilter[];
  /** Contenido extra en el header, a la izquierda del botón "Nuevo" (p. ej. un botón de generación con IA). */
  headerActions?: React.ReactNode;
}) {
  const [form, setForm] = useState<Record<string, any>>({});
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailsRow, setDetailsRow] = useState<Record<string, any> | null>(null);
  const [actionError, setActionError] = useState(''); // errores de crear/eliminar
  const [query, setQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<RowAction | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [activeFilter, setActiveFilter] = useState(0);
  const listEndpoint = filters?.[activeFilter]?.endpoint ?? endpoint;

  // carga (loading / empty / error) gestionada por el hook
  const { status, data, error, refetch } = useAsync<any[]>(
    () => api.get(listEndpoint).then((res) =>
      Array.isArray(res) ? res : (res?.data ?? [])
    ),
    [listEndpoint],
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
        if (f.type === 'datetime-local') v = new Date(v).toISOString();
        if (f.type === 'checkbox' && v === false) continue;
        payload[f.name] = v;
      }
      const wasEditing = Boolean(editingId);
      if (editingId) {
        await api.patch(`${endpoint}/${editingId}`, payload);
      } else if (onCreate) {
        await onCreate(payload);
      } else {
        await api.post(endpoint, payload);
      }
      setForm({}); setOpen(false); setEditingId(null);
      refetch();
      toast.add({ title: wasEditing ? 'Registro actualizado' : 'Registro creado', type: 'success' });
    } catch (e: any) {
      setActionError(e.message);
      toast.add({ title: 'No se pudo guardar', description: e.message, type: 'error' });
    }
  }

  function startCreate() {
    const defaults: Record<string, any> = {};
    for (const f of fields) {
      if (f.defaultValue !== undefined) {
        defaults[f.name] = typeof f.defaultValue === 'function' ? f.defaultValue() : f.defaultValue;
      }
    }
    setForm(defaults);
    setEditingId(null);
    setActionError('');
    setOpen(true);
  }

  function startEdit(row: Record<string, any>) {
    setForm(getEditValues ? getEditValues(row) : row);
    setEditingId(String(row.id));
    setOpen(true);
    setActionError('');
    setMenuId(null);
  }

  function cancelForm() {
    setForm({});
    setOpen(false);
    setEditingId(null);
  }

  if (detailsRow && renderDetails) {
    return (
      <div className="min-h-full space-y-6 p-8">
        {renderDetails(detailsRow, () => setDetailsRow(null))}
      </div>
    );
  }

  if (open && !editingId && renderCreate) {
    return (
      <div className="min-h-full space-y-6 p-8">
        {renderCreate(() => { cancelForm(); refetch(); }, cancelForm)}
      </div>
    );
  }

  async function remove(id: string) {
    setActionError('');
    try {
      await api.del(`${endpoint}/${id}`);
      setDeleteTarget(null);
      refetch();
      toast.add({ title: 'Registro eliminado', type: 'success' });
    } catch (e: any) {
      setActionError(e.message);
      setDeleteTarget(null);
      toast.add({ title: 'No se pudo eliminar', description: e.message, type: 'error' });
    }
  }

  function resolveCellText(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return value.map((item) => resolveCellText(item)).filter(Boolean).join(' ');
    if (isValidElement(value)) {
      const props = value.props as { children?: React.ReactNode };
      const children = Children.toArray(props.children ?? []);
      return children.map((child) => resolveCellText(child)).filter(Boolean).join(' ');
    }
    if (typeof value === 'object') {
      if ('label' in value && typeof (value as any).label === 'string') return (value as any).label;
      if ('name' in value && typeof (value as any).name === 'string') return (value as any).name;
      if ('value' in value && typeof (value as any).value === 'string') return (value as any).value;
      return '';
    }
    return String(value);
  }

  function requestDelete(row: Record<string, any>) {
    const firstColumn = columns[0];
    const rawValue = firstColumn ? (firstColumn.render ? firstColumn.render(row) : row[firstColumn.key]) : row.id;
    const label = resolveCellText(rawValue) || String(row.id ?? 'este registro');
    setDeleteTarget({ id: String(row.id), label });
    setMenuId(null);
    setMenuAnchor(null);
  }

  function requestRowAction(action: RowAction) {
    setMenuId(null);
    setMenuAnchor(null);
    if (action.confirm) {
      setActionError('');
      setConfirmTarget(action);
    } else {
      runRowAction(action);
    }
  }

  async function runRowAction(action: RowAction) {
    setActionError('');
    try {
      await action.onClick();
      refetch();
      toast.add({ title: 'Acción completada', description: action.label, type: 'success' });
    } catch (e: any) {
      setActionError(e.message);
      toast.add({ title: 'No se pudo completar la acción', description: e.message, type: 'error' });
    }
  }

  async function confirmRowAction() {
    if (!confirmTarget) return;
    setConfirmBusy(true);
    await runRowAction(confirmTarget);
    setConfirmBusy(false);
    setConfirmTarget(null);
  }

  const inputClass =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ' +
    'focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition';

  const formFields = fields.map((f) => (
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
      ) : f.type === 'phone' ? (
        <PhoneField
          value={form[f.name] ?? ''}
          required={editingId ? f.requiredOnEdit ?? false : f.required}
          onChange={(value) => setForm({ ...form, [f.name]: value })}
        />
      ) : f.type === 'select' ? (
        <select
          value={form[f.name] ?? ''}
          required={editingId ? f.requiredOnEdit ?? false : f.required}
          onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
          className={inputClass}
        >
          <option value="">Selecciona…</option>
          {f.options?.map((o) => {
            const value = typeof o === 'string' ? o : o.value;
            const label = typeof o === 'string' ? o : o.label;
            return <option key={value} value={value}>{label}</option>;
          })}
        </select>
      ) : f.type === 'textarea' ? (
        <textarea
          required={editingId ? f.requiredOnEdit ?? false : f.required}
          value={form[f.name] ?? ''}
          onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
          className={`${inputClass} min-h-24`}
        />
      ) : (
        <input
          type={f.type || 'text'}
          required={editingId ? f.requiredOnEdit ?? false : f.required}
          value={form[f.name] ?? ''}
          onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
          className={inputClass}
        />
      )}
    </div>
  ));

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {Icon && (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-sm">
                <Icon className="h-7 w-7" />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
              {subtitle && <p className="mt-1 text-slate-600">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {headerActions}
            <button
              onClick={() => (open ? cancelForm() : startCreate())}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${open
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                : 'bg-amber-600 text-white hover:bg-amber-700'
                }`}
            >
              {open ? 'Cancelar' : <><Plus className="h-4 w-4" /> Nuevo</>}
            </button>
          </div>
        </div>
      </div>

      {/* Pestañas de filtro: cambian de qué endpoint se lee la lista */}
      {filters && filters.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {filters.map((f, i) => (
            <button
              key={f.label}
              type="button"
              onClick={() => { setActiveFilter(i); setPage(1); }}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${i === activeFilter
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Banner solo para errores de mutación (crear / eliminar). Si el formulario está en un modal abierto, el error se muestra dentro de él. */}
      {actionError && !(formVariant === 'modal' && open) && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {actionError}
        </div>
      )}

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar registro</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que deseas eliminar <span className="font-medium text-foreground">{deleteTarget?.label}</span>? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => deleteTarget && remove(deleteTarget.id)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmación de acciones extra (p. ej. renovar), con el mismo estilo de modal que crear/editar */}
      <Dialog open={Boolean(confirmTarget)} onOpenChange={(nextOpen) => { if (!nextOpen) setConfirmTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{confirmTarget?.confirmTitle ?? confirmTarget?.label}</DialogTitle>
            {confirmTarget?.confirmDescription && (
              <DialogDescription>{confirmTarget.confirmDescription}</DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setConfirmTarget(null)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={confirmBusy}
              onClick={confirmRowAction}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition disabled:opacity-60"
            >
              {confirmBusy ? 'Procesando…' : confirmTarget?.label}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Formulario de alta */}
      {formVariant === 'modal' ? (
        <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) cancelForm(); }}>
          <DialogContent className="sm:max-w-lg">
            <form onSubmit={create} className="grid gap-4">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Editar registro' : 'Nuevo registro'}</DialogTitle>
                <DialogDescription>{title}</DialogDescription>
              </DialogHeader>
              {actionError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {actionError}
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                {formFields}
              </div>
              <DialogFooter>
                <button
                  type="submit"
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition"
                >
                  {editingId ? 'Actualizar' : 'Guardar'}
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : open && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <form onSubmit={create} className="grid gap-4 md:grid-cols-2">
            {formFields}
            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition"
              >
                {editingId ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabla: loading / empty / error / datos vía AsyncBoundary */}
      <div className="overflow-visible rounded-xl border border-slate-200 bg-white shadow-sm">
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
              menuAnchor={menuAnchor}
              onQueryChange={(value) => { setQuery(value); setPage(1); }}
              onPageSizeChange={(value) => { setPageSize(value); setPage(1); }}
              onPageChange={setPage}
              onMenuChange={(value) => {
                setMenuId(value);
                if (!value) setMenuAnchor(null);
              }}
              setMenuAnchor={setMenuAnchor}
              onSelectionChange={setSelectedIds}
              onEdit={startEdit}
              onDetails={renderDetails ? setDetailsRow : undefined}
              onDeleteRequest={requestDelete}
              onExport={() => exportCsv(items, columns, title)}
              extraActions={extraActions}
              onRunAction={requestRowAction}
              disableEdit={disableEdit}
            />
          )}
        </AsyncBoundary>
      </div>
      {detailsRow && renderDetails?.(detailsRow, () => setDetailsRow(null))}
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
  menuAnchor,
  onQueryChange,
  onPageSizeChange,
  onPageChange,
  onMenuChange,
  setMenuAnchor,
  onSelectionChange,
  onEdit,
  onDetails,
  onDeleteRequest,
  onExport,
  extraActions,
  onRunAction,
  disableEdit,
}: {
  items: any[];
  columns: Column[];
  query: string;
  page: number;
  pageSize: number;
  selectedIds: string[];
  menuId: string | null;
  menuAnchor: { x: number; y: number } | null;
  onQueryChange: (value: string) => void;
  onPageSizeChange: (value: number) => void;
  onPageChange: (value: number) => void;
  onMenuChange: (value: string | null) => void;
  setMenuAnchor: (anchor: { x: number; y: number } | null) => void;
  onSelectionChange: (value: string[]) => void;
  onEdit: (row: Record<string, any>) => void;
  onDetails?: (row: Record<string, any>) => void;
  onDeleteRequest: (row: Record<string, any>) => void;
  onExport: () => void;
  extraActions?: (row: Record<string, any>) => RowAction[];
  onRunAction: (action: RowAction) => void;
  disableEdit?: boolean;
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

      <div className="overflow-x-auto overflow-y-visible">
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
                <tr
                  key={id}
                  onClick={() => onDetails?.(row)}
                  className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-amber-50/30"
                >
                  <td className="px-5 py-4" onClick={(event) => event.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.includes(id)} onChange={() => toggleSelection(id)} aria-label={`Seleccionar registro ${id}`} className="h-4 w-4 rounded border-slate-300 accent-amber-600" />
                  </td>
                  {columns.map((column, index) => (
                    <td key={column.key} className="px-4 py-4 text-slate-700" onClick={(event) => {
                      if (index === 0 && onDetails) {
                        event.stopPropagation();
                        onDetails(row);
                      }
                    }}>
                      {index === 0 && onDetails ? (
                        <button
                          type="button"
                          className="text-left font-medium text-amber-700 transition hover:text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2"
                          onClick={(event) => {
                            event.stopPropagation();
                            onDetails(row);
                          }}
                        >
                          {column.render ? column.render(row) : String(row[column.key] ?? '—')}
                        </button>
                      ) : (
                        column.render ? column.render(row) : String(row[column.key] ?? '—')
                      )}
                    </td>
                  ))}
                  <td className="relative px-4 py-4 text-right" onClick={(event) => event.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      {(onDetails || !disableEdit) && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (onDetails) {
                              onDetails(row);
                              return;
                            }
                            onEdit(row);
                          }}
                          aria-label={`Ver detalles de ${id}`}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(event) => {
                          const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
                          const nextAnchor = menuId === id ? null : { x: rect.right - 128, y: rect.bottom + 8 };
                          setMenuAnchor(nextAnchor);
                          onMenuChange(nextAnchor ? id : null);
                        }}
                        aria-label={`Acciones para ${id}`}
                        className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                    {menuId === id && menuAnchor && (
                      <div
                        className="fixed z-50 w-36 rounded-lg border border-slate-200 bg-white py-1 text-left shadow-xl"
                        style={{ left: `${menuAnchor.x}px`, top: `${menuAnchor.y}px` }}
                      >
                        {extraActions?.(row).map((action) => {
                          const Icon = action.icon;
                          return (
                            <button
                              key={action.label}
                              type="button"
                              onClick={() => onRunAction(action)}
                              className={action.className ?? 'w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50'}
                            >
                              {Icon && <Icon className="mr-2 inline h-3.5 w-3.5" />}{action.label}
                            </button>
                          );
                        })}
                        <button type="button" onClick={() => { onMenuChange(null); setMenuAnchor(null); onDeleteRequest(row); }} className="w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50">
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