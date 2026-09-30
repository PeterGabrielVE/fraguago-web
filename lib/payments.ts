import { ApiError, authorizedFetch } from '@/lib/api';
import { uploadWithProgress } from '@/lib/files';
import { tActive } from '@/lib/i18n/client';

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

type MethodFields = { reference?: string; bank?: boolean; phone?: boolean; payer?: boolean; receipt: boolean };

// Qué campos se piden según el método. `reference` es la etiqueta del campo (en el idioma activo).
export const METHOD_FIELDS: Record<PaymentMethod, MethodFields> = {
  // Efectivo: la referencia opcional es el serial de los billetes (alerta de billetes repetidos).
  CASH: { get reference() { return tActive('labels.paymentField.billSerial'); }, payer: true, receipt: false },
  PAGO_MOVIL: { get reference() { return tActive('labels.paymentField.reference'); }, bank: true, phone: true, receipt: true },
  TRANSFER: { get reference() { return tActive('labels.paymentField.reference'); }, bank: true, payer: true, receipt: true },
  ZELLE: { get reference() { return tActive('labels.paymentField.zelleCode'); }, payer: true, receipt: true },
  CARD: { get reference() { return tActive('labels.paymentField.approval'); }, bank: true, receipt: true },
  OTHER: { get reference() { return tActive('labels.paymentField.reference'); }, bank: true, payer: true, receipt: true },
};

// Bancos del sistema financiero venezolano con su código (el de Pago Móvil y
// transferencias), en orden de código.
export const VE_BANKS: { code: string; name: string }[] = [
  { code: '0102', name: 'Banco de Venezuela' },
  { code: '0104', name: 'Venezolano de Crédito' },
  { code: '0105', name: 'Mercantil' },
  { code: '0108', name: 'Provincial (BBVA)' },
  { code: '0114', name: 'Bancaribe' },
  { code: '0115', name: 'Banco Exterior' },
  { code: '0128', name: 'Banco Caroní' },
  { code: '0134', name: 'Banesco' },
  { code: '0137', name: 'Sofitasa' },
  { code: '0138', name: 'Banco Plaza' },
  { code: '0146', name: 'Bangente' },
  { code: '0151', name: 'BFC Banco Fondo Común' },
  { code: '0156', name: '100% Banco' },
  { code: '0157', name: 'DelSur' },
  { code: '0163', name: 'Banco del Tesoro' },
  { code: '0166', name: 'Banco Agrícola de Venezuela' },
  { code: '0168', name: 'Bancrecer' },
  { code: '0169', name: 'R4 (Mi Banco)' },
  { code: '0171', name: 'Banco Activo' },
  { code: '0172', name: 'Bancamiga' },
  { code: '0173', name: 'Banco Internacional de Desarrollo' },
  { code: '0174', name: 'Banplus' },
  { code: '0175', name: 'Banco Digital de los Trabajadores (Bicentenario)' },
  { code: '0177', name: 'Banfanb' },
  { code: '0178', name: 'N58 Banco Digital' },
  { code: '0191', name: 'BNC (Banco Nacional de Crédito)' },
  { code: '0601', name: 'Instituto Municipal de Crédito Popular' },
];

// Plataformas y billeteras digitales con las que también pagan los socios.
export const PAYMENT_PLATFORMS = [
  'Zelle', 'PayPal', 'Binance Pay', 'Zinli', 'Wally', 'Reserve', 'AirTM', 'Wise', 'Skrill', 'Payoneer', 'Uphold',
];

const normalize = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

// Busca el banco o plataforma de la lista que corresponde a un texto libre
// (OCR, datos viejos): por código ("0134"), nombre exacto o nombre contenido.
// Devuelve el texto tal cual si no reconoce ninguno.
export function matchBank(text: string): string {
  const q = normalize(text);
  if (!q) return '';
  const names = [...VE_BANKS.map((b) => b.name), ...PAYMENT_PLATFORMS];
  const byCode = VE_BANKS.find((b) => q.includes(b.code));
  if (byCode) return byCode.name;
  const exact = names.find((n) => normalize(n) === q);
  if (exact) return exact;
  // El texto contiene el nombre ("Pago a Banesco Banco Universal") o, si es
  // específico, es parte de un único nombre ("provincial" → "Provincial (BBVA)").
  const core = (n: string) => normalize(n).replace(/\s*\(.*\)/, '');
  const contained = names.find((n) => q.includes(core(n)));
  if (contained) return contained;
  const partial = q.length >= 4 ? names.filter((n) => normalize(n).includes(q)) : [];
  return partial.length === 1 ? partial[0] : text.trim();
}

export function emptyPayment(amount = '', currency = 'USD'): PaymentValue {
  return {
    paymentMethod: 'CASH', paymentReference: '', paymentBank: '', payerPhone: '', payerName: '',
    amount, currency, exchangeRate: '',
  };
}

// Limpia la referencia como lo hace el API (pago móvil = solo dígitos;
// efectivo = seriales de billetes separados por coma).
export function normalizeReference(method: PaymentMethod, ref: string) {
  if (method === 'PAGO_MOVIL') return ref.replace(/\D/g, '');
  if (method === 'CASH') return billSerials(ref).join(', ');
  return ref.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function billSerials(ref: string) {
  return ref.split(/[,;\n]+/).map((s) => s.toUpperCase().replace(/[^A-Z0-9]/g, '')).filter(Boolean);
}

// Ejemplo para el campo de referencia según el método.
export function referencePlaceholder(method: PaymentMethod | '' | undefined): string | undefined {
  if (method === 'PAGO_MOVIL') return tActive('payments.fields.referencePlaceholder');
  if (method === 'CASH') return tActive('labels.paymentField.billSerialPlaceholder');
  return undefined;
}

export function validatePayment(p: PaymentValue): string | null {
  const ref = normalizeReference(p.paymentMethod, p.paymentReference);
  if (REFERENCE_REQUIRED.includes(p.paymentMethod) && !ref) return tActive('labels.paymentError.referenceRequired');
  if (p.paymentMethod === 'PAGO_MOVIL' && ref && !/^\d{4,20}$/.test(ref)) return tActive('labels.paymentError.pagoMovilDigits');
  if (p.paymentMethod === 'CASH' ? billSerials(ref).some((s) => s.length < 4) : ref && ref.length < 4) {
    return tActive(p.paymentMethod === 'CASH' ? 'labels.paymentError.billSerialShort' : 'labels.paymentError.referenceShort');
  }
  if (p.amount !== '' && !(Number(p.amount) > 0)) return tActive('labels.paymentError.amountPositive');
  if (p.exchangeRate !== '' && !(Number(p.exchangeRate) > 0)) return tActive('labels.paymentError.ratePositive');
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
  if (!bitmap) throw new Error(tActive('labels.paymentError.imageRead'));
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error(tActive('labels.paymentError.imageProcess'));
  ctx.fillStyle = '#fff'; // fondo blanco para PNG con transparencia
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error(tActive('labels.paymentError.imageCompress')))), 'image/jpeg', quality),
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
  if (!res.ok) throw new ApiError(tActive('labels.paymentError.receiptLoad'), res.status);
  return URL.createObjectURL(await res.blob());
}
