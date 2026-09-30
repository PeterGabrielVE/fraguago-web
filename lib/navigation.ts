import type { ComponentType } from 'react';
import type { Messages } from '@/lib/i18n/messages/es';
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
  MessageSquareText,
  UserX,
  Inbox,
  Share2,
  Upload,
  ListChecks,
} from 'lucide-react';

export type NavItemKey = keyof Messages['nav']['items'];
export type NavGroupKey = keyof Messages['nav']['groups'];

// Textos en lib/i18n/messages: nav.items.<key> (etiqueta), nav.keywords.<key> (sinónimos
// para el buscador global) y nav.groups.<group>.
export type NavItem = {
  href: string;
  key: NavItemKey;
  icon: ComponentType<{ className?: string }>;
};

export type NavGroup = { group: NavGroupKey; items: NavItem[] };

// Menú del panel: lo usan la barra lateral y el buscador global.
export const NAV: NavGroup[] = [
  {
    group: 'general',
    items: [
      { href: '/dashboard', key: 'dashboard', icon: LayoutDashboard },
      { href: '/members', key: 'members', icon: Users },
      { href: '/attendance', key: 'attendance', icon: Clock },
    ],
  },
  {
    group: 'medical',
    items: [
      { href: '/health', key: 'health', icon: Stethoscope },
      { href: '/progress', key: 'progress', icon: Activity },
      { href: '/emergency-contacts', key: 'emergencyContacts', icon: Phone },
    ],
  },
  {
    group: 'memberships',
    items: [
      { href: '/memberships', key: 'memberships', icon: CreditCard },
      { href: '/membership-plans', key: 'membershipPlans', icon: Tag },
      { href: '/training-goals', key: 'trainingGoals', icon: Zap },
    ],
  },
  {
    group: 'payments',
    items: [
      { href: '/payment-records', key: 'paymentRecords', icon: DollarSign },
      { href: '/finances', key: 'finances', icon: BarChart3 },
      { href: '/exchange-rates', key: 'exchangeRates', icon: Coins },
    ],
  },
  {
    group: 'operations',
    items: [
      { href: '/sales', key: 'sales', icon: ShoppingCart },
      { href: '/concepts', key: 'concepts', icon: Tag },
      { href: '/products', key: 'products', icon: Box },
      { href: '/services', key: 'services', icon: Wrench },
    ],
  },
  {
    group: 'community',
    items: [
      { href: '/challenges', key: 'challenges', icon: Trophy },
    ],
  },
  {
    group: 'retention',
    items: [
      { href: '/automations', key: 'automations', icon: MessageSquareText },
      { href: '/inactive-members', key: 'inactiveMembers', icon: UserX },
      { href: '/message-logs', key: 'messageLogs', icon: Inbox },
      { href: '/referrals', key: 'referrals', icon: Share2 },
    ],
  },
  {
    group: 'gamification',
    items: [
      { href: '/rewards', key: 'rewards', icon: Gift },
      { href: '/redemptions', key: 'redemptions', icon: Ticket },
      { href: '/badges', key: 'badges', icon: Award },
      { href: '/tiers', key: 'tiers', icon: Crown },
    ],
  },
  {
    group: 'team',
    items: [
      { href: '/trainers', key: 'trainers', icon: User },
      { href: '/routines', key: 'routines', icon: Dumbbell },
      { href: '/exercises', key: 'exercises', icon: ListChecks },
      { href: '/schedules', key: 'schedules', icon: Calendar },
    ],
  },
  {
    group: 'admin',
    items: [
      { href: '/users', key: 'users', icon: ShieldCheck },
      { href: '/import', key: 'import', icon: Upload },
      { href: '/settings', key: 'settings', icon: Settings },
      { href: '/audit-logs', key: 'auditLogs', icon: ScrollText },
    ],
  },
];
