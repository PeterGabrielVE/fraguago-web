'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  useSidebar,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2 } from 'lucide-react';
import Flame from './Flame';
import { logout } from '@/lib/auth';
import { NAV } from '@/lib/navigation';

export default function SidebarNav() {
  const path = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const [loggingOut, setLoggingOut] = useState(false);
  // Ruta clickeada aún en navegación: se marca activa de inmediato para dar feedback.
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [path]);

  const currentPath = pendingHref ?? path;

  function handleNavigate(event: React.MouseEvent, href: string) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    if (href !== path) setPendingHref(href);
    if (isMobile) setOpenMobile(false);
  }

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      setLoggingOut(false);
    }
  }

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="border-b border-sidebar-border p-5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-sm shadow-primary/25">
            <Flame size={10} color="#fff" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">
              Fragua<span className="text-primary">Go</span>
            </h1>
            <p className="text-xs text-slate-300">v0.1.0</p>
          </div>
        </Link>
      </div>

      {/* Content */}
      <SidebarContent className="fraguago-scrollbar px-0">
        {NAV.map((group) => {
          const Icon = group.items[0]?.icon;
          return (
            <SidebarGroup key={group.group}>
              <SidebarGroupLabel className="px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {group.group}
              </SidebarGroupLabel>
              <SidebarMenu className="px-2">
                {group.items.map((item) => {
                  const ItemIcon = item.icon;
                  const isActive = currentPath === item.href || currentPath.startsWith(`${item.href}/`);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={<Link href={item.href} onClick={(event) => handleNavigate(event, item.href)} />}
                        className={`rounded-lg transition-colors ${
                          isActive
                            ? 'bg-primary font-semibold text-primary-foreground shadow-sm shadow-primary/20'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground'
                        }`}
                      >
                        <>
                          <ItemIcon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <Button
          onClick={handleLogout}
          disabled={loggingOut}
          variant="outline"
          className="w-full justify-start text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          {loggingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
          {loggingOut ? 'Saliendo...' : 'Cerrar sesión'}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}