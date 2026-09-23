// Tipos de la importación masiva (MIG-B01/B02). Contrato con fraguago-api: `/imports/**`.

export type ImportType = 'MEMBERS_PAYMENTS' | 'ATTENDANCE';
export type RowStatus = 'NEW' | 'EXISTING' | 'DUPLICATE' | 'ERROR' | 'IGNORED';
export type CommitStatus = 'CREATED' | 'UPDATED' | 'SKIPPED' | 'FAILED';

export type MemberRowData = {
  row: number;
  externalId?: string;
  firstName: string;
  lastName: string;
  identificationNumber?: string;
  email?: string;
  phone?: string;
  planName?: string;
  price?: number;
  paymentDate?: string;
  validDays?: number;
  dueDate?: string;
  amount?: number;
  amountBs?: number;
  paymentStatus?: 'PAID' | 'PENDING';
  notes?: string;
};

export type AttendanceRowData = {
  row: number;
  externalId?: string;
  fullName?: string;
  dates: string[];
};

export type PreviewRow = {
  row: number;
  status: RowStatus;
  data: (MemberRowData | AttendanceRowData) | null;
  errors: string[];
  warnings: string[];
  match?: { memberId: string; name: string; by: string } | null;
};

export type ImportPreview = {
  type: ImportType;
  fileName: string;
  sheets: { name: string; rows: number; score: number }[];
  sheet: string;
  headerRow: number;
  columns: { index: number; header: string; samples: string[] }[];
  fields: { key: string; label: string; required: boolean }[];
  mapping: Record<string, number | null>;
  summary: Record<RowStatus | 'total', number>;
  checks: FileChecks;
  rows: PreviewRow[];
};

// Filas de resumen de la planilla (totales, gastos…) y verificación del total.
export type FileChecks = {
  totals: {
    row: number;
    declaredAmount: number | null;
    declaredAmountBs: number | null;
    computedAmount: number;
    computedAmountBs: number;
    rowsCounted: number;
    matches: boolean;
  } | null;
  summaryRows: { row: number; text: string }[];
};

export type CommitResult = { row: number; status: CommitStatus; message: string };

export type ImportJob = {
  id: string;
  type: ImportType;
  fileName: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  totalRows: number;
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  startedAt: string;
  finishedAt: string | null;
};

export const IMPORT_TYPE_LABELS: Record<ImportType, string> = {
  MEMBERS_PAYMENTS: 'Socios y pagos',
  ATTENDANCE: 'Asistencia',
};

export const ROW_STATUS_LABELS: Record<RowStatus, string> = {
  NEW: 'Nuevo',
  EXISTING: 'Existente',
  DUPLICATE: 'Duplicado',
  ERROR: 'Error',
  IGNORED: 'Ignorado',
};

export const ROW_STATUS_BADGES: Record<RowStatus, string> = {
  NEW: 'border-transparent bg-emerald-100 text-emerald-700',
  EXISTING: 'border-transparent bg-sky-100 text-sky-700',
  DUPLICATE: 'border-transparent bg-amber-100 text-amber-700',
  ERROR: 'border-transparent bg-red-100 text-red-700',
  IGNORED: 'border-transparent bg-slate-100 text-slate-500',
};

export const COMMIT_STATUS_LABELS: Record<CommitStatus, string> = {
  CREATED: 'Creado',
  UPDATED: 'Actualizado',
  SKIPPED: 'Omitido',
  FAILED: 'Falló',
};

// Solo se envían las filas válidas (nuevas o existentes).
export function importableRows(preview: ImportPreview) {
  return preview.rows.filter((r) => (r.status === 'NEW' || r.status === 'EXISTING') && r.data);
}

export const ACCEPTED_EXTENSIONS = ['.xlsx', '.csv'];
export const MAX_FILE_MB = 5;
export const BATCH_SIZE = 25;
