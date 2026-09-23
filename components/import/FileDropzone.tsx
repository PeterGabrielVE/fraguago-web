'use client';
import { useRef, useState } from 'react';
import { FileSpreadsheet, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ACCEPTED_EXTENSIONS, MAX_FILE_MB } from '@/lib/imports';

// Zona de arrastrar y soltar (también se puede hacer clic o usar el teclado).
// Valida extensión y tamaño antes de subir nada.
export default function FileDropzone({
  onFile,
  disabled,
}: {
  onFile: (file: File) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  function accept(file: File | undefined) {
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
      setError(lower.endsWith('.xls')
        ? 'El formato .xls (Excel 97-2003) no está soportado: ábrelo en Excel y guárdalo como .xlsx.'
        : 'Formato no soportado: sube un archivo .xlsx o .csv.');
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`El archivo pesa ${(file.size / 1024 / 1024).toFixed(1)} MB; el máximo es ${MAX_FILE_MB} MB.`);
      return;
    }
    if (file.size === 0) {
      setError('El archivo está vacío.');
      return;
    }
    setError('');
    onFile(file);
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-label="Subir archivo Excel o CSV"
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); inputRef.current?.click(); }
        }}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) accept(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition outline-none',
          'focus-visible:ring-2 focus-visible:ring-amber-300',
          dragging ? 'border-amber-500 bg-amber-50' : 'border-slate-300 bg-white hover:border-amber-400 hover:bg-amber-50/40',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        <div className={cn('flex h-14 w-14 items-center justify-center rounded-full', dragging ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-700')}>
          {dragging ? <FileSpreadsheet className="h-7 w-7" /> : <UploadCloud className="h-7 w-7" />}
        </div>
        <div>
          <p className="text-base font-semibold text-slate-900">
            {dragging ? 'Suelta el archivo aquí' : 'Arrastra tu planilla o haz clic para elegirla'}
          </p>
          <p className="mt-1 text-sm text-slate-500">Excel (.xlsx) o CSV · máximo {MAX_FILE_MB} MB · hasta 5.000 filas</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          className="hidden"
          onChange={(e) => { accept(e.target.files?.[0]); e.target.value = ''; }}
        />
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
