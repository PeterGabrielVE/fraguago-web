'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useT } from '@/components/I18nProvider';
import { cn } from '@/lib/utils';

// Campo de contraseña con botón (ojito) para mostrar/ocultar lo escrito.
// Acepta las mismas props que <Input>, salvo type.
export default function PasswordInput({ className, ...props }: Omit<React.ComponentProps<'input'>, 'type'>) {
  const t = useT();
  const [visible, setVisible] = useState(false);
  const label = visible ? t('common.hidePassword') : t('common.showPassword');

  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} className={cn(className, 'pr-10')} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        disabled={props.disabled}
        aria-label={label}
        aria-pressed={visible}
        title={label}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-slate-400 transition-colors hover:text-slate-600 disabled:pointer-events-none"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
