'use client';
import { useEffect, useState } from 'react';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { receiptObjectUrl } from '@/lib/payments';

// Botón "ver comprobante": descarga la foto con autenticación y la muestra.
export default function ReceiptButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || url) return;
    receiptObjectUrl(id).then(setUrl).catch((e) => setError(e.message));
  }, [open, id, url]);

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-50"
        aria-label="Ver comprobante"
      >
        <ImageIcon className="h-3.5 w-3.5" /> Ver
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Comprobante de pago</DialogTitle>
            <DialogDescription>Foto guardada al registrar el pago.</DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!url && !error && <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-amber-600" /></div>}
          {url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="Comprobante de pago" className="max-h-[70vh] w-full rounded-lg object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
