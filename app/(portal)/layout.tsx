'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, CreditCard, Clock, Dumbbell, Activity, Gift, Trophy, User, LogOut, Loader2 } from 'lucide-react';
import Flame from '@/components/Flame';
import ThemeToggle from '@/components/ThemeToggle';
import BadgeUnlockNotifier from '@/components/BadgeUnlockNotifier';
import { getSession, logout } from '@/lib/auth';

const NAV = [
  { href: '/portal', label: 'Inicio', icon: LayoutDashboard },
  { href: '/portal/membership', label: 'Membresía', icon: CreditCard },
  { href: '/portal/attendance', label: 'Asistencias', icon: Clock },
  { href: '/portal/routine', label: 'Rutina', icon: Dumbbell },
  { href: '/portal/progress', label: 'Progreso', icon: Activity },
  { href: '/portal/challenges', label: 'Retos', icon: Trophy },
  { href: '/portal/rewards', label: 'Recompensas', icon: Gift },
  { href: '/portal/profile', label: 'Mi perfil', icon: User },
];

function isNavItemActive(pathname: string, href: string) {
  return href === '/portal' ? pathname === '/portal' : pathname.startsWith(href);
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
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
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-60"
            >
              {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              <span className="hidden sm:inline">{loggingOut ? 'Saliendo...' : 'Cerrar sesión'}</span>
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
                {item.label}
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
