'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, CreditCard, Clock, Dumbbell, Activity, Gift, Trophy, Share2, User } from 'lucide-react';
import Flame from '@/components/Flame';
import ThemeToggle from '@/components/ThemeToggle';
import BadgeUnlockNotifier from '@/components/BadgeUnlockNotifier';
import { getSession } from '@/lib/auth';
import UserMenu from '@/components/UserMenu';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import SessionTimeout from '@/components/SessionTimeout';
import HelpAssistant from '@/components/HelpAssistant';
import RoleSwitcher from '@/components/RoleSwitcher';
import OfflineProvider from '@/components/offline/OfflineProvider';
import SyncIndicator from '@/components/offline/SyncIndicator';
import { useT } from '@/components/I18nProvider';

const NAV = [
  { href: '/portal', key: 'home', icon: LayoutDashboard },
  { href: '/portal/membership', key: 'membership', icon: CreditCard },
  { href: '/portal/attendance', key: 'attendance', icon: Clock },
  { href: '/portal/routine', key: 'routine', icon: Dumbbell },
  { href: '/portal/progress', key: 'progress', icon: Activity },
  { href: '/portal/challenges', key: 'challenges', icon: Trophy },
  { href: '/portal/rewards', key: 'rewards', icon: Gift },
  { href: '/portal/referrals', key: 'referrals', icon: Share2 },
  { href: '/portal/profile', key: 'profile', icon: User },
] as const;

function isNavItemActive(pathname: string, href: string) {
  return href === '/portal' ? pathname === '/portal' : pathname.startsWith(href);
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const mobileNavRef = useRef<HTMLElement>(null);

  // En móvil el menú se desplaza de lado: deja visible la sección actual.
  useEffect(() => {
    mobileNavRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [pathname, ready]);

  useEffect(() => {
    if (!getSession()) {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:px-4 focus:py-2 focus:shadow-lg"
      >
        {t('common.skipToContent')}
      </a>
      <header className="sticky top-0 z-30 border-b border-border bg-card">
        <div className="flex h-16 items-center gap-4 px-4 md:px-8">
          <Link href="/portal" className="flex shrink-0 items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm shadow-primary/25">
              <Flame size={9} color="#fff" />
            </div>
            <span className="text-lg font-bold text-foreground">
              Fragua<span className="text-primary">Go</span>
            </span>
          </Link>

          <nav aria-label={t('portalNav.label')} className="ml-4 hidden flex-1 items-center gap-1 md:flex">
            {NAV.map((item) => {
              const ItemIcon = item.icon;
              const active = isNavItemActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <ItemIcon className="h-4 w-4" />
                  {t(`portalNav.${item.key}`)}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <SyncIndicator />
            <RoleSwitcher />
            <LanguageSwitcher />
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>

        {/* Nav horizontal en móvil (debajo del header) */}
        <nav ref={mobileNavRef} aria-label={t('portalNav.label')} className="fraguago-scrollbar flex items-center gap-1 overflow-x-auto border-t border-border px-4 py-2 md:hidden">
          {NAV.map((item) => {
            const ItemIcon = item.icon;
            const active = isNavItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <ItemIcon className="h-4 w-4" />
                {t(`portalNav.${item.key}`)}
              </Link>
            );
          })}
        </nav>
      </header>

      <main id="main-content" tabIndex={-1}>{children}</main>

      <BadgeUnlockNotifier />
      <HelpAssistant />
      <SessionTimeout />
      <OfflineProvider />
    </div>
  );
}
