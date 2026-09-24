'use client';
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import PaymentFields, { type ReceiptState } from '@/components/PaymentFields';
import { api } from '@/lib/api';
import { emptyPayment, paymentPayload, uploadReceipt, validatePayment, type PaymentValue } from '@/lib/payments';

export type PlanOption = { value: string; label: string; price: number; currency: string };
export type MemberOption = { value: string; label: string };

type Props = {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  plans: PlanOption[];
  members: MemberOption[];
  // Renovar: membresía existente (el socio no cambia; el plan sí puede).
  renew?: { id: string; memberName: string; planId: string } | null;
};

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200';

function nowLocal() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Asignar o renovar una membresía registrando CÓMO se pagó: método,
// referencia (pago móvil, transferencia, Zelle…), foto del comprobante con
// lectura automática y, si aplica, el monto real en otra moneda.
export default function MembershipPaymentDialog({ open, onClose, onDone, plans, members, renew }: Props) {
  const [memberId, setMemberId] = useState('');
  const [planId, setPlanId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [payment, setPayment] = useState<PaymentValue>(emptyPayment());
  const [receipt, setReceipt] = useState<ReceiptState>({ image: null, previewUrl: null, save: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // Si el guardado falla (p. ej. referencia duplicada) y se reintenta con la
  // misma foto, se reutiliza la ya subida en vez de subirla otra vez.
  const [uploaded, setUploaded] = useState<{ image: Blob; id: string } | null>(null);

  const plan = useMemo(() => plans.find((p) => p.value === planId), [plans, planId]);

  useEffect(() => {
    if (!open) return;
    setMemberId('');
    setPlanId(renew?.planId ?? '');
    setStartDate(renew ? '' : nowLocal());
    setPayment(emptyPayment());
    setReceipt({ image: null, previewUrl: null, save: true });
    setUploaded(null);
    setError('');
  }, [open, renew]);

  // El monto/moneda sugeridos son los del plan (se pueden cambiar).
  useEffect(() => {
    if (plan) setPayment((p) => ({ ...p, amount: String(plan.price), currency: plan.currency }));
  }, [plan]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!renew && !memberId) return setError('Elige el socio.');
    if (!planId) return setError('Elige el plan.');
    const invalid = validatePayment(payment);
    if (invalid) return setError(invalid);

    setSaving(true);
    try {
      // 1) La foto (opcional) se sube primero y se adjunta al pago por id.
      let receiptId: string | undefined;
      if (receipt.image && receipt.save && payment.paymentMethod !== 'CASH') {
        if (uploaded?.image === receipt.image) receiptId = uploaded.id;
        else {
          receiptId = (await uploadReceipt(receipt.image)).id;
          setUploaded({ image: receipt.image, id: receiptId });
        }
      }
      const body = {
        planId,
        ...(startDate ? { startDate: new Date(startDate).toISOString() } : {}),
        payment: paymentPayload(payment, receiptId),
      };
      // 2) Membresía + ingreso + comprobante en una sola operación del API.
      if (renew) await api.post(`/memberships/${renew.id}/renew`, body);
      else await api.post(`/members/${memberId}/memberships`, body);
      toast.add({ title: renew ? 'Membresía renovada' : 'Membresía asignada', type: 'success' });
      onDone();
    } catch (err: any) {
      // Ej.: referencia ya registrada (409). El diálogo queda abierto para corregir.
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !saving) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{renew ? 'Renovar membresía' : 'Nueva membresía'}</DialogTitle>
            <DialogDescription>
              {renew ? `Socio: ${renew.memberName}. ` : ''}Registra el plan y cómo se pagó.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            {!renew && (
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Socio <span className="text-red-500">*</span></span>
                <select required value={memberId} onChange={(e) => setMemberId(e.target.value)} className={inputClass}>
                  <option value="">Selecciona…</option>
                  {members.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </label>
            )}
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Plan <span className="text-red-500">*</span></span>
              <select required value={planId} onChange={(e) => setPlanId(e.target.value)} className={inputClass}>
                <option value="">Selecciona…</option>
                {plans.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Fecha de inicio</span>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputClass}
              />
              {renew && !startDate && <span className="mt-0.5 block text-xs text-slate-500">Vacío: continúa desde el vencimiento actual.</span>}
            </label>
          </div>

          <PaymentFields value={payment} onChange={setPayment} receipt={receipt} onReceiptChange={setReceipt} />

          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}
            </p>
          )}

          <DialogFooter>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
            >
              {saving ? 'Guardando…' : renew ? 'Renovar' : 'Guardar'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
