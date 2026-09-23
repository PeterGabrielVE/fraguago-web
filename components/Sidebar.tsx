'use client';
import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import {
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
import {
  LayoutDashboard,
  Users,
  Clock,
  Stethoscope,
  Phone,
  CreditCard,
  BarChart3,
  DollarSign,
  Tag,
  Box,
  Wrench,
  User,
  Calendar,
  LogOut,
  Loader2,
  Zap,
  Coins,
  Dumbbell,
  ShoppingCart,
  Activity,
  ShieldCheck,
  Settings,
  ScrollText,
  Gift,
  Ticket,
  Award,
  Crown,
  Trophy,
} from 'lucide-react';
import Flame from './Flame';
import { logout } from '@/lib/auth';

const NAV = [
  {
    group: 'General',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/members', label: 'Socios', icon: Users },
      { href: '/attendance', label: 'Asistencia', icon: Clock },
    ],
  },
  {
    group: 'Datos Médicos',
    items: [
      { href: '/health', label: 'Salud', icon: Stethoscope },
      { href: '/progress', label: 'Progreso', icon: Activity },
      { href: '/emergency-contacts', label: 'Emergencia', icon: Phone },
    ],
  },
  {
    group: 'Membresías',
    items: [
      { href: '/memberships', label: 'Membresías', icon: CreditCard },
      { href: '/membership-plans', label: 'Planes', icon: Tag },
      { href: '/training-goals', label: 'Objetivos', icon: Zap },
    ],
  },
  {
    group: 'Pagos',
    items: [
      { href: '/payment-records', label: 'Pagos', icon: DollarSign },
      { href: '/finances', label: 'Finanzas', icon: BarChart3 },
      { href: '/exchange-rates', label: 'Tasas de cambio', icon: Coins },
    ],
  },
  {
    group: 'Operación',
    items: [
      { href: '/sales', label: 'Ventas', icon: ShoppingCart },
      { href: '/concepts', label: 'Conceptos', icon: Tag },
      { href: '/products', label: 'Productos', icon: Box },
      { href: '/services', label: 'Servicios', icon: Wrench },
    ],
  },
  {
    group: 'Comunidad',
    items: [
      { href: '/challenges', label: 'Retos', icon: Trophy },
    ],
  },
  {
    group: 'Gamificación',
    items: [
      { href: '/rewards', label: 'Recompensas', icon: Gift },
      { href: '/redemptions', label: 'Canjes', icon: Ticket },
      { href: '/badges', label: 'Insignias', icon: Award },
      { href: '/tiers', label: 'Niveles', icon: Crown },
    ],
  },
  {
    group: 'Equipo',
    items: [
      { href: '/trainers', label: 'Entrenadores', icon: User },
      { href: '/routines', label: 'Rutinas', icon: Dumbbell },
      { href: '/schedules', label: 'Horarios', icon: Calendar },
    ],
  },
  {
    group: 'Administración',
    items: [
      { href: '/users', label: 'Usuarios', icon: ShieldCheck },
      { href: '/settings', label: 'Configuración', icon: Settings },
      { href: '/audit-logs', label: 'Auditoría', icon: ScrollText },
    ],
  },
];

export default function SidebarNav() {
  const path = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

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
                  const isActive = path.startsWith(item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={<Link href={item.href} />}
                          className={`rounded-lg transition-all ${
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