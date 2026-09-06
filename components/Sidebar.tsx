'use client';
import Link from 'next/link';
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
  Pill,
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
  Zap,
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
      { href: '/medications', label: 'Medicamentos', icon: Pill },
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
    ],
  },
  {
    group: 'Operación',
    items: [
      { href: '/concepts', label: 'Conceptos', icon: Tag },
      { href: '/products', label: 'Productos', icon: Box },
      { href: '/services', label: 'Servicios', icon: Wrench },
    ],
  },
  {
    group: 'Equipo',
    items: [
      { href: '/trainers', label: 'Entrenadores', icon: User },
      { href: '/schedules', label: 'Horarios', icon: Calendar },
    ],
  },
];

export default function SidebarNav() {
  const path = usePathname();

  return (
    <Sidebar className="border-r border-slate-200 bg-white">
      {/* Header */}
      <div className="border-b border-slate-200 p-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600">
            <Flame size={10} color="#fff" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Fragua<span className="text-amber-600">Go</span>
            </h1>
            <p className="text-xs text-slate-500">v0.1.0</p>
          </div>
        </Link>
      </div>

      {/* Content */}
      <SidebarContent className="px-0">
        {NAV.map((group) => {
          const Icon = group.items[0]?.icon;
          return (
            <SidebarGroup key={group.group}>
              <SidebarGroupLabel className="text-xs font-semibold uppercase text-slate-500 px-4">
                {group.group}
              </SidebarGroupLabel>
              <SidebarMenu className="px-2">
                {group.items.map((item) => {
                  const ItemIcon = item.icon;
                  const isActive = path.startsWith(item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        className={`rounded-lg transition-all ${
                          isActive
                            ? 'bg-amber-100 text-amber-900 font-medium'
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <Link href={item.href} className="flex items-center gap-2">
                          <ItemIcon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
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
      <SidebarFooter className="border-t border-slate-200 p-4">
        <Button
          onClick={logout}
          variant="outline"
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar sesión
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}