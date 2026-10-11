'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import SidebarNav from '@/components/Sidebar';
import { getSession } from '@/lib/auth';
import ThemeToggle from '@/components/ThemeToggle';
import GlobalSearch from '@/components/GlobalSearch';
import NotificationsMenu from '@/components/NotificationsMenu';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import SessionTimeout from '@/components/SessionTimeout';
import HelpAssistant from '@/components/HelpAssistant';
import RoleSwitcher from '@/components/RoleSwitcher';
import { useT } from '@/components/I18nProvider';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const t = useT();
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
      <a
        href="#main-content"
        className="sr-only z-50 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {t('common.skipToContent')}
      </a>
      <SidebarNav />
      <SidebarInset className="min-w-0 bg-background">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-card px-3 sm:gap-3 sm:px-4 md:px-8">
          <SidebarTrigger aria-label={t('header.toggleSidebar')} title={t('header.toggleSidebar')} />
          <GlobalSearch />
          <div className="ml-auto flex items-center gap-1">
            <RoleSwitcher />
            <LanguageSwitcher />
            <ThemeToggle />
            <NotificationsMenu />
            <div className="ml-2 hidden h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary sm:flex" aria-hidden="true">FG</div>
          </div>
        </header>
        {/* Las pantallas leen ?q= / ?id= del buscador global (useSearchParams). */}
        <div id="main-content" tabIndex={-1} className="min-w-0 flex-1">
          <Suspense fallback={null}>{children}</Suspense>
        </div>
      </SidebarInset>
      <HelpAssistant />
      <SessionTimeout />
    </SidebarProvider>
  );
}