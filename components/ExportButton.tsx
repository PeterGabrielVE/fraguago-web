'use client';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/toast';
import { useT } from '@/components/I18nProvider';
import { downloadExport, type ExportFormat, type ExportResource } from '@/lib/files';

// MIG-F02 — botón "Exportar" (Excel/CSV) que respeta los filtros de la vista.
export default function ExportButton({
  resource,
  filters = {},
  label,
}: {
  resource: ExportResource;
  filters?: Record<string, string | undefined | null>;
  label?: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Cierra el menú al hacer clic afuera o con Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); ref.current?.querySelector<HTMLButtonElement>('button')?.focus(); }
    };
    // Al abrir, el foco va a la primera opción.
    ref.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus({ preventScroll: true });
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function run(format: ExportFormat) {
    setOpen(false);
    setBusy(format);
    try {
      await downloadExport(resource, format, filters);
    } catch (e: any) {
      toast.add({ title: t('labels.files.exportFailed'), description: e.message, type: 'error' });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={busy !== null}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-busy={busy !== null}
        className="inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
        {busy ? t('attendance.export.generating') : label ?? t('attendance.export.label')}
        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" className="absolute left-0 z-20 mt-1 w-48 sm:left-auto sm:right-0 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <button role="menuitem" type="button" onClick={() => run('xlsx')} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 focus-visible:bg-slate-100 focus-visible:outline-none">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Excel (.xlsx)
          </button>
          <button role="menuitem" type="button" onClick={() => run('csv')} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 focus-visible:bg-slate-100 focus-visible:outline-none">
            <FileText className="h-4 w-4 text-slate-500" /> CSV (.csv)
          </button>
        </div>
      )}
    </div>
  );
}
