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
import UserMenu from '@/components/UserMenu';
import AppFooter from '@/components/AppFooter';
import AppBreadcrumbs from '@/components/AppBreadcrumbs';
import OfflineProvider from '@/components/offline/OfflineProvider';
import SyncIndicator from '@/components/offline/SyncIndicator';
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
        className="sr-only z-50 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:px-4 focus:py-2 focus:shadow-lg"
      >
        {t('common.skipToContent')}
      </a>
      <SidebarNav />
      <SidebarInset className="min-w-0 bg-background">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-card px-3 sm:gap-3 sm:px-4 md:px-8">
          <SidebarTrigger aria-label={t('header.toggleSidebar')} title={t('header.toggleSidebar')} />
          <GlobalSearch />
          <div className="ml-auto flex items-center gap-1">
            <SyncIndicator />
            <RoleSwitcher />
            <LanguageSwitcher />
            <ThemeToggle />
            <NotificationsMenu />
            <UserMenu />
          </div>
        </header>
        <AppBreadcrumbs />
        {/* Las pantallas leen ?q= / ?id= del buscador global (useSearchParams). */}
        <div id="main-content" tabIndex={-1} className="min-w-0 flex-1">
          <Suspense fallback={null}>{children}</Suspense>
        </div>
        <AppFooter />
      </SidebarInset>
      <HelpAssistant />
      <SessionTimeout />
      <OfflineProvider />
    </SidebarProvider>
  );
}