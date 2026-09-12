'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import SidebarNav from '@/components/Sidebar';
import { getSession } from '@/lib/auth';
import ThemeToggle from '@/components/ThemeToggle';
import { Bell, Search } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getSession()) {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) return null;

  return (
    <SidebarProvider>
      <SidebarNav />
      <SidebarInset className="bg-background">
        <header className="flex h-16 items-center gap-3 border-b border-border bg-card px-4 md:px-8">
          <SidebarTrigger />
          <div className="hidden h-9 max-w-sm flex-1 items-center gap-2 rounded-lg bg-muted px-3 text-sm text-muted-foreground md:flex">
            <Search className="h-4 w-4" />
            <span>Buscar en FraguaGo...</span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <button type="button" aria-label="Ver notificaciones" className="relative rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-card" />
            </button>
            <div className="ml-2 flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">FG</div>
          </div>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}