'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useT } from '@/components/I18nProvider';
import type { Translate } from '@/lib/i18n/translate';
import { NAV } from '@/lib/navigation';
import { cn } from '@/lib/utils';

// href: migaja enlazable. secondary: se oculta en pantallas pequeñas.
type Crumb = { label: string; href?: string; secondary?: boolean };

// Secciones del portal del socio (/portal/<sección>); textos en portalNav.
const PORTAL_SECTIONS = ['membership', 'attendance', 'routine', 'progress', 'challenges', 'rewards', 'referrals', 'profile'] as const;

// Panel: Inicio › Grupo › Pantalla (› Detalle). Sale del mismo menú que la
// barra lateral (lib/navigation.ts), así una pantalla nueva aparece sola.
function dashboardTrail(pathname: string, t: Translate): Crumb[] {
  for (const group of NAV) {
    const item = group.items.find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
    if (!item) continue;
    const deeper = pathname !== item.href;
    return [
      ...(item.href === '/dashboard' ? [] : [{ label: t('breadcrumbs.home'), href: '/dashboard' }]),
      { label: t(`nav.groups.${group.group}`), secondary: true },
      { label: t(`nav.items.${item.key}`), href: deeper ? item.href : undefined },
      ...(deeper ? [{ label: t('breadcrumbs.detail') }] : []),
    ];
  }
  return [];
}

// Portal: Inicio › Sección (› Detalle).
function portalTrail(pathname: string, t: Translate): Crumb[] {
  const [, , section, ...rest] = pathname.split('/');
  const key = PORTAL_SECTIONS.find((s) => s === section);
  if (!key) return [{ label: t('portalNav.home') }];
  const deeper = rest.length > 0;
  return [
    { label: t('portalNav.home'), href: '/portal' },
    { label: t(`portalNav.${key}`), href: deeper ? `/portal/${key}` : undefined },
    ...(deeper ? [{ label: t('breadcrumbs.detail') }] : []),
  ];
}

// Migas de pan del panel y del portal: dónde está el usuario y cómo volver.
// La última migaja es la pantalla actual (no es enlace).
export default function AppBreadcrumbs({ className }: { className?: string }) {
  const t = useT();
  const pathname = usePathname();
  const trail = pathname === '/portal' || pathname.startsWith('/portal/') ? portalTrail(pathname, t) : dashboardTrail(pathname, t);
  if (trail.length === 0) return null;

  return (
    <Breadcrumb aria-label={t('breadcrumbs.label')} className={cn('border-b border-border px-4 py-2 md:px-8', className)}>
      <BreadcrumbList>
        {trail.map((crumb, index) => {
          const last = index === trail.length - 1;
          const hidden = crumb.secondary ? 'hidden sm:inline-flex' : undefined;
          return (
            <Fragment key={`${crumb.label}-${index}`}>
              <BreadcrumbItem className={hidden}>
                {last ? (
                  <BreadcrumbPage className="font-medium">{crumb.label}</BreadcrumbPage>
                ) : crumb.href ? (
                  <BreadcrumbLink render={<Link href={crumb.href} />} className="inline-flex items-center gap-1.5">
                    {index === 0 && <Home className="h-3.5 w-3.5" aria-hidden="true" />}
                    {crumb.label}
                  </BreadcrumbLink>
                ) : (
                  crumb.label
                )}
              </BreadcrumbItem>
              {!last && <BreadcrumbSeparator className={hidden} />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
