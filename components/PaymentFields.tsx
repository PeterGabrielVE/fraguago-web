'use client';
import { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, ScanText, Sparkles, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CURRENCY_OPTIONS, PAYMENT_METHOD_OPTIONS } from '@/lib/currency';
import {
  METHOD_FIELDS,
  VE_BANKS,
  compressImage,
  normalizeReference,
  readReceipt,
  type OcrResult,
  type PaymentMethod,
  type PaymentValue,
} from '@/lib/payments';

export type ReceiptState = { image: Blob | null; previewUrl: string | null; save: boolean };

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200';

// Datos del pago con captura del comprobante: al elegir la foto se comprime,
// se lee con OCR y se autocompletan método, referencia, banco, monto… El
// staff revisa y corrige antes de guardar. Guardar la foto es opcional.
export default function PaymentFields({
  value,
  onChange,
  receipt,
  onReceiptChange,
}: {
  value: PaymentValue;
  onChange: (v: PaymentValue) => void;
  receipt: ReceiptState;
  onReceiptChange: (r: ReceiptState) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const [ocr, setOcr] = useState<OcrResult | null>(null);
  const [ocrError, setOcrError] = useState('');
  const fields = METHOD_FIELDS[value.paymentMethod];
  const set = (patch: Partial<PaymentValue>) => onChange({ ...value, ...patch });

  // Libera la URL de la vista previa al cambiarla o desmontar.
  useEffect(() => () => { if (receipt.previewUrl) URL.revokeObjectURL(receipt.previewUrl); }, [receipt.previewUrl]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setOcrError('');
    setOcr(null);
    let image: Blob;
    try {
      image = await compressImage(file);
    } catch (e: any) {
      setOcrError(e.message);
      return;
    }
    onReceiptChange({ ...receipt, image, previewUrl: URL.createObjectURL(image) });

    setReading(true);
    try {
      const result = await readReceipt(image);
      setOcr(result);
      // Una captura implica un pago no en efectivo: si el OCR no reconoce el
      // método, se mantiene el elegido (o pago móvil si estaba en efectivo).
      const detected = result.paymentMethod && result.paymentMethod !== 'CASH' ? result.paymentMethod : null;
      const method: PaymentMethod = detected ?? (value.paymentMethod === 'CASH' ? 'PAGO_MOVIL' : value.paymentMethod);
      onChange({
        ...value,
        paymentMethod: method,
        paymentReference: result.reference ? normalizeReference(method, result.reference) : value.paymentReference,
        paymentBank: result.bank ?? value.paymentBank,
        payerPhone: result.payerPhone ?? value.payerPhone,
        payerName: result.payerName ?? value.payerName,
        ...(result.amount ? { amount: String(result.amount) } : {}),
        ...(result.currency ? { currency: result.currency } : {}),
      });
    } catch (e: any) {
      setOcrError(e.message ?? 'No se pudo leer el comprobante. Completa los datos a mano.');
    } finally {
      setReading(false);
    }
  }

  function removeImage() {
    onReceiptChange({ ...receipt, image: null, previewUrl: null });
    setOcr(null);
    setOcrError('');
  }

  const foreignCurrency = value.currency && value.currency !== 'USD';

  return (
    <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4">
      <legend className="px-1 text-sm font-semibold text-slate-800">Pago</legend>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm sm:col-span-1">
          <span className="mb-1 block font-medium text-slate-700">Método</span>
          <select
            value={value.paymentMethod}
            onChange={(e) => set({ paymentMethod: e.target.value as PaymentMethod })}
            className={inputClass}
          >
            {PAYMENT_METHOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Monto pagado</span>
          <input type="number" min="0" step="0.01" value={value.amount} onChange={(e) => set({ amount: e.target.value })} className={inputClass} placeholder="Precio del plan" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Moneda</span>
          <select value={value.currency} onChange={(e) => set({ currency: e.target.value })} className={inputClass}>
            {CURRENCY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      </div>

      {foreignCurrency && (
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Tasa del día (opcional)</span>
          <input type="number" min="0" step="0.0001" value={value.exchangeRate} onChange={(e) => set({ exchangeRate: e.target.value })} className={inputClass} placeholder="Si se deja vacío, se usa la última tasa registrada" />
        </label>
      )}

      {fields.receipt && (
        <div className="rounded-lg border border-dashed border-slate-300 p-3">
          {!receipt.image ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-amber-700 hover:bg-amber-50"
            >
              <Camera className="h-4 w-4" /> Cargar captura del comprobante (lee los datos automáticamente)
            </button>
          ) : (
            <div className="flex items-start gap-3">
              {receipt.previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={receipt.previewUrl} alt="Comprobante de pago" className="h-24 w-20 shrink-0 rounded-md border border-slate-200 object-cover" />
              )}
              <div className="min-w-0 flex-1 space-y-1.5 text-xs">
                {reading && <p className="inline-flex items-center gap-1.5 text-slate-600"><Loader2 className="h-3.5 w-3.5 animate-spin" />Leyendo el comprobante…</p>}
                {ocr && !reading && (
                  <p className={cn('inline-flex items-center gap-1.5', ocr.confidence >= 0.7 ? 'text-emerald-700' : 'text-amber-700')}>
                    <Sparkles className="h-3.5 w-3.5" />
                    Datos leídos de la captura{ocr.confidence < 0.7 ? ' (baja confianza)' : ''}: revísalos antes de guardar.
                    {ocr.date && ` Fecha del pago: ${ocr.date.split('-').reverse().join('/')}.`}
                  </p>
                )}
                {ocrError && <p className="text-amber-700">{ocrError}</p>}
                <label className="flex items-center gap-2 text-slate-700">
                  <input type="checkbox" className="h-4 w-4 accent-amber-600" checked={receipt.save} onChange={(e) => onReceiptChange({ ...receipt, save: e.target.checked })} />
                  Guardar la foto del comprobante
                </label>
                <div className="flex gap-3">
                  <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1 text-amber-700 hover:underline"><ScanText className="h-3.5 w-3.5" />Cambiar</button>
                  <button type="button" onClick={removeImage} className="inline-flex items-center gap-1 text-slate-500 hover:underline"><Trash2 className="h-3.5 w-3.5" />Quitar</button>
                </div>
              </div>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }}
          />
        </div>
      )}

      {(fields.reference || fields.bank || fields.phone || fields.payer) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.reference && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">
                {fields.reference}{['PAGO_MOVIL', 'TRANSFER'].includes(value.paymentMethod) && <span className="text-red-500"> *</span>}
              </span>
              <input
                value={value.paymentReference}
                onChange={(e) => set({ paymentReference: e.target.value })}
                inputMode={value.paymentMethod === 'PAGO_MOVIL' ? 'numeric' : 'text'}
                maxLength={40}
                className={`${inputClass} font-mono`}
                placeholder={value.paymentMethod === 'PAGO_MOVIL' ? 'Ej. 004512345678' : ''}
              />
            </label>
          )}
          {fields.bank && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Banco emisor</span>
              <input list="ve-banks" value={value.paymentBank} onChange={(e) => set({ paymentBank: e.target.value })} maxLength={60} className={inputClass} />
              <datalist id="ve-banks">{VE_BANKS.map((b) => <option key={b} value={b} />)}</datalist>
            </label>
          )}
          {fields.phone && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Teléfono del pagador</span>
              <input value={value.payerPhone} onChange={(e) => set({ payerPhone: e.target.value })} inputMode="tel" maxLength={20} className={inputClass} placeholder="0414-1234567" />
            </label>
          )}
          {fields.payer && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Titular / quien paga</span>
              <input value={value.payerName} onChange={(e) => set({ payerName: e.target.value })} maxLength={100} className={inputClass} />
            </label>
          )}
        </div>
      )}
    </fieldset>
  );
}
