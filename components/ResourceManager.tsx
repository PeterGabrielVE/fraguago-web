'use client';
import { Children, isValidElement, useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { richText, useT } from '@/components/I18nProvider';
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
import PasswordInput from '@/components/PasswordInput';

/** `group` se usa junto con `Field.dependsOn` para filtrar opciones según otro campo. */
export type SelectOption = string | { value: string; label: string; group?: string };

export type Field = {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'datetime-local' | 'time' | 'select' | 'multiselect' | 'email' | 'textarea' | 'checkbox' | 'phone' | 'password';
  options?: SelectOption[];
  required?: boolean;
  requiredOnEdit?: boolean;
  defaultValue?: string | (() => string);
  /** El campo solo aparece al crear; se oculta por completo al editar (y por lo tanto nunca se manda en el PATCH). */
  createOnly?: boolean;
  /** El campo solo aparece al editar; se oculta por completo al crear. Útil junto con `createOnly` para usar un input distinto (p. ej. multiselect) en cada modo, con el mismo `name`. */
  editOnly?: boolean;
  /** El input se muestra deshabilitado; su valor solo cambia por `mirrorFrom` de otro campo. */
  readOnly?: boolean;
  /** Copia automáticamente el valor de otro campo (por nombre) cada vez que ese otro campo cambia, p. ej. contraseña = cédula. */
  mirrorFrom?: string;
  /** El campo ocupa el ancho completo del formulario (col-span-2 en md). */
  fullWidth?: boolean;
  /** Convierte el valor a número antes de enviarlo, aunque el tipo de input no sea "number" (p. ej. un select de opciones numéricas). */
  numeric?: boolean;
  /** Solo para type "multiselect": atajos que reemplazan la selección actual por un conjunto fijo de valores, p. ej. { label: 'Lunes a viernes', values: ['0','1','2','3','4'] }. */
  presets?: { label: string; values: string[] }[];
  /** Solo para type "select": muestra únicamente las opciones cuyo `group` coincide con el valor actual de este otro campo. Queda deshabilitado hasta elegirlo y se limpia si deja de ser válido. */
  dependsOn?: string;
  /** Input propio en lugar del estándar (p. ej. un select agrupado con opción "Otro"). */
  renderInput?: (props: { value: string; onChange: (value: string) => void; className: string }) => React.ReactNode;
  /** El campo solo se muestra (y se envía) si devuelve true, p. ej. según el método de pago elegido. */
  visibleWhen?: (form: Record<string, any>) => boolean;
  /** Etiqueta que cambia según el formulario (reemplaza a `label` al mostrarla). */
  labelWhen?: (form: Record<string, any>) => string;
  /** Obligatoriedad que depende del formulario (reemplaza a `required`/`requiredOnEdit`). */
  requiredWhen?: (form: Record<string, any>) => boolean;
  placeholder?: string | ((form: Record<string, any>) => string | undefined);
  /** Texto de ayuda bajo el campo. */
  hint?: string | ((form: Record<string, any>) => string | undefined);
};

function fieldVisible(f: Field, form: Record<string, any>) {
  return f.visibleWhen ? f.visibleWhen(form) : true;
}

function optionValue(o: SelectOption) {
  return typeof o === 'string' ? o : o.value;
}

// Opciones visibles de un select según el valor del campo del que depende.
function visibleOptions(f: Field, form: Record<string, any>): SelectOption[] {
  const options = f.options ?? [];
  if (!f.dependsOn) return options;
  const parent = form[f.dependsOn];
  if (!parent) return [];
  return options.filter((o) => typeof o !== 'string' && o.group === parent);
}
export type Column = { key: string; label: string; render?: (row: any) => any };
export type StatusConfig = {
  getStatus: (row: Record<string, any>) => string;
  render?: (status: string, row: Record<string, any>) => React.ReactNode;
  update: (id: string, status: 'ACTIVE' | 'SUSPENDED') => Promise<void>;
};
export type CreateFormRendererProps = {
  form: Record<string, any>;
  setForm: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  fields: Field[];
  editingId: string | null;
  onSubmit: (event: React.FormEvent) => void;
};

export type RowAction = {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => Promise<any> | void;
  className?: string;
  /** Explicación corta bajo la etiqueta en el menú (qué hace la acción). */
  description?: string;
  /** Acción destructiva: se muestra en rojo y separada del resto. */
  danger?: boolean;
  /** Si es true, la acción abre un modal de confirmación (como el de crear) en vez de ejecutarse al instante. */
  confirm?: boolean;
  confirmTitle?: string;
  confirmDescription?: React.ReactNode;
  /** Texto del botón que confirma (por defecto, la etiqueta de la acción). */
  confirmLabel?: string;
  /** Texto del botón que cierra el modal sin hacer nada (por defecto, "Cancelar"). */
  dismissLabel?: string;
  /** Si es true, no muestra el toast automático de "Acción completada" ni refresca la lista al terminar — para acciones que solo abren un diálogo propio (que maneja su propio guardado/toast/refetch) en vez de mutar algo de inmediato. */
  silent?: boolean;
};

export type ListFilter = { label: string; endpoint: string };

// Posición del menú de acciones de fila (fixed). above: se abre hacia arriba
// porque la fila está cerca del borde inferior; y es entonces la distancia al
// borde inferior de la ventana.
type MenuAnchor = { x: number; y: number; above?: boolean };
const ROW_MENU_WIDTH = 240;

export default function ResourceManager({
  title, subtitle, icon: Icon, endpoint, columns, fields, getEditValues, renderDetails,
  renderCreateForm, renderCreate, hideListWhenCreating = false, statusConfig,
  formVariant = 'inline', onCreate, extraActions, disableEdit, disableCreate = false, disableDelete = false, filters, headerActions, intro, validate, rowFilter,
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
  /** Reemplaza el formulario de alta estándar (basado en `fields`) por uno propio, p. ej. con pestañas. Solo aplica al variant "inline" y a la creación (no a editar). */
  renderCreateForm?: (props: CreateFormRendererProps) => React.ReactNode;
  /** Reemplaza toda la vista (header, tabla, todo) por una propia durante la creación, p. ej. un formulario de página completa con sus propias pestañas. No aplica a edición; si ambos renderCreate y renderCreateForm están definidos, renderCreate tiene prioridad. */
  renderCreate?: (onDone: () => void, onCancel: () => void) => React.ReactNode;
  /** Oculta la tabla mientras el formulario de alta está abierto (útil junto con renderCreateForm cuando el formulario es grande). */
  hideListWhenCreating?: boolean;
  /** Habilita una columna de estado + acción de activar/suspender por fila. */
  statusConfig?: StatusConfig;
  formVariant?: 'inline' | 'modal';
  /**
   * Sobrescribe el POST de creación por defecto (api.post(endpoint, payload)), p. ej. para endpoints anidados.
   * Cuando se usa junto con `renderCreateForm`, recibe el `form` tal cual (sin la conversión de tipos de `fields`),
   * ya que el formulario propio puede tener campos que no están declarados en `fields`.
   */
  onCreate?: (payload: Record<string, any>) => Promise<any>;
  /** Acciones extra por fila que se muestran en el menú "···" junto a Eliminar. */
  extraActions?: (row: Record<string, any>) => RowAction[];
  /** Oculta el botón de editar (lápiz) cuando el recurso no soporta actualización genérica. */
  disableEdit?: boolean;
  /** Oculta el botón "Nuevo"/"Cancelar" del header cuando el recurso no soporta creación (p. ej. solo lectura). */
  disableCreate?: boolean;
  /** Oculta la opción "Eliminar" del menú de acciones cuando el recurso no soporta borrado (p. ej. solo lectura). */
  disableDelete?: boolean;
  /** Pestañas que cambian de qué endpoint se lee la lista (crear/editar/eliminar siguen usando `endpoint`). La primera se usa por defecto. */
  filters?: ListFilter[];
  /** Contenido extra en el header, a la izquierda del botón "Nuevo" (p. ej. un botón de generación con IA). */
  headerActions?: React.ReactNode;
  /** Contenido propio entre el encabezado y la tabla (p. ej. un panel de estado del módulo). */
  intro?: React.ReactNode;
  /** Validación adicional (p. ej. entre campos) antes de crear/editar. Devolver un mensaje de error la bloquea; devolver nada/null la deja pasar. */
  validate?: (form: Record<string, any>) => string | null | undefined;
  /** Filtro extra de filas (p. ej. por rango de edad) que se suma al buscador y a los filtros de columna. Memoízalo: al cambiar vuelve a la página 1. */
  rowFilter?: (row: Record<string, any>) => boolean;
}) {
  const t = useT();
  const [form, setForm] = useState<Record<string, any>>({});
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailsRow, setDetailsRow] = useState<Record<string, any> | null>(null);
  const [actionError, setActionError] = useState(''); // errores de crear/eliminar
  const [query, setQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<MenuAnchor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [statusTarget, setStatusTarget] = useState<{ id: string; label: string; nextStatus: 'ACTIVE' | 'SUSPENDED' } | null>(null);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({});
  const [confirmTarget, setConfirmTarget] = useState<RowAction | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [activeFilter, setActiveFilter] = useState(0);
  const listEndpoint = filters?.[activeFilter]?.endpoint ?? endpoint;
  const formId = useId();
  useEffect(() => setPage(1), [rowFilter]);

  // carga (loading / empty / error) gestionada por el hook
  // api.list trae todas las páginas (la tabla pagina y busca en el cliente).
  const { status, data, error, refetch } = useAsync<any[]>(
    () => api.list(listEndpoint),
    [listEndpoint],
  );
  // Misma referencia mientras no cambien los datos: la tabla cachea el texto
  // de cada celda por fila.
  const tableItems = useMemo(
    () => (rowFilter ? (data ?? []).filter(rowFilter) : data ?? [])
      .map((item) => statusOverrides[String(item.id)] ? { ...item, status: statusOverrides[String(item.id)], statusOverride: true } : item),
    [data, rowFilter, statusOverrides],
  );

  // Enlaces del buscador global: ?q= filtra la tabla, ?id= abre la ficha del registro
  // (si la pantalla tiene detalle) y ?new=1 abre el alta. Se aplican una vez y se limpian de la URL.
  const router = useRouter();
  const pathname = usePathname();
  const deepLink = useSearchParams().toString();
  useEffect(() => {
    if (!deepLink) return;
    const params = new URLSearchParams(deepLink);
    const q = params.get('q');
    const id = params.get('id');
    const wantsDetails = Boolean(id && renderDetails);
    if (wantsDetails && status === 'loading') return; // espera a la lista para encontrar el registro

    const row = wantsDetails ? data?.find((item) => String(item.id) === id) : undefined;
    if (row) {
      setDetailsRow(row);
    } else if (q) {
      setQuery(q);
      setPage(1);
    }
    if (params.get('new') === '1' && !disableCreate) startCreate();
    router.replace(pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLink, status, data]);

  function buildPayload() {
    const payload: Record<string, any> = {};
    for (const f of fields) {
      if (f.createOnly && editingId) continue;
      if (f.editOnly && !editingId) continue;
      if (!fieldVisible(f, form)) continue;
      let v = form[f.name];
      if (v === '' || v === undefined) continue;
      if (f.type === 'multiselect' && Array.isArray(v) && v.length === 0) continue;
      if ((f.type === 'number' || f.numeric) && f.type !== 'multiselect') v = Number(v);
      if (f.type === 'datetime-local') v = new Date(v).toISOString();
      if (f.type === 'checkbox' && v === false) continue;
      payload[f.name] = v;
    }
    return payload;
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setActionError('');
    if (validate) {
      const message = validate(form);
      if (message) {
        setActionError(message);
        toast.add({ title: t('table.toast.checkForm'), description: message, type: 'error' });
        return;
      }
    }
    try {
      const wasEditing = Boolean(editingId);
      if (editingId) {
        await api.patch(`${endpoint}/${editingId}`, buildPayload());
      } else if (onCreate) {
        // Con renderCreateForm, el formulario propio decide su propia forma de datos
        // (puede tener campos que no están en `fields`), así que se pasa tal cual.
        await onCreate(renderCreateForm ? form : buildPayload());
      } else {
        await api.post(endpoint, buildPayload());
      }
      setForm({}); setOpen(false); setEditingId(null);
      refetch();
      toast.add({ title: wasEditing ? t('table.toast.updated') : t('table.toast.created'), type: 'success' });
    } catch (e: any) {
      setActionError(e.message);
      toast.add({ title: t('table.toast.saveFailed'), description: e.message, type: 'error' });
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
      <div className="min-h-full space-y-6 p-4 sm:p-6 lg:p-8">
        {renderDetails(detailsRow, () => setDetailsRow(null))}
      </div>
    );
  }

  if (open && !editingId && renderCreate) {
    return (
      <div className="min-h-full space-y-6 p-4 sm:p-6 lg:p-8">
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
      toast.add({ title: t('table.toast.deleted'), type: 'success' });
    } catch (e: any) {
      setActionError(e.message);
      setDeleteTarget(null);
      toast.add({ title: t('table.toast.deleteFailed'), description: e.message, type: 'error' });
    }
  }

  async function updateStatus() {
    if (!statusTarget || !statusConfig) return;
    setActionError('');
    try {
      await statusConfig.update(statusTarget.id, statusTarget.nextStatus);
      setStatusOverrides((current) => ({ ...current, [statusTarget.id]: statusTarget.nextStatus }));
      setStatusTarget(null);
    } catch (e: any) {
      setActionError(e.message);
      setStatusTarget(null);
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
    const label = resolveCellText(rawValue) || String(row.id ?? t('table.thisRecord'));
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
      if (action.silent) return;
      refetch();
      toast.add({ title: t('table.toast.actionDone'), description: action.label, type: 'success' });
    } catch (e: any) {
      setActionError(e.message);
      toast.add({ title: t('table.toast.actionFailed'), description: e.message, type: 'error' });
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
    'w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none sm:py-2 sm:text-sm ' +
    'focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition';

  // Actualiza un campo y, si algún otro campo lo espeja (mirrorFrom), lo sincroniza también.
  function updateField(name: string, value: any) {
    setForm((current) => {
      const next = { ...current, [name]: value };
      for (const other of fields) {
        if (other.mirrorFrom === name) next[other.name] = value;
      }
      // Limpia los selects dependientes cuyo valor ya no es válido.
      for (const other of fields) {
        if (other.dependsOn !== name || !next[other.name]) continue;
        if (!visibleOptions(other, next).some((o) => optionValue(o) === next[other.name])) next[other.name] = '';
      }
      return next;
    });
  }

  const isRequired = (f: Field) => (f.requiredWhen ? f.requiredWhen(form) : editingId ? f.requiredOnEdit ?? false : f.required);
  const byForm = (value: string | ((form: Record<string, any>) => string | undefined) | undefined) =>
    typeof value === 'function' ? value(form) : value;

  const formFields = fields
    .filter((f) => !(f.createOnly && editingId) && !(f.editOnly && !editingId) && fieldVisible(f, form))
    .map((f) => {
    // id del control para asociar la etiqueta (lector de pantalla y clic en la etiqueta).
    const fieldId = `${formId}-${f.name}`;
    const hint = byForm(f.hint);
    const hintId = hint ? `${fieldId}-hint` : undefined;
    const groupLabel = f.type === 'multiselect' || f.type === 'checkbox' || f.type === 'phone' || f.renderInput;
    const LabelTag = groupLabel ? 'p' : 'label';
    return (
    <div key={f.name} className={f.type === 'textarea' || f.type === 'multiselect' || f.fullWidth ? 'md:col-span-2' : ''} role={f.type === 'multiselect' ? 'group' : undefined} aria-labelledby={f.type === 'multiselect' ? `${fieldId}-label` : undefined}>
      <LabelTag id={`${fieldId}-label`} {...(groupLabel ? {} : { htmlFor: fieldId })} className="mb-1.5 block text-sm font-medium text-slate-700">
        {f.labelWhen?.(form) ?? f.label}{isRequired(f) && <span className="text-red-500" aria-hidden="true"> *</span>}
      </LabelTag>
      {f.renderInput ? (
        f.renderInput({ value: form[f.name] ?? '', onChange: (value) => updateField(f.name, value), className: inputClass })
      ) : f.type === 'multiselect' ? (
        <div className="space-y-2">
          {f.presets && f.presets.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {f.presets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => updateField(f.name, preset.values)}
                  className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 transition hover:bg-amber-100"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-lg border border-slate-300 px-3 py-2.5">
          {f.options?.map((o) => {
            const value = typeof o === 'string' ? o : o.value;
            const label = typeof o === 'string' ? o : o.label;
            const selected: string[] = Array.isArray(form[f.name]) ? form[f.name] : [];
            const checked = selected.includes(value);
            return (
              <label key={value} className="flex items-center gap-1.5 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...selected, value]
                      : selected.filter((v) => v !== value);
                    updateField(f.name, next);
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                {label}
              </label>
            );
          })}
          </div>
        </div>
      ) : f.type === 'checkbox' ? (
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form[f.name] ?? false}
            onChange={(e) => updateField(f.name, e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
          />
          {f.label}
        </label>
      ) : f.type === 'phone' ? (
        <PhoneField
          value={form[f.name] ?? ''}
          required={isRequired(f)}
          onChange={(value) => updateField(f.name, value)}
        />
      ) : f.type === 'select' ? (
        <select
          id={fieldId}
          aria-describedby={hintId}
          value={form[f.name] ?? ''}
          required={isRequired(f)}
          disabled={f.readOnly || (f.dependsOn !== undefined && !form[f.dependsOn])}
          onChange={(e) => updateField(f.name, e.target.value)}
          className={`${inputClass} disabled:bg-slate-100 disabled:text-slate-500`}
        >
          <option value="">
            {f.dependsOn && !form[f.dependsOn]
              ? t('table.chooseFirst', { field: fields.find((p) => p.name === f.dependsOn)?.label.toLowerCase() ?? t('table.previousField') })
              : t('common.select')}
          </option>
          {visibleOptions(f, form).map((o) => {
            const value = typeof o === 'string' ? o : o.value;
            const label = typeof o === 'string' ? o : o.label;
            return <option key={value} value={value}>{label}</option>;
          })}
        </select>
      ) : f.type === 'password' ? (
        <PasswordInput
          id={fieldId}
          aria-describedby={hintId}
          required={isRequired(f)}
          value={form[f.name] ?? ''}
          autoComplete="new-password"
          onChange={(e) => updateField(f.name, e.target.value)}
          placeholder={byForm(f.placeholder)}
          className={inputClass}
        />
      ) : f.type === 'textarea' ? (
        <textarea
          id={fieldId}
          aria-describedby={hintId}
          required={isRequired(f)}
          value={form[f.name] ?? ''}
          readOnly={f.readOnly}
          onChange={(e) => updateField(f.name, e.target.value)}
          placeholder={byForm(f.placeholder)}
          className={`${inputClass} min-h-24`}
        />
      ) : (
        <input
          id={fieldId}
          aria-describedby={hintId}
          type={f.type || 'text'}
          required={isRequired(f)}
          value={form[f.name] ?? ''}
          readOnly={f.readOnly}
          onChange={(e) => updateField(f.name, e.target.value)}
          placeholder={byForm(f.placeholder)}
          className={`${inputClass} ${f.readOnly ? 'bg-slate-100 text-slate-600' : ''}`}
        />
      )}
      {hint && <p id={hintId} className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
    );
  });

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="relative rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 p-4 sm:gap-6 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            {Icon && (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white shadow-sm sm:h-14 sm:w-14 sm:rounded-2xl" aria-hidden="true">
                <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-slate-600 sm:text-base">{subtitle}</p>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {headerActions}
            {!disableCreate && (
              <button
                type="button"
                onClick={() => (open ? cancelForm() : startCreate())}
                aria-expanded={formVariant === 'inline' ? open : undefined}
                className={`order-first inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition sm:w-auto lg:order-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 ${open
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'bg-amber-600 text-white hover:bg-amber-700'
                  }`}
              >
                {open ? t('common.cancel') : <><Plus className="h-4 w-4" aria-hidden="true" /> {t('common.new')}</>}
              </button>
            )}
          </div>
        </div>
      </div>

      {intro}

      {/* Pestañas de filtro: cambian de qué endpoint se lee la lista */}
      {filters && filters.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {filters.map((f, i) => (
            <button
              key={f.label}
              type="button"
              aria-pressed={i === activeFilter}
              onClick={() => { setActiveFilter(i); setPage(1); }}
              className={`min-h-9 rounded-full px-4 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${i === activeFilter
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
        <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {actionError}
        </div>
      )}

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('table.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {richText(t('table.deleteConfirm'), { label: <span className="font-medium text-foreground">{deleteTarget?.label}</span> })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => deleteTarget && remove(deleteTarget.id)}
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(statusTarget)} onOpenChange={(open) => !open && setStatusTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{statusTarget?.nextStatus === 'SUSPENDED' ? t('table.suspendTitle') : t('table.reactivateTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {richText(t(statusTarget?.nextStatus === 'SUSPENDED' ? 'table.suspendConfirm' : 'table.reactivateConfirm'), { label: <span className="font-medium text-foreground">{statusTarget?.label}</span> })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={updateStatus}>
              {statusTarget?.nextStatus === 'SUSPENDED' ? t('table.suspend') : t('table.reactivate')}
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
              {confirmTarget?.dismissLabel ?? t('common.cancel')}
            </button>
            <button
              type="button"
              disabled={confirmBusy}
              onClick={confirmRowAction}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-60',
                confirmTarget?.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700',
              )}
            >
              {confirmBusy ? t('common.processing') : confirmTarget?.confirmLabel ?? confirmTarget?.label}
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
                <DialogTitle>{editingId ? t('table.editRecord') : t('table.newRecord')}</DialogTitle>
                <DialogDescription>{title}</DialogDescription>
              </DialogHeader>
              {actionError && (
                <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {actionError}
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 [&>*]:min-w-0">
                {formFields}
              </div>
              <DialogFooter>
                <button
                  type="submit"
                  className="h-10 w-full rounded-lg bg-amber-600 px-4 text-sm font-medium text-white transition hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 sm:w-auto"
                >
                  {editingId ? t('common.update') : t('common.save')}
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : open && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          {renderCreateForm && !editingId ? renderCreateForm({ form, setForm, fields, editingId, onSubmit: create }) : (
            <form onSubmit={create} className="grid grid-cols-1 gap-4 md:grid-cols-2 [&>*]:min-w-0">
              {formFields}
              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="h-10 w-full rounded-lg bg-amber-600 px-4 text-sm font-medium text-white transition hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 sm:w-auto"
                >
                  {editingId ? t('common.update') : t('common.save')}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Tabla: loading / empty / error / datos vía AsyncBoundary */}
      {!(open && hideListWhenCreating) && (
        <div className="overflow-visible rounded-xl border border-slate-200 bg-white shadow-sm">
          <AsyncBoundary
            status={status}
            data={data}
            error={error}
            onRetry={refetch}
            loading={
              <div role="status" aria-live="polite" className="divide-y divide-slate-100">
                <span className="sr-only">{t('common.loading')}</span>
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4" aria-hidden="true">
                    <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200" />
                    <div className="hidden h-4 w-1/5 animate-pulse rounded bg-slate-100 sm:block" />
                    <div className="ml-auto h-4 w-16 animate-pulse rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            }
            empty={
              <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
                {Icon && (
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600" aria-hidden="true">
                    <Icon className="h-6 w-6" />
                  </span>
                )}
                <p className="text-sm text-slate-500">{t('table.empty')}</p>
                {/* Acción directa: el texto no depende de cómo se llame el botón de cada pantalla. */}
                {!disableCreate && !open && (
                  <button
                    type="button"
                    onClick={startCreate}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-amber-600 px-4 text-sm font-medium text-white transition hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />{t('table.createFirst')}
                  </button>
                )}
              </div>
            }
            errorFallback={
              <div role="alert" className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <AlertCircle className="h-8 w-8 text-red-500" aria-hidden="true" />
                <p className="text-sm text-slate-600">
                  {error?.message ?? t('table.loadError')}
                </p>
                <button
                  type="button"
                  onClick={refetch}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 transition"
                >
                  {t('common.retry')}
                </button>
              </div>
            }
          >
            {() => (
              <ResourceTable
                items={tableItems}
                columns={columns}
                title={title}
                query={query}
                page={page}
                pageSize={pageSize}
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
                onEdit={startEdit}
                onDetails={renderDetails ? setDetailsRow : undefined}
                onDeleteRequest={requestDelete}
                extraActions={extraActions}
                onRunAction={requestRowAction}
                disableEdit={disableEdit}
                disableDelete={disableDelete}
                statusConfig={statusConfig}
                onStatusRequest={(row, nextStatus) => {
                  const firstColumn = columns[0];
                  const rawValue = firstColumn ? (firstColumn.render ? firstColumn.render(row) : row[firstColumn.key]) : row.id;
                  const label = resolveCellText(rawValue) || String(row.id ?? t('table.thisMember'));
                  setStatusTarget({ id: String(row.id), label, nextStatus });
                  setMenuId(null);
                  setMenuAnchor(null);
                }}
              />
            )}
          </AsyncBoundary>
        </div>
      )}
      {detailsRow && renderDetails?.(detailsRow, () => setDetailsRow(null))}
    </div>
  );
}

function getNodeText(value: unknown): string {
  if (value === null || value === undefined || typeof value === 'boolean') return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(getNodeText).filter(Boolean).join(' ');
  if (isValidElement(value)) return getNodeText((value.props as { children?: unknown }).children);
  return '';
}

// Cierra un popover al hacer clic fuera, con Escape o al desplazar/redimensionar
// (los menús fixed quedarían flotando lejos de su fila).
function useDismiss(
  ref: React.RefObject<HTMLElement | null>,
  open: boolean,
  onClose: (reason: 'escape' | 'outside' | 'scroll') => void,
  { closeOnScroll = false }: { closeOnScroll?: boolean } = {},
) {
  useEffect(() => {
    if (!open) return;
    // El scroll por inercia justo al tocar no debe cerrar lo que se acaba de abrir.
    const openedAt = Date.now();
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (ref.current?.contains(target) || target.closest('[data-popover-trigger]')) return;
      onClose('outside');
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.stopPropagation(); onClose('escape'); }
    };
    const onScroll = (event: Event) => {
      if (Date.now() - openedAt < 250 || ref.current?.contains(event.target as Node)) return;
      onClose('scroll');
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    if (closeOnScroll) {
      window.addEventListener('scroll', onScroll, true);
      window.addEventListener('resize', onScroll);
    }
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [ref, open, onClose, closeOnScroll]);
}

// Números de página a mostrar: siempre la primera, la última y las vecinas de
// la actual; los saltos se marcan con null ("…").
function pageWindow(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current - 1, current, current + 1]);
  if (current <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (current >= total - 2) [total - 3, total - 2, total - 1].forEach((p) => pages.add(p));
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result: (number | null)[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push(null);
    result.push(p);
  });
  return result;
}

const iconButton =
  'inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400';

function ResourceTable({
  items,
  columns,
  title,
  query,
  page,
  pageSize,
  menuId,
  menuAnchor,
  onQueryChange,
  onPageSizeChange,
  onPageChange,
  onMenuChange,
  setMenuAnchor,
  onEdit,
  onDetails,
  onDeleteRequest,
  extraActions,
  onRunAction,
  disableEdit,
  disableDelete,
  statusConfig,
  onStatusRequest,
}: {
  items: any[];
  columns: Column[];
  title: string;
  query: string;
  page: number;
  pageSize: number;
  menuId: string | null;
  menuAnchor: MenuAnchor | null;
  onQueryChange: (value: string) => void;
  onPageSizeChange: (value: number) => void;
  onPageChange: (value: number) => void;
  onMenuChange: (value: string | null) => void;
  setMenuAnchor: (anchor: MenuAnchor | null) => void;
  onEdit: (row: Record<string, any>) => void;
  onDetails?: (row: Record<string, any>) => void;
  onDeleteRequest: (row: Record<string, any>) => void;
  extraActions?: (row: Record<string, any>) => RowAction[];
  onRunAction: (action: RowAction) => void;
  disableEdit?: boolean;
  disableDelete?: boolean;
  statusConfig?: StatusConfig;
  onStatusRequest?: (row: Record<string, any>, nextStatus: 'ACTIVE' | 'SUSPENDED') => void;
}) {
  const t = useT();
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [filterSearch, setFilterSearch] = useState<Record<string, string>>({});
  const filterRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLElement | null>(null);
  const baseId = useId();

  // Texto plano de cada celda, calculado UNA vez por lista: lo usan la
  // búsqueda, los filtros, las etiquetas accesibles y el CSV. Antes se volvía
  // a renderizar cada celda en cada tecla del buscador.
  const cellText = useMemo(() => {
    const map = new Map<any, string[]>();
    for (const row of items) {
      map.set(row, columns.map((column) => getNodeText(column.render ? column.render(row) : row[column.key])));
    }
    return map;
  }, [items, columns]);
  const textOf = (row: any, index: number) => cellText.get(row)?.[index] ?? '';
  const rowLabel = (row: any) => textOf(row, 0) || t('table.thisRecord');

  // La búsqueda filtra con un valor diferido: escribir no se traba en listas grandes.
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();

  const filterOptions = useMemo(() => columns.reduce<Record<string, string[]>>((result, column, index) => {
    result[column.key] = [...new Set(items.map((row) => cellText.get(row)?.[index] ?? '').filter(Boolean))].slice(0, 50);
    return result;
  }, {}), [items, columns, cellText]);

  const filteredItems = useMemo(() => items.filter((row) => {
    const texts = cellText.get(row) ?? [];
    const matchesQuery = !normalizedQuery || texts.some((text) => text.toLowerCase().includes(normalizedQuery));
    const matchesFilters = columns.every((column, index) => {
      const selected = activeFilters[column.key] ?? [];
      return selected.length === 0 || selected.includes(texts[index]);
    });
    return matchesQuery && matchesFilters;
  }), [items, columns, cellText, normalizedQuery, activeFilters]);

  const activeFilterEntries = Object.entries(activeFilters).flatMap(([key, values]) => values.map((value) => ({ key, value })));
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const firstItem = filteredItems.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, filteredItems.length);
  const menuRow = menuId ? visibleItems.find((row) => String(row.id) === menuId) : undefined;
  const menuDomId = `${baseId}-row-menu`;

  const closeMenu = useCallback((reason?: 'escape' | 'outside' | 'scroll') => {
    onMenuChange(null);
    setMenuAnchor(null);
    // Con Escape el foco vuelve al botón que abrió el menú.
    if (reason === 'escape') menuTriggerRef.current?.focus();
  }, [onMenuChange, setMenuAnchor]);
  useDismiss(menuRef, Boolean(menuRow), closeMenu, { closeOnScroll: true });

  const closeFilter = useCallback(() => setOpenFilter(null), []);
  useDismiss(filterRef, openFilter !== null, closeFilter);

  // Al abrir el menú, el foco va a la primera opción (navegable con flechas).
  useEffect(() => {
    if (menuRow) menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus({ preventScroll: true });
  }, [menuRow]);

  function openMenu(event: React.MouseEvent<HTMLButtonElement>, row: any) {
    const id = String(row.id);
    if (menuId === id) { closeMenu(); return; }
    menuTriggerRef.current = event.currentTarget;
    const rect = event.currentTarget.getBoundingClientRect();
    // Alineado al borde derecho del botón, sin salirse de la pantalla.
    const x = Math.max(8, Math.min(rect.right - ROW_MENU_WIDTH, window.innerWidth - ROW_MENU_WIDTH - 8));
    const above = rect.bottom > window.innerHeight * 0.6;
    setMenuAnchor(above ? { x, y: window.innerHeight - rect.top + 8, above } : { x, y: rect.bottom + 8 });
    onMenuChange(id);
  }

  function onMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const index = items.indexOf(document.activeElement as HTMLElement);
    const go = (next: number) => { event.preventDefault(); items[(next + items.length) % items.length]?.focus(); };
    if (event.key === 'ArrowDown') go(index + 1);
    else if (event.key === 'ArrowUp') go(index - 1);
    else if (event.key === 'Home') go(0);
    else if (event.key === 'End') go(items.length - 1);
    else if (event.key === 'Tab') closeMenu();
  }

  function exportCsv() {
    // Exporta lo que se ve (con búsqueda y filtros) y en texto plano: antes
    // las celdas con insignias salían como "[object Object]".
    const rows = filteredItems.map((row) => columns.map((_, index) => textOf(row, index)));
    const csv = [columns.map((column) => column.label), ...rows]
      .map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    // BOM: Excel abre bien los acentos y la ñ.
    const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.toLowerCase().replace(/\s+/g, '-')}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const cellContent = (row: any, column: Column) => (column.render ? column.render(row) : String(row[column.key] ?? '—'));

  const detailsButton = (row: any, className?: string) => (
    <button
      type="button"
      className={cn('text-left font-medium text-amber-700 transition hover:text-amber-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded', className)}
      onClick={(event) => { event.stopPropagation(); onDetails?.(row); }}
    >
      {cellContent(row, columns[0])}
    </button>
  );

  const rowActions = (row: any) => {
    const id = String(row.id);
    const label = rowLabel(row);
    return (
      <div className="flex items-center justify-end gap-1">
        {(onDetails || !disableEdit) && (
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); if (onDetails) onDetails(row); else onEdit(row); }}
            aria-label={onDetails ? t('table.viewDetails', { id: label }) : t('table.editLabel', { label })}
            title={onDetails ? t('table.viewDetails', { id: label }) : t('table.editLabel', { label })}
            className={iconButton}
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          data-popover-trigger
          onClick={(event) => { event.stopPropagation(); openMenu(event, row); }}
          aria-label={t('table.rowActions', { id: label })}
          aria-haspopup="menu"
          aria-expanded={menuId === id}
          aria-controls={menuId === id ? menuDomId : undefined}
          className={cn(iconButton, menuId === id && 'bg-slate-100 text-slate-800')}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
    );
  };

  const statusCell = (row: any) => {
    if (!statusConfig) return null;
    const status = statusConfig.getStatus(row);
    return statusConfig.render ? statusConfig.render(status, row) : status;
  };

  const renderMenu = () => {
    if (!menuRow || !menuAnchor) return null;
    const row = menuRow;
    const actions = extraActions?.(row) ?? [];
    const safe = actions.filter((action) => !action.danger);
    const danger = actions.filter((action) => action.danger);
    const status = statusConfig && onStatusRequest ? statusConfig.getStatus(row) : null;
    const itemClass = 'flex w-full items-start gap-2.5 px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-none';
    const renderItem = (action: RowAction) => {
      const ActionIcon = action.icon;
      return (
        <button
          key={action.label}
          type="button"
          role="menuitem"
          tabIndex={-1}
          onClick={() => onRunAction(action)}
          className={cn(
            itemClass,
            action.danger
              ? 'text-red-600 hover:bg-red-50 focus-visible:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 dark:focus-visible:bg-red-500/10'
              : 'text-slate-700 hover:bg-slate-50 focus-visible:bg-slate-100',
            action.className,
          )}
        >
          {ActionIcon && <ActionIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
          <span className="min-w-0">
            <span className="block font-medium">{action.label}</span>
            {action.description && (
              <span className={cn('block text-xs leading-snug', action.danger ? 'text-red-500/80 dark:text-red-400/80' : 'text-slate-500')}>
                {action.description}
              </span>
            )}
          </span>
        </button>
      );
    };
    const showStatus = status !== null && ['ACTIVE', 'SUSPENDED'].includes(status);
    const hasSafe = safe.length > 0 || showStatus;
    const hasDanger = danger.length > 0 || !disableDelete;
    if (!hasSafe && !hasDanger) return null;
    return (
      <div
        ref={menuRef}
        id={menuDomId}
        role="menu"
        aria-label={t('table.rowActions', { id: rowLabel(row) })}
        onKeyDown={onMenuKeyDown}
        className="fixed z-50 rounded-lg border border-slate-200 bg-white py-1 text-left shadow-xl"
        style={{
          left: `${menuAnchor.x}px`,
          width: `${ROW_MENU_WIDTH}px`,
          ...(menuAnchor.above ? { bottom: `${menuAnchor.y}px` } : { top: `${menuAnchor.y}px` }),
        }}
      >
        {safe.map(renderItem)}
        {showStatus && (
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={() => onStatusRequest!(row, status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')}
            className={cn(itemClass, 'text-emerald-700 hover:bg-emerald-50 focus-visible:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10')}
          >
            <RefreshCw className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="font-medium">{status === 'ACTIVE' ? t('table.suspend') : t('table.reactivate')}</span>
          </button>
        )}
        {hasSafe && hasDanger && <div role="separator" className="my-1 border-t border-slate-200" />}
        {danger.map(renderItem)}
        {!disableDelete && (
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={() => { closeMenu(); onDeleteRequest(row); }}
            className={cn(itemClass, 'text-red-600 hover:bg-red-50 focus-visible:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 dark:focus-visible:bg-red-500/10')}
          >
            <Trash2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="font-medium">{t('common.delete')}</span>
          </button>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <label htmlFor={`${baseId}-size`}>{t('table.show')}</label>
          <span className="relative">
            <select
              id={`${baseId}-size`}
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="h-10 appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-9 text-sm text-slate-700 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            >
              {[10, 25, 50].map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-3 h-4 w-4 text-slate-500" aria-hidden="true" />
          </span>
          <span>{t('table.records')}</span>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={exportCsv}
            disabled={filteredItems.length === 0}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-amber-50 px-4 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:opacity-50 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {t('table.export')}
          </button>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder={t('table.search')}
              aria-label={t('table.searchLabel')}
              className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 sm:w-64"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3 sm:px-5">
        <SlidersHorizontal className="h-4 w-4 text-slate-400" aria-hidden="true" />
        {columns.map((column, columnIndex) => {
          const selectedCount = activeFilters[column.key]?.length ?? 0;
          const isOpen = openFilter === column.key;
          const popoverId = `${baseId}-filter-${columnIndex}`;
          const search = (filterSearch[column.key] ?? '').trim().toLowerCase();
          const options = (filterOptions[column.key] ?? []).filter((option) => option.toLowerCase().includes(search));
          return (
            <div key={column.key} className="relative">
              <button
                type="button"
                data-popover-trigger
                onClick={() => setOpenFilter(isOpen ? null : column.key)}
                aria-expanded={isOpen}
                aria-controls={isOpen ? popoverId : undefined}
                aria-label={selectedCount > 0 ? t('table.filterActive', { column: column.label, count: selectedCount }) : t('table.filterBy', { column: column.label })}
                className={`inline-flex min-h-8 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${selectedCount > 0 ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-600 hover:border-amber-200 hover:text-amber-700'}`}
              >
                {column.label}{selectedCount > 0 && <span className="rounded-full bg-amber-600 px-1.5 text-[10px] text-white" aria-hidden="true">{selectedCount}</span>}
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isOpen && 'rotate-180')} aria-hidden="true" />
              </button>
              {isOpen && (
                <div
                  ref={filterRef}
                  id={popoverId}
                  role="dialog"
                  aria-label={t('table.filterBy', { column: column.label })}
                  // En móvil ocupa el ancho de la pantalla para no salirse por la derecha.
                  className="fixed inset-x-4 z-40 mt-2 rounded-lg border border-slate-200 bg-white p-3 text-left shadow-xl sm:absolute sm:inset-x-auto sm:left-0 sm:top-full sm:w-64"
                >
                  <p className="mb-2 text-xs font-semibold text-slate-500">{t('table.filterBy', { column: column.label })}</p>
                  <input
                    type="search"
                    autoFocus
                    value={filterSearch[column.key] ?? ''}
                    onChange={(event) => setFilterSearch((current) => ({ ...current, [column.key]: event.target.value }))}
                    placeholder={t('table.searchColumn', { column: column.label.toLowerCase() })}
                    aria-label={t('table.searchColumnLabel', { column: column.label })}
                    className="mb-2 h-9 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                  />
                  <div className="max-h-52 space-y-1 overflow-y-auto">
                    {options.length === 0 ? <p className="py-2 text-xs text-slate-400">{t('table.noOptions')}</p> : options.map((option) => {
                      const checked = activeFilters[column.key]?.includes(option) ?? false;
                      return (
                        <button
                          key={option}
                          type="button"
                          aria-pressed={checked}
                          onClick={() => setActiveFilters((current) => {
                            const selected = current[column.key] ?? [];
                            return { ...current, [column.key]: checked ? selected.filter((value) => value !== option) : [...selected, option] };
                          })}
                          className={`flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${checked ? 'bg-amber-100 font-semibold text-amber-800' : 'text-slate-700 hover:bg-slate-50'}`}
                        >
                          <span className="truncate">{option}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button type="button" onClick={() => setOpenFilter(null)} className="mt-3 w-full rounded-md bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">{t('common.apply')}</button>
                </div>
              )}
            </div>
          );
        })}
        {activeFilterEntries.length > 0 && <>
          <div className="flex flex-wrap gap-1">
            {activeFilterEntries.map(({ key, value }) => (
              <button
                key={`${key}-${value}`}
                type="button"
                onClick={() => setActiveFilters((current) => ({ ...current, [key]: (current[key] ?? []).filter((item) => item !== value) }))}
                aria-label={t('table.removeFilter', { value })}
                className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs text-amber-800 hover:bg-amber-200"
              >
                <span>{value}</span><X className="h-3 w-3" aria-hidden="true" />
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setActiveFilters({})} className="ml-auto text-xs font-semibold text-slate-500 hover:text-red-600">{t('table.clearFilters')}</button>
        </>}
      </div>

      {/* Resultado de la búsqueda anunciado a lectores de pantalla */}
      <p className="sr-only" aria-live="polite">{t('table.showing', { from: firstItem, to: lastItem, total: filteredItems.length })}</p>

      {visibleItems.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-4 py-14 text-center text-sm text-slate-500">
          <Search className="h-6 w-6 text-slate-300" aria-hidden="true" />
          <p>{t('table.noResults')}</p>
          {(query || activeFilterEntries.length > 0) && (
            <button
              type="button"
              onClick={() => { onQueryChange(''); setActiveFilters({}); }}
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
            >
              {t('table.clearSearch')}
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Móvil y tablet: tarjetas (una tabla de 6+ columnas no cabe junto a la barra lateral) */}
          <ul className="divide-y divide-slate-100 lg:hidden">
            {visibleItems.map((row) => (
              <li key={String(row.id)} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 text-sm">
                    {onDetails ? detailsButton(row, 'text-base') : <p className="font-semibold text-slate-900">{cellContent(row, columns[0])}</p>}
                  </div>
                  <div className="-mr-2 -mt-1 shrink-0">{rowActions(row)}</div>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
                  {columns.slice(1).map((column, i) => (
                    // Valores largos (correos, direcciones) usan todo el ancho para no cortarse a mitad de palabra.
                    <div key={column.key} className={cn('min-w-0', textOf(row, i + 1).length > 22 && 'col-span-2')}>
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{column.label}</dt>
                      <dd className="mt-0.5 break-words text-slate-700">{cellContent(row, column)}</dd>
                    </div>
                  ))}
                  {statusConfig && (
                    <div className="min-w-0">
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('table.status')}</dt>
                      <dd className="mt-0.5">{statusCell(row)}</dd>
                    </div>
                  )}
                </dl>
              </li>
            ))}
          </ul>

          {/* Escritorio: tabla */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <caption className="sr-only">{title}</caption>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left uppercase tracking-wide text-slate-500">
                  {columns.map((column) => <th key={column.key} scope="col" className="px-4 py-3.5 text-xs font-semibold first:pl-5">{column.label}</th>)}
                  {statusConfig && <th scope="col" className="px-4 py-3.5 text-xs font-semibold">{t('table.status')}</th>}
                  <th scope="col" className="w-24 px-4 py-3.5 text-right text-xs font-semibold">{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((row) => (
                  <tr
                    key={String(row.id)}
                    // Clic en cualquier parte de la fila abre el detalle; para
                    // teclado está el botón del nombre (primera columna).
                    onClick={onDetails ? () => onDetails(row) : undefined}
                    className={cn('border-b border-slate-100 last:border-0 hover:bg-amber-50/30', onDetails && 'cursor-pointer')}
                  >
                    {columns.map((column, index) => (
                      <td key={column.key} className="px-4 py-3.5 text-slate-700 first:pl-5">
                        {index === 0 && onDetails ? detailsButton(row) : cellContent(row, column)}
                      </td>
                    ))}
                    {statusConfig && <td className="px-4 py-3.5">{statusCell(row)}</td>}
                    <td className="px-4 py-2 text-right" onClick={(event) => event.stopPropagation()}>
                      {rowActions(row)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {renderMenu()}

      <div className="flex flex-col items-center gap-3 border-t border-slate-200 px-4 py-4 text-sm text-slate-500 sm:flex-row sm:justify-between sm:px-5">
        <span>{t('table.showing', { from: firstItem, to: lastItem, total: filteredItems.length })}</span>
        {totalPages > 1 && (
          <nav className="flex items-center gap-1" aria-label={t('table.pagination')}>
            <button type="button" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)} aria-label={t('table.prevPage')} className={cn(iconButton, 'disabled:opacity-40')}><ChevronLeft className="h-4 w-4" aria-hidden="true" /></button>
            {pageWindow(currentPage, totalPages).map((pageNumber, i) => pageNumber === null ? (
              <span key={`gap-${i}`} className="px-1 text-slate-400" aria-hidden="true">…</span>
            ) : (
              <button
                type="button"
                key={pageNumber}
                onClick={() => onPageChange(pageNumber)}
                aria-label={t('table.goToPage', { page: pageNumber })}
                aria-current={pageNumber === currentPage ? 'page' : undefined}
                className={`h-9 min-w-9 rounded-lg px-2 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${pageNumber === currentPage ? 'bg-amber-600 text-white' : 'hover:bg-slate-100'}`}
              >
                {pageNumber}
              </button>
            ))}
            <button type="button" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)} aria-label={t('table.nextPage')} className={cn(iconButton, 'disabled:opacity-40')}><ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
          </nav>
        )}
      </div>
    </div>
  );
}
