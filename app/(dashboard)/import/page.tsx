'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  History,
  Loader2,
  RotateCcw,
  Upload,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import { toast } from '@/components/ui/toast';
import FileDropzone from '@/components/import/FileDropzone';
import ColumnMapping from '@/components/import/ColumnMapping';
import ImportPreviewTable from '@/components/import/ImportPreviewTable';
import FileChecksCard from '@/components/import/FileChecksCard';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { downloadCsv, uploadWithProgress } from '@/lib/files';
import {
  BATCH_SIZE,
  COMMIT_STATUS_LABELS,
  IMPORT_TYPE_LABELS,
  importableRows,
  type CommitResult,
  type ImportJob,
  type ImportPreview,
  type ImportType,
} from '@/lib/imports';

type Step = 'select' | 'preview' | 'importing' | 'done';

const TYPES: { type: ImportType; icon: typeof Users; title: string; description: string }[] = [
  {
    type: 'MEMBERS_PAYMENTS',
    icon: Users,
    title: 'Socios y pagos',
    description: 'Hoja tipo "Control de Pagos": ID, nombre, plan, fecha de pago, monto, estado…',
  },
  {
    type: 'ATTENDANCE',
    icon: CalendarDays,
    title: 'Asistencia',
    description: 'Cuadrícula con columnas "Día 1" … "Día 31" marcadas con X. Importa primero los socios.',
  },
];

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// MIG-F01 — importación masiva desde Excel/CSV.
export default function ImportPage() {
  const now = new Date();
  const [type, setType] = useState<ImportType>('MEMBERS_PAYMENTS');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [step, setStep] = useState<Step>('select');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [options, setOptions] = useState({ createMissingPlans: true, updateExisting: true });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<CommitResult[]>([]);
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const cancelRef = useRef(false);

  const loadJobs = useCallback(() => {
    api.get('/imports/jobs').then((j) => setJobs(j as ImportJob[])).catch(() => {});
  }, []);
  useEffect(() => { loadJobs(); }, [loadJobs]);

  // Evita cerrar la pestaña a mitad de una importación.
  useEffect(() => {
    if (step !== 'importing') return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [step]);

  async function analyze(f: File, extra: { sheet?: string; mapping?: Record<string, number | null> } = {}) {
    setError('');
    setAnalyzing(true);
    setUploadPct(0);
    const form = new FormData();
    form.append('type', type);
    if (type === 'ATTENDANCE') { form.append('year', String(year)); form.append('month', String(month)); }
    if (extra.sheet) form.append('sheet', extra.sheet);
    if (extra.mapping) form.append('mapping', JSON.stringify(extra.mapping));
    form.append('file', f);
    try {
      const result = await uploadWithProgress<ImportPreview>('/imports/preview', form, setUploadPct);
      setPreview(result);
      setStep('preview');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAnalyzing(false);
      setUploadPct(null);
    }
  }

  function onFile(f: File) {
    setFile(f);
    analyze(f);
  }

  async function runImport() {
    if (!preview || !file) return;
    setConfirmOpen(false);
    const rows = importableRows(preview).map((r) => r.data!);
    cancelRef.current = false;
    setResults([]);
    setProgress({ done: 0, total: rows.length });
    setStep('importing');

    let job: ImportJob;
    try {
      job = (await api.post('/imports/jobs', { type: preview.type, fileName: preview.fileName, totalRows: rows.length })) as ImportJob;
    } catch (e: any) {
      toast.add({ title: 'No se pudo iniciar la importación', description: e.message, type: 'error' });
      setStep('preview');
      return;
    }

    const all: CommitResult[] = [];
    const endpoint = preview.type === 'MEMBERS_PAYMENTS' ? 'members' : 'attendance';
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      if (cancelRef.current) break;
      const batch = rows.slice(i, i + BATCH_SIZE);
      try {
        const body = preview.type === 'MEMBERS_PAYMENTS' ? { rows: batch, options } : { rows: batch };
        const res = (await api.post(`/imports/jobs/${job.id}/${endpoint}`, body)) as { results: CommitResult[] };
        all.push(...res.results);
      } catch (e: any) {
        // Un lote rechazado (red, validación) no frena el resto: se reporta.
        all.push(...batch.map((r) => ({ row: r.row, status: 'FAILED' as const, message: e.message })));
      }
      setResults([...all]);
      setProgress({ done: Math.min(i + BATCH_SIZE, rows.length), total: rows.length });
    }

    await api.post(`/imports/jobs/${job.id}/finish`, {}).catch(() => {});
    setStep('done');
    loadJobs();
  }

  function reset() {
    setStep('select');
    setFile(null);
    setPreview(null);
    setResults([]);
    setError('');
  }

  const importable = preview ? importableRows(preview).length : 0;
  const count = (s: CommitResult['status']) => results.filter((r) => r.status === s).length;
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-600 text-white">
          <Upload className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Importar datos</h1>
          <p className="text-sm text-slate-500">Carga masiva de socios, pagos y asistencia desde Excel o CSV.</p>
        </div>
      </div>

      {/* Paso 1: tipo + archivo */}
      {step === 'select' && (
        <div className="space-y-5">
          <div role="radiogroup" aria-label="Qué vas a importar" className="grid gap-3 md:grid-cols-2">
            {TYPES.map((t) => {
              const Icon = t.icon;
              const selected = type === t.type;
              return (
                <button
                  key={t.type}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setType(t.type)}
                  className={cn(
                    'flex items-start gap-3 rounded-xl border p-4 text-left transition',
                    selected ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-200' : 'border-slate-200 bg-white hover:border-slate-300',
                  )}
                >
                  <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', selected ? 'text-amber-700' : 'text-slate-400')} />
                  <span>
                    <span className="block font-semibold text-slate-900">{t.title}</span>
                    <span className="block text-sm text-slate-500">{t.description}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {type === 'ATTENDANCE' && (
            <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <p className="w-full text-sm text-slate-600">La planilla no indica el mes: ¿de qué mes son las asistencias?</p>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-slate-700">Mes</span>
                <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="rounded-lg border border-slate-300 bg-white px-3 py-2">
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-slate-700">Año</span>
                <input type="number" min={2000} max={2100} value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-28 rounded-lg border border-slate-300 px-3 py-2" />
              </label>
            </div>
          )}

          <FileDropzone onFile={onFile} disabled={analyzing} />

          {analyzing && (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600" role="status">
              <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
              {uploadPct !== null && uploadPct < 100 ? `Subiendo ${file?.name}… ${uploadPct}%` : `Analizando ${file?.name}…`}
            </div>
          )}
          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}
            </div>
          )}
        </div>
      )}

      {/* Paso 2: vista previa */}
      {step === 'preview' && preview && file && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-emerald-600" />
              <div>
                <p className="font-semibold text-slate-900">{preview.fileName}</p>
                <p className="text-xs text-slate-500">
                  {IMPORT_TYPE_LABELS[preview.type]}
                  {preview.type === 'ATTENDANCE' && ` · ${MONTHS[month - 1]} ${year}`}
                  {' · '}encabezados en la fila {preview.headerRow}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {preview.sheets.length > 1 && (
                <label className="text-sm text-slate-600">
                  Hoja:{' '}
                  <select
                    value={preview.sheet}
                    disabled={analyzing}
                    onChange={(e) => analyze(file, { sheet: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1.5"
                  >
                    {preview.sheets.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
                  </select>
                </label>
              )}
              <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                <RotateCcw className="h-4 w-4" /> Otro archivo
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {([
              ['Nuevos', preview.summary.NEW, 'text-emerald-700'],
              ['Existentes', preview.summary.EXISTING, 'text-sky-700'],
              ['Con error', preview.summary.ERROR, 'text-red-700'],
              ['Duplicados', preview.summary.DUPLICATE, 'text-amber-700'],
              ['Ignorados', preview.summary.IGNORED, 'text-slate-500'],
            ] as const).map(([label, value, color]) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-medium text-slate-500">{label}</p>
                <p className={cn('text-2xl font-bold', color)}>{value}</p>
              </div>
            ))}
          </div>

          {preview.checks && <FileChecksCard checks={preview.checks} />}

          <ColumnMapping preview={preview} busy={analyzing} onApply={(mapping) => analyze(file, { sheet: preview.sheet, mapping })} />

          {preview.type === 'MEMBERS_PAYMENTS' && (
            <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-xl border border-slate-200 bg-white p-4 text-sm">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 accent-amber-600" checked={options.createMissingPlans}
                  onChange={(e) => setOptions((o) => ({ ...o, createMissingPlans: e.target.checked }))} />
                Crear planes que no existan (con la tarifa y los días del archivo)
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 accent-amber-600" checked={options.updateExisting}
                  onChange={(e) => setOptions((o) => ({ ...o, updateExisting: e.target.checked }))} />
                Completar datos vacíos de socios existentes (ID, teléfono, email provisional)
              </label>
            </div>
          )}

          <ImportPreviewTable key={`${preview.sheet}-${JSON.stringify(preview.mapping)}`} preview={preview} />

          <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
            <p className="text-sm text-slate-600">
              Se importarán <span className="font-semibold text-slate-900">{importable}</span> fila(s).
              {preview.summary.ERROR > 0 && <span className="text-red-700"> Las {preview.summary.ERROR} con error se omiten: corrígelas en el archivo y vuelve a subirlo.</span>}
            </p>
            <button
              type="button"
              disabled={!importable || analyzing}
              onClick={() => setConfirmOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              <Upload className="h-4 w-4" /> Importar {importable} fila(s)
            </button>
          </div>
        </div>
      )}

      {/* Paso 3 y 4: progreso y resultado */}
      {(step === 'importing' || step === 'done') && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              {step === 'importing'
                ? <><Loader2 className="h-5 w-5 animate-spin text-amber-600" />Importando…</>
                : <><CheckCircle2 className="h-5 w-5 text-emerald-600" />Importación terminada{cancelRef.current ? ' (cancelada)' : ''}</>}
            </h2>
            {step === 'importing' ? (
              <button type="button" onClick={() => { cancelRef.current = true; }} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                Cancelar
              </button>
            ) : (
              <button type="button" onClick={reset} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700">
                Nueva importación
              </button>
            )}
          </div>

          <div>
            <div className="mb-1 flex justify-between text-xs text-slate-600">
              <span>{progress.done} de {progress.total} filas</span>
              <span>{pct}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Progreso de la importación">
              <div className="h-full rounded-full bg-amber-500 transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(['CREATED', 'UPDATED', 'SKIPPED', 'FAILED'] as const).map((s) => (
              <div key={s} className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">{COMMIT_STATUS_LABELS[s]}</p>
                <p className={cn('text-xl font-bold', s === 'FAILED' && count(s) ? 'text-red-700' : 'text-slate-900')}>{count(s)}</p>
              </div>
            ))}
          </div>

          {step === 'done' && results.some((r) => r.status === 'FAILED' || r.status === 'SKIPPED') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">Filas omitidas o con error</p>
                <button
                  type="button"
                  onClick={() => downloadCsv(
                    `reporte_importacion_${new Date().toISOString().slice(0, 10)}.csv`,
                    ['Fila', 'Resultado', 'Detalle'],
                    results.map((r) => [r.row, COMMIT_STATUS_LABELS[r.status], r.message]),
                  )}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 hover:text-amber-800"
                >
                  <Download className="h-4 w-4" /> Descargar reporte completo
                </button>
              </div>
              <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200 text-sm">
                {results.filter((r) => r.status === 'FAILED' || r.status === 'SKIPPED').map((r) => (
                  <li key={r.row} className="flex gap-3 px-3 py-2">
                    <span className="w-14 shrink-0 text-slate-500">Fila {r.row}</span>
                    <span className={r.status === 'FAILED' ? 'text-red-700' : 'text-slate-600'}>{r.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Historial */}
      {jobs.length > 0 && step !== 'importing' && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <h2 className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-900">
            <History className="h-4 w-4 text-amber-600" /> Importaciones anteriores
          </h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {jobs.map((j) => (
              <li key={j.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                <div>
                  <p className="font-medium text-slate-900">{j.fileName}</p>
                  <p className="text-xs text-slate-500">{IMPORT_TYPE_LABELS[j.type]} · {new Date(j.startedAt).toLocaleString('es-MX')}</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-600">
                  <span>{j.created} creados · {j.updated} actualizados · {j.skipped} omitidos · {j.failed} con error</span>
                  <Badge variant="outline" className={j.status === 'COMPLETED' ? 'border-transparent bg-emerald-100 text-emerald-700' : 'border-transparent bg-amber-100 text-amber-700'}>
                    {j.status === 'COMPLETED' ? 'Completada' : j.status === 'RUNNING' ? 'Incompleta' : 'Falló'}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar importación</AlertDialogTitle>
            <AlertDialogDescription>
              Se procesarán {importable} fila(s) de <span className="font-medium text-foreground">{preview?.fileName}</span>.
              Los socios que ya existen no se duplican y los pagos ya importados se omiten, así que puedes volver a
              importar el mismo archivo sin riesgo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={runImport}>Importar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
