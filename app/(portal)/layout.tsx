'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, CreditCard, Clock, Dumbbell, Activity, Gift, Trophy, Share2, User, LogOut, Loader2 } from 'lucide-react';
import Flame from '@/components/Flame';
import ThemeToggle from '@/components/ThemeToggle';
import BadgeUnlockNotifier from '@/components/BadgeUnlockNotifier';
import { getSession, logout } from '@/lib/auth';
import LanguageSwitcher from '@/components/LanguageSwitcher';
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
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!getSession()) {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [router]);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      setLoggingOut(false);
    }
  }

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-background">
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

          <nav className="ml-4 hidden flex-1 items-center gap-1 md:flex">
            {NAV.map((item) => {
              const ItemIcon = item.icon;
              const active = isNavItemActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
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
            <LanguageSwitcher />
            <ThemeToggle />
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-60"
            >
              {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              <span className="hidden sm:inline">{loggingOut ? t('common.loggingOut') : t('common.logout')}</span>
            </button>
          </div>
        </div>

        {/* Nav horizontal en móvil (debajo del header) */}
        <nav className="fraguago-scrollbar flex items-center gap-1 overflow-x-auto border-t border-border px-4 py-2 md:hidden">
          {NAV.map((item) => {
            const ItemIcon = item.icon;
            const active = isNavItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
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

      <main>{children}</main>

      <BadgeUnlockNotifier />
    </div>
  );
}
