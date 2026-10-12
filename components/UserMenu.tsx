'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Loader2, LogOut, MonitorSmartphone, Settings, ShieldCheck, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useT } from '@/components/I18nProvider';
import { toast } from '@/components/ui/toast';
import { useMe } from '@/hooks/useMe';
import { readTokenPayload } from '@/lib/api';
import { getToken, logout, logoutAll } from '@/lib/auth';
import { ROLE_META, isRoleKey } from '@/lib/roles';

function getInitials(name: string, email?: string) {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length > 1) return (words[0][0] + words[1][0]).toUpperCase();
  return (words[0] ?? email ?? 'FG').slice(0, 2).toUpperCase();
}

// Menú de la cuenta en el header: quién está conectado, accesos según su rol y
// cierre de sesión. El correo y el rol salen del access token.
export default function UserMenu() {
  const t = useT();
  const [account] = useState(() => {
    const token = getToken();
    return token ? readTokenPayload(token) : {};
  });
  const me = useMe();
  const [busy, setBusy] = useState<'logout' | 'logoutAll' | null>(null);

  const role = account.role?.toUpperCase();
  const isMember = role === 'MEMBER';
  const canManageUsers = role === 'OWNER' || role === 'ADMIN';
  const canSeeSettings = canManageUsers || role === 'STAFF';
  // Sin nombre (aún cargando o perfil vacío) se muestra el correo.
  const name = [me?.firstName, me?.lastName].filter(Boolean).join(' ');

  async function handleLogout() {
    if (busy) return;
    setBusy('logout');
    try {
      await logout();
    } catch {
      setBusy(null);
    }
  }

  async function handleLogoutAll() {
    if (busy) return;
    setBusy('logoutAll');
    try {
      await logoutAll();
    } catch (e) {
      setBusy(null);
      toast.add({ title: t('header.logoutAllFailed'), description: e instanceof Error ? e.message : undefined, type: 'error' });
    }
  }

  const roleMeta = role && isRoleKey(role) ? ROLE_META[role] : null;
  const RoleIcon = roleMeta?.icon;
  const initials = getInitials(name, account.email);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('header.account')}
        title={t('header.account')}
        className="ml-2 flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary transition hover:bg-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 data-popup-open:bg-primary/25"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : initials}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-64">
        <div className="flex items-center gap-3 px-1.5 py-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
            {initials}
          </div>
          <div className="min-w-0">
            {name && <p className="truncate text-sm font-semibold text-foreground">{name}</p>}
            {account.email && (
              <p className={name ? 'truncate text-xs text-muted-foreground' : 'truncate text-sm font-semibold text-foreground'}>
                {account.email}
              </p>
            )}
            {roleMeta && RoleIcon && (
              <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                <RoleIcon className="h-3 w-3" />
                {t(roleMeta.name)}
              </p>
            )}
          </div>
        </div>
        {(isMember || canSeeSettings) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {isMember && (
                <DropdownMenuItem render={<Link href="/portal/profile" />}>
                  <User className="text-muted-foreground" />
                  {t('header.myProfile')}
                </DropdownMenuItem>
              )}
              {canManageUsers && (
                <DropdownMenuItem render={<Link href="/users" />}>
                  <ShieldCheck className="text-muted-foreground" />
                  {t('header.usersAndRoles')}
                </DropdownMenuItem>
              )}
              {canSeeSettings && (
                <DropdownMenuItem render={<Link href="/settings" />}>
                  <Settings className="text-muted-foreground" />
                  {t('header.gymSettings')}
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleLogoutAll} disabled={Boolean(busy)}>
            <MonitorSmartphone className="text-muted-foreground" />
            {t('header.logoutAll')}
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={handleLogout} disabled={Boolean(busy)}>
            <LogOut />
            {busy === 'logout' ? t('common.loggingOut') : t('common.logout')}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
