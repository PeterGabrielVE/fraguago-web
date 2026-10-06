'use client';

import { ExternalLink, Link2 } from 'lucide-react';
import { toast } from '@/components/ui/toast';
import { useT } from '@/components/I18nProvider';
import { usePublicGymRef } from '@/hooks/usePublicGymRef';

// Copia el enlace público del formulario de inscripción (/registro/<slug>)
// para enviarlo a los socios por WhatsApp, correo, etc. El slug se edita en
// Configuración.
export default function SignupLinkButton() {
  const t = useT();
  const gymRef = usePublicGymRef();
  const url = gymRef ? `${window.location.origin}/registro/${gymRef}` : undefined;

  if (!url) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url!);
      toast.add({ title: t('members.signupLink.copied'), description: t('members.signupLink.copiedHint'), type: 'success' });
    } catch {
      toast.add({ title: t('members.signupLink.copyFailed'), description: url, type: 'error' });
    }
  }

  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700">
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-2 px-4 py-2 transition-colors hover:text-amber-700"
      >
        <Link2 className="h-4 w-4" />
        {t('members.signupLink.button')}
      </button>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={t('members.signupLink.open')}
        aria-label={t('members.signupLink.open')}
        className="inline-flex items-center border-l border-slate-200 px-3 transition-colors hover:text-amber-700"
      >
        <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  );
}
