'use client';
import { useEffect, useState } from 'react';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useT } from '@/components/I18nProvider';
import { toast } from '@/components/ui/toast';
import { getMyRoles, getRole, getRoleRedirect, switchRole } from '@/lib/auth';
import { ROLE_META, isRoleKey, type RoleKey } from '@/lib/roles';
import { cn } from '@/lib/utils';

// Cambia el rol de la sesión sin cerrarla. Solo aparece si el usuario tiene
// más de un rol; los roles se piden al API porque pueden haber cambiado
// desde que inició sesión.
export default function RoleSwitcher({ className }: { className?: string }) {
  const t = useT();
  const [roles, setRoles] = useState<RoleKey[]>([]);
  const [active, setActive] = useState<string | undefined>(() => getRole()?.toUpperCase());
  const [switching, setSwitching] = useState<RoleKey | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMyRoles()
      .then((data) => {
        if (cancelled) return;
        setRoles(data.roles.filter(isRoleKey));
        setActive(data.active?.toUpperCase());
      })
      .catch(() => { /* sin selector si falla: no bloquea el resto del header */ });
    return () => { cancelled = true; };
  }, []);

  if (roles.length < 2) return null;

  async function choose(role: RoleKey) {
    if (role === active || switching) return;
    setSwitching(role);
    try {
      const session = await switchRole(role);
      // Recarga completa: cada rol tiene su propio layout (panel o portal),
      // menú y datos en caché.
      window.location.href = getRoleRedirect(session);
    } catch (e) {
      setSwitching(null);
      toast.add({ title: t('session.switchRoleFailed'), description: e instanceof Error ? e.message : undefined, type: 'error' });
    }
  }

  const current = active && isRoleKey(active) ? ROLE_META[active] : null;
  const CurrentIcon = current?.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('session.switchRole')}
        title={t('session.switchRole')}
        disabled={Boolean(switching)}
        className={cn(
          'inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 data-popup-open:bg-muted disabled:opacity-60',
          className,
        )}
      >
        {switching
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : CurrentIcon && <CurrentIcon className="h-4 w-4" />}
        <span className="hidden sm:inline">{current ? t(current.name) : t('session.switchRole')}</span>
        <ChevronDown className="h-3.5 w-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t('session.enterAs')}</DropdownMenuLabel>
          {roles.map((role) => {
            const { icon: RoleIcon, name } = ROLE_META[role];
            return (
              <DropdownMenuItem key={role} onClick={() => choose(role)} className="justify-between gap-4">
                <span className="flex items-center gap-2">
                  <RoleIcon className="h-4 w-4 text-muted-foreground" />
                  {t(name)}
                </span>
                {role === active && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
