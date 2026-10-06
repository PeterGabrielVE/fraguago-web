'use client';

import { CircleHelp } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useT } from '@/components/I18nProvider';

// Ícono de ayuda junto a la etiqueta de un campo. Es un Popover y no un
// Tooltip: el Tooltip no se abre al tocar en pantallas táctiles, y estos
// formularios se llenan sobre todo desde el celular. En escritorio se abre
// también al pasar el mouse.
export default function InfoTip({ text }: { text: string }) {
  const t = useT();
  return (
    <Popover>
      <PopoverTrigger
        type="button"
        openOnHover
        delay={150}
        aria-label={t('common.moreInfo')}
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:text-amber-600 focus-visible:text-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
      >
        <CircleHelp className="h-4 w-4" />
      </PopoverTrigger>
      <PopoverContent side="top" className="w-auto max-w-[16rem] bg-slate-900 px-3 py-2 text-xs leading-5 text-white ring-0">
        {text}
      </PopoverContent>
    </Popover>
  );
}
