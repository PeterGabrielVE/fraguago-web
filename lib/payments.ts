import { ApiError, authorizedFetch } from '@/lib/api';
import { uploadWithProgress } from '@/lib/files';

export type PaymentMethod = 'CASH' | 'PAGO_MOVIL' | 'TRANSFER' | 'ZELLE' | 'CARD' | 'OTHER';

// Datos del pago que se envían al API (asignar/renovar membresía, etc.).
export type PaymentValue = {
  paymentMethod: PaymentMethod;
  paymentReference: string;
  paymentBank: string;
  payerPhone: string;
  payerName: string;
  amount: string;
  currency: string;
  exchangeRate: string;
};

export type OcrResult = {
  isPaymentReceipt: boolean;
  paymentMethod: PaymentMethod | null;
  reference: string | null;
  amount: number | null;
  currency: 'VES' | 'USD' | 'EUR' | null;
  bank: string | null;
  payerPhone: string | null;
  payerName: string | null;
  date: string | null;
  confidence: number;
};

// Métodos con número de referencia obligatorio (igual que el API).
export const REFERENCE_REQUIRED: PaymentMethod[] = ['PAGO_MOVIL', 'TRANSFER'];

// Qué campos se piden según el método.
export const METHOD_FIELDS: Record<PaymentMethod, { reference?: string; bank?: boolean; phone?: boolean; payer?: boolean; receipt: boolean }> = {
  CASH: { receipt: false },
  PAGO_MOVIL: { reference: 'Referencia', bank: true, phone: true, receipt: true },
  TRANSFER: { reference: 'Referencia', bank: true, payer: true, receipt: true },
  ZELLE: { reference: 'Código de confirmación', payer: true, receipt: true },
  CARD: { reference: 'Nº de aprobación', bank: true, receipt: true },
  OTHER: { reference: 'Referencia', payer: true, receipt: true },
};

// Bancos más usados en Venezuela (sugerencias; se puede escribir otro).
export const VE_BANKS = [
  'Banco de Venezuela', 'Banesco', 'Mercantil', 'Provincial (BBVA)', 'BNC', 'Bancamiga', 'Bancaribe',
  'Banco Exterior', 'Banco del Tesoro', 'Bicentenario', 'Banplus', 'Banco Plaza', 'Sofitasa',
  'Banco Activo', 'Venezolano de Crédito', '100% Banco', 'Del Sur', 'Mi Banco', 'Bancrecer', 'Banfanb',
];

export function emptyPayment(amount = '', currency = 'USD'): PaymentValue {
  return {
    paymentMethod: 'CASH', paymentReference: '', paymentBank: '', payerPhone: '', payerName: '',
    amount, currency, exchangeRate: '',
  };
}

// Limpia la referencia como lo hace el API (pago móvil = solo dígitos).
export function normalizeReference(method: PaymentMethod, ref: string) {
  return method === 'PAGO_MOVIL' ? ref.replace(/\D/g, '') : ref.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function validatePayment(p: PaymentValue): string | null {
  const ref = normalizeReference(p.paymentMethod, p.paymentReference);
  if (REFERENCE_REQUIRED.includes(p.paymentMethod) && !ref) return 'Indica el número de referencia del pago.';
  if (p.paymentMethod === 'PAGO_MOVIL' && ref && !/^\d{4,20}$/.test(ref)) return 'La referencia del pago móvil debe tener entre 4 y 20 dígitos.';
  if (ref && ref.length < 4) return 'La referencia debe tener al menos 4 caracteres.';
  if (p.amount !== '' && !(Number(p.amount) > 0)) return 'El monto debe ser mayor a 0.';
  if (p.exchangeRate !== '' && !(Number(p.exchangeRate) > 0)) return 'La tasa debe ser mayor a 0.';
  return null;
}

// Cuerpo para el API: solo campos con valor y que aplican al método.
export function paymentPayload(p: PaymentValue, receiptId?: string) {
  const fields = METHOD_FIELDS[p.paymentMethod];
  const ref = normalizeReference(p.paymentMethod, p.paymentReference);
  return {
    paymentMethod: p.paymentMethod,
    ...(fields.reference && ref ? { paymentReference: ref } : {}),
    ...(fields.bank && p.paymentBank.trim() ? { paymentBank: p.paymentBank.trim() } : {}),
    ...(fields.phone && p.payerPhone.trim() ? { payerPhone: p.payerPhone.trim() } : {}),
    ...(fields.payer && p.payerName.trim() ? { payerName: p.payerName.trim() } : {}),
    ...(p.amount !== '' ? { amount: Number(p.amount) } : {}),
    ...(p.currency ? { currency: p.currency } : {}),
    ...(p.exchangeRate !== '' ? { exchangeRate: Number(p.exchangeRate) } : {}),
    ...(receiptId ? { receiptId } : {}),
  };
}

// Reduce la foto en el navegador (máx. 1600 px, JPEG 0.82): una captura de
// 4 MB queda en ~200-400 KB, sube rápido y el OCR la lee igual de bien.
export async function compressImage(file: File, maxSide = 1600, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error('No se pudo leer la imagen. Usa una foto JPG o PNG.');
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('El navegador no pudo procesar la imagen.');
  ctx.fillStyle = '#fff'; // fondo blanco para PNG con transparencia
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo comprimir la imagen'))), 'image/jpeg', quality),
  );
}

function asForm(image: Blob) {
  const form = new FormData();
  form.append('file', image, 'comprobante.jpg');
  return form;
}

export function readReceipt(image: Blob) {
  return uploadWithProgress<OcrResult>('/payments/ocr', asForm(image), () => {});
}

export function uploadReceipt(image: Blob) {
  return uploadWithProgress<{ id: string }>('/payments/receipts', asForm(image), () => {});
}

// URL local (blob:) para mostrar un comprobante guardado; el API exige el
// header Authorization, por eso no se usa la URL directa en un <img>.
export async function receiptObjectUrl(id: string): Promise<string> {
  const res = await authorizedFetch(`/payments/receipts/${id}`);
  if (!res.ok) throw new ApiError('No se pudo cargar el comprobante', res.status);
  return URL.createObjectURL(await res.blob());
}
