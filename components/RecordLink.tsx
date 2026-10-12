'use client';
import type { ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';
import { useT } from '@/components/I18nProvider';
import { links } from '@/lib/links';
import { cn } from '@/lib/utils';

// Enlace a un registro de otro módulo. Abre en una pestaña nueva para no
// perder lo que se estaba viendo (filtros, formulario a medias, ficha abierta).
export function RecordLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  const t = useT();
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={t('common.openInNewTab')}
      // Las filas de las tablas abren su propia ficha al hacer clic.
      onClick={(event) => event.stopPropagation()}
      className={cn(
        'group/link inline-flex max-w-full items-center gap-1 rounded-sm underline-offset-2 hover:text-amber-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400',
        className,
      )}
    >
      {children}
      <ExternalLink className="h-3 w-3 shrink-0 text-slate-400 group-hover/link:text-amber-600" aria-hidden="true" />
    </a>
  );
}

// Nombre de un socio enlazado a su ficha. Sin id (o sin nombre) se muestra el texto solo.
// El nombre va como children: el buscador de las tablas lee el texto de las celdas de ahí.
export function MemberLink({ id, children: name, fallback = '—', className }: { id?: string | null; children?: string | null; fallback?: ReactNode; className?: string }) {
  if (!id || !name) return <>{name || fallback}</>;
  return <RecordLink href={links.member(id, name)} className={className}>{name}</RecordLink>;
}
